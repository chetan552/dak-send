import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import cron from "node-cron";
import { prisma } from "./prisma";
import { sendEmail } from "./aws";
import { incrementWarmupSent } from "./warmup";
import { renderEmail, buildUnsubscribeHeaders } from "./email-render";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
});

const getSendRate = async () => {
    try {
        const setting = await prisma.setting.findUnique({ where: { key: "SEND_RATE" } });
        return parseInt(setting?.value || "14", 10);
    } catch {
        return 14;
    }
};

const startWorker = async () => {
    const sendRate = await getSendRate();
    console.log(`Starting worker with max ${sendRate} emails per second.`);

    const worker = new Worker("email-queue", async (job: Job) => {
        // Handle automation drip emails
        if (job.name === "send-automation-email") {
            const {
                subscriberEmail,
                subscriberName,
                subscriberId,
                listId,
                subject,
                html,
                plainText,
                customFields,
                unsubscribeUrl: jobUnsubscribeUrl,
                brandFromEmail,
                brandFromName,
                brandReplyTo,
                brandId,
            } = job.data;

            if (!brandFromEmail) {
                console.error("Automation email skipped: no brand fromEmail configured");
                return;
            }

            const unsubscribeUrl = jobUnsubscribeUrl ||
                `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/unsubscribe?i=${encodeURIComponent(subscriberId || "")}&l=${encodeURIComponent(listId || "")}`;

            const rendered = renderEmail({
                html,
                plainText,
                subject,
                personalization: {
                    name: subscriberName,
                    email: subscriberEmail,
                    customFields: customFields || {},
                },
                unsubscribeUrl,
                // Automations don't have a campaign-level tracking ID
            });

            const { listUnsubscribe, listUnsubscribePost } = buildUnsubscribeHeaders(
                unsubscribeUrl,
                brandFromEmail,
            );

            const toAddress = subscriberName
                ? `"${subscriberName.replace(/"/g, '\\"')}" <${subscriberEmail}>`
                : subscriberEmail;

            await sendEmail({
                FromEmailAddress: `${brandFromName} <${brandFromEmail}>`,
                Destination: { ToAddresses: [toAddress] },
                ReplyToAddresses: brandReplyTo ? [brandReplyTo] : [],
                Content: {
                    Simple: {
                        Subject: { Data: subject },
                        Body: {
                            Html: { Data: rendered.html },
                            Text: { Data: rendered.text },
                        },
                        Headers: [
                            { Name: "List-Unsubscribe",      Value: listUnsubscribe },
                            { Name: "List-Unsubscribe-Post", Value: listUnsubscribePost },
                            { Name: "Precedence",            Value: "bulk" },
                            ...(brandId ? [{ Name: "Feedback-ID", Value: `automation:${brandId}:daksend` }] : []),
                        ],
                    },
                },
            });

            console.log(`Automation email sent to ${subscriberEmail}: "${subject}"`);
            return;
        }

        // Handle regular campaign emails
        const { campaignId, subscriberId, subscriberEmail, subscriberName, listId } = job.data;

        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            include: { brand: true },
        });

        if (!campaign) throw new Error("Campaign not found");
        if (campaign.status !== "sending") {
            console.log(`Skipping job ${job.id} because campaign ${campaignId} status is ${campaign.status}`);
            return;
        }

        const trackingBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const unsubscribeUrl = `${trackingBaseUrl}/api/unsubscribe?i=${encodeURIComponent(subscriberId)}&l=${encodeURIComponent(listId)}`;

        // Fetch custom fields for this subscriber scoped to the list being sent to
        const subscriberCustomFields = await prisma.subscriberFieldValue.findMany({
            where: { subscriber: { email: subscriberEmail, listId } },
            include: { customField: true },
        });

        const customFieldMap: Record<string, string> = {};
        for (const cfv of subscriberCustomFields) {
            customFieldMap[cfv.customField.name] = cfv.value;
        }

        const rendered = renderEmail({
            html: campaign.htmlText,
            plainText: campaign.plainText,
            subject: campaign.subject,
            personalization: {
                name: subscriberName,
                email: subscriberEmail,
                customFields: customFieldMap,
            },
            tracking: {
                campaignId,
                baseUrl: trackingBaseUrl,
            },
            unsubscribeUrl,
        });

        const { listUnsubscribe, listUnsubscribePost } = buildUnsubscribeHeaders(
            unsubscribeUrl,
            campaign.brand.fromEmail || "",
        );

        try {
            const toAddress = subscriberName
                ? `"${subscriberName.replace(/"/g, '\\"')}" <${subscriberEmail}>`
                : subscriberEmail;

            await sendEmail({
                FromEmailAddress: `${campaign.brand.fromName || campaign.brand.name} <${campaign.brand.fromEmail}>`,
                Destination: { ToAddresses: [toAddress] },
                ReplyToAddresses: campaign.brand.replyTo ? [campaign.brand.replyTo] : [],
                Content: {
                    Simple: {
                        Subject: { Data: campaign.subject },
                        Body: {
                            Html: { Data: rendered.html },
                            Text: { Data: rendered.text },
                        },
                        Headers: [
                            { Name: "List-Unsubscribe",      Value: listUnsubscribe },
                            { Name: "List-Unsubscribe-Post", Value: listUnsubscribePost },
                            { Name: "Feedback-ID",           Value: `${campaignId}:${campaign.brandId}:campaign:daksend` },
                            { Name: "Precedence",            Value: "bulk" },
                        ],
                    },
                },
                EmailTags: [{ Name: "campaign_id", Value: campaignId }],
            });

            // Track against warmup daily limit (fire-and-forget, non-fatal)
            incrementWarmupSent(campaign.brandId).catch((e) =>
                console.error("Failed to increment warmup counter:", e),
            );

            // Record successful send
            await prisma.campaignSend.upsert({
                where: {
                    campaignId_subscriberEmail: { campaignId, subscriberEmail },
                },
                update: { status: "sent", sentAt: new Date() },
                create: {
                    campaignId,
                    subscriberEmail,
                    subscriberId,
                    status: "sent",
                    sentAt: new Date(),
                },
            });
        } catch (sendError) {
            // Record failed send
            await prisma.campaignSend.upsert({
                where: {
                    campaignId_subscriberEmail: { campaignId, subscriberEmail },
                },
                update: { status: "failed" },
                create: {
                    campaignId,
                    subscriberEmail,
                    subscriberId,
                    status: "failed",
                },
            });
            throw sendError;
        }
    }, {
        connection,
        concurrency: 50,
        limiter: {
            max: sendRate,
            duration: 1000,
        },
    });

    worker.on("completed", (job) => {
        console.log(`Job ${job.id} has completed!`);
    });

    worker.on("failed", (job, err) => {
        console.error(`Job ${job?.id} has failed with ${err.message}`);
    });

    // Check periodically for campaigns that have finished sending
    setInterval(async () => {
        try {
            const sendingCampaigns = await prisma.campaign.findMany({
                where: { status: "sending" },
            });

            for (const campaign of sendingCampaigns) {
                const totalSends = await prisma.campaignSend.count({
                    where: { campaignId: campaign.id },
                });

                const pendingSends = await prisma.campaignSend.count({
                    where: { campaignId: campaign.id, status: "queued" },
                });

                if (totalSends > 0 && pendingSends === 0) {
                    await prisma.campaign.update({
                        where: { id: campaign.id },
                        data: { status: "sent", sentAt: new Date() },
                    });
                    console.log(`Campaign ${campaign.id} marked as sent!`);
                }
            }
        } catch (err) {
            console.error("Error checking campaign completion:", err);
        }
    }, 5000);

    console.log("Email Worker started.");
};

