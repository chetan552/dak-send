import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
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

            await sendEmail({
                FromEmailAddress: `${brandFromName} <${brandFromEmail}>`,
                Destination: { ToAddresses: [subscriberEmail] },
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
            await sendEmail({
                FromEmailAddress: `${campaign.brand.fromName || campaign.brand.name} <${campaign.brand.fromEmail}>`,
                Destination: { ToAddresses: [subscriberEmail] },
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

startWorker();
