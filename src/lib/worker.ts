import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "./prisma";
import { sendEmail } from "./aws";
import { incrementWarmupSent } from "./warmup";
const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
});

const getSendRate = async () => {
    try {
        const setting = await prisma.setting.findUnique({ where: { key: "SEND_RATE" } });
        return parseInt(setting?.value || "14", 10);
    } catch (e) {
        return 14;
    }
};

const startWorker = async () => {
    const sendRate = await getSendRate();
    console.log(`Starting worker with max ${sendRate} emails per second.`);

    const worker = new Worker("email-queue", async (job: Job) => {
        // Handle automation drip emails
        if (job.name === "send-automation-email") {
            const { subscriberEmail, subject, html, brandFromEmail, brandFromName, brandReplyTo } = job.data;

            if (!brandFromEmail) {
                console.error("Automation email skipped: no brand fromEmail configured");
                return;
            }

            await sendEmail({
                FromEmailAddress: `${brandFromName} <${brandFromEmail}>`,
                Destination: { ToAddresses: [subscriberEmail] },
                ReplyToAddresses: brandReplyTo ? [brandReplyTo] : [],
                Content: {
                    Simple: {
                        Subject: { Data: subject },
                        Body: { Html: { Data: html } },
                    }
                }
            });

            console.log(`Automation email sent to ${subscriberEmail}: "${subject}"`);
            return;
        }

        // Handle regular campaign emails
        const { campaignId, subscriberId, subscriberEmail, subscriberName, listId } = job.data;

        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            include: { brand: true }
        });

        if (!campaign) throw new Error("Campaign not found");
        if (campaign.status !== 'sending') {
            console.log(`Skipping job ${job.id} because campaign ${campaignId} status is ${campaign.status}`);
            return;
        }

        const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/unsubscribe?i=${encodeURIComponent(subscriberId)}&l=${encodeURIComponent(listId)}`;

        // Fetch custom fields for this subscriber scoped to the list being sent to.
        // Querying by email alone would leak values from other lists if the same
        // subscriber has different custom field values across brands.
        const subscriberCustomFields = await prisma.subscriberFieldValue.findMany({
            where: { subscriber: { email: subscriberEmail, listId } },
            include: { customField: true }
        });

        const customFieldMap: Record<string, string> = {};
        for (const cfv of subscriberCustomFields) {
            customFieldMap[cfv.customField.name] = cfv.value;
        }

        // Add tracking pixel for open tracking
        const trackingBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const trackingPixel = `<img src="${trackingBaseUrl}/api/track/open?cid=${campaignId}&email=${encodeURIComponent(subscriberEmail)}" width="1" height="1" style="display:none;" alt="" />`;

        let processedHtml = campaign.htmlText
            .replace(/\[Name\]/gi, subscriberName || "Friend")
            .replace(/\[Email\]/gi, subscriberEmail)
            .replace(/\[UnsubscribeUrl\]/gi, unsubscribeUrl)
            .replace(/\[Unsubscribe\]/gi, `<a href="${unsubscribeUrl}">Unsubscribe</a>`);

        // Replace Custom Fields: e.g. [CustomField:Company]
        processedHtml = processedHtml.replace(/\[CustomField:([^\]]+)\]/gi, (match: string, fieldName: string) => {
            const exactKey = Object.keys(customFieldMap).find(k => k.toLowerCase() === fieldName.toLowerCase());
            return exactKey ? customFieldMap[exactKey] : "";
        });

        // Wrap links for click tracking
        processedHtml = processedHtml.replace(
            /href="(https?:\/\/[^"]+)"/gi,
            (match: string, originalUrl: string) => {
                // Don't track unsubscribe links
                if (originalUrl.includes('/api/unsubscribe')) return match;
                const trackedUrl = `${trackingBaseUrl}/api/track/click?cid=${campaignId}&email=${encodeURIComponent(subscriberEmail)}&url=${encodeURIComponent(originalUrl)}`;
                return `href="${trackedUrl}"`;
            }
        );

        // Append tracking pixel before closing body tag or at the end
        if (processedHtml.includes('</body>')) {
            processedHtml = processedHtml.replace('</body>', `${trackingPixel}</body>`);
        } else {
            processedHtml += trackingPixel;
        }

        // Handle automatic unsubscribe link injection
        if (!processedHtml.includes(unsubscribeUrl) && !processedHtml.includes('/api/unsubscribe')) {
            const autoUnsubscribeHtml = `
                <br><br>
                <div style="text-align: center; font-size: 12px; color: #666;">
                    <p>You are receiving this email because you subscribed to our list.</p>
                    <p><a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">Unsubscribe</a></p>
                </div>
            `;
            if (processedHtml.includes('</body>')) {
                processedHtml = processedHtml.replace('</body>', `${autoUnsubscribeHtml}</body>`);
            } else {
                processedHtml += autoUnsubscribeHtml;
            }
        }

        try {
            await sendEmail({
                FromEmailAddress: `${campaign.brand.fromName || campaign.brand.name} <${campaign.brand.fromEmail}>`,
                Destination: { ToAddresses: [subscriberEmail] },
                ReplyToAddresses: campaign.brand.replyTo ? [campaign.brand.replyTo] : [],
                Content: {
                    Simple: {
                        Subject: { Data: campaign.subject },
                        Body: { Html: { Data: processedHtml } }
                    }
                },
                EmailTags: [
                    { Name: "campaign_id", Value: campaignId }
                ]
            });

            // Track against warmup daily limit (fire-and-forget, non-fatal)
            incrementWarmupSent(campaign.brandId).catch(e =>
                console.error("Failed to increment warmup counter:", e)
            );

            // Record successful send
            await prisma.campaignSend.upsert({
                where: {
                    campaignId_subscriberEmail: {
                        campaignId,
                        subscriberEmail
                    }
                },
                update: { status: "sent", sentAt: new Date() },
                create: {
                    campaignId,
                    subscriberEmail,
                    subscriberId,
                    status: "sent",
                    sentAt: new Date()
                }
            });
        } catch (sendError: any) {
            // Record failed send
            await prisma.campaignSend.upsert({
                where: {
                    campaignId_subscriberEmail: {
                        campaignId,
                        subscriberEmail
                    }
                },
                update: { status: "failed" },
                create: {
                    campaignId,
                    subscriberEmail,
                    subscriberId,
                    status: "failed"
                }
            });
            throw sendError;
        }

    }, {
        connection,
        concurrency: 50,
        limiter: {
            max: sendRate,
            duration: 1000
        }
    });

    worker.on("completed", job => {
        console.log(`Job ${job.id} has completed!`);
    });

    worker.on("failed", (job, err) => {
        console.error(`Job ${job?.id} has failed with ${err.message}`);
    });

    // Check periodically for campaigns that have finished sending
    setInterval(async () => {
        try {
            const sendingCampaigns = await prisma.campaign.findMany({
                where: { status: "sending" }
            });

            for (const campaign of sendingCampaigns) {
                const totalSends = await prisma.campaignSend.count({
                    where: { campaignId: campaign.id }
                });

                const pendingSends = await prisma.campaignSend.count({
                    where: { campaignId: campaign.id, status: "queued" }
                });

                // If all sends have been processed, mark campaign as sent
                if (totalSends > 0 && pendingSends === 0) {
                    await prisma.campaign.update({
                        where: { id: campaign.id },
                        data: { status: "sent", sentAt: new Date() }
                    });
                    console.log(`Campaign ${campaign.id} marked as sent!`);
                }
            }
        } catch (err) {
            console.error("Error checking campaign completion:", err);
        }
    }, 5000); // Check every 5 seconds

    console.log("Email Worker started.");
};

startWorker();