// ── Internal cron scheduler ────────────────────────────────────────────────
// Reads cron settings from DB and calls the cron HTTP endpoints directly.
// Re-reads settings every 5 minutes so changes made in the Settings UI
// are picked up without restarting the worker.

type CronTaskMap = Record<string, ReturnType<typeof cron.schedule>>;
const activeTasks: CronTaskMap = {};

const CRON_JOBS = [
    { key: "scheduled",   path: "/api/cron/scheduled" },
    { key: "rss",         path: "/api/cron/rss" },
    { key: "automations", path: "/api/cron/automations" },
] as const;

async function callCronEndpoint(path: string) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const secret = process.env.CRON_SECRET || "";
    try {
        const res = await fetch(`${appUrl}${path}?secret=${encodeURIComponent(secret)}`);
        if (!res.ok) {
            const body = await res.text();
            console.error(`[internal-cron] ${path} returned ${res.status}: ${body}`);
        }
    } catch (err) {
        console.error(`[internal-cron] ${path} failed:`, err);
    }
}

async function syncCronSchedules() {
    for (const job of CRON_JOBS) {
        try {
            const [enabledSetting, intervalSetting] = await Promise.all([
                prisma.setting.findUnique({ where: { key: `cron.${job.key}.enabled` } }),
                prisma.setting.findUnique({ where: { key: `cron.${job.key}.interval` } }),
            ]);

            const enabled = enabledSetting?.value === "true";
            const interval = intervalSetting?.value || null;
            const existing = activeTasks[job.key];

            if (!enabled) {
                if (existing) {
                    existing.stop();
                    delete activeTasks[job.key];
                    console.log(`[internal-cron] Stopped: ${job.key}`);
                }
                continue;
            }

            if (!interval || !cron.validate(interval)) {
                console.warn(`[internal-cron] Invalid interval for ${job.key}: "${interval}"`);
                continue;
            }

            // Stop existing task if interval changed
            if (existing) {
                existing.stop();
                delete activeTasks[job.key];
            }

            const path = job.path;
            activeTasks[job.key] = cron.schedule(interval, () => {
                callCronEndpoint(path);
            });
            console.log(`[internal-cron] Scheduled ${job.key} at "${interval}"`);
        } catch (err) {
            console.error(`[internal-cron] Error syncing ${job.key}:`, err);
        }
    }
}

async function startInternalCron() {
    await syncCronSchedules();
    // Re-sync every 5 minutes to pick up settings changes from the UI
    cron.schedule("*/5 * * * *", () => {
        syncCronSchedules().catch(err => console.error("[internal-cron] Sync error:", err));
    });
    console.log("[internal-cron] Scheduler running (re-syncs every 5 min).");
}

startWorker();
startInternalCron();
