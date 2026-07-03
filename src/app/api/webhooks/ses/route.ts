import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createVerify } from "crypto";

// A legitimate SNS signing cert is always served from the regional SNS host
// over HTTPS, e.g. https://sns.us-east-1.amazonaws.com/SimpleNotification...pem
function isValidSnsCertUrl(raw: string): boolean {
    try {
        const url = new URL(raw);
        return (
            url.protocol === "https:" &&
            /^sns\.[a-z0-9-]+\.amazonaws\.com$/.test(url.hostname) &&
            url.pathname.endsWith(".pem")
        );
    } catch {
        return false;
    }
}

// SNS Message signature verification
async function verifySnsSignature(payload: any): Promise<boolean> {
    try {
        // Skip verification in development
        if (process.env.NODE_ENV === 'development') return true;

        const signingCertUrl = payload.SigningCertURL || payload.SigningCertUrl;
        if (!signingCertUrl) return false;

        // Pin the cert URL to the exact SNS host pattern (sns.<region>.amazonaws.com)
        // over HTTPS. A loose `.amazonaws.com` suffix check would accept
        // attacker-controlled content on any AWS host (e.g. a public S3 bucket:
        // evil.s3.amazonaws.com), letting them serve their own cert and sign
        // their own forged payload. Requiring the real SNS host means the cert
        // can only be Amazon's, which the attacker cannot sign against.
        if (!isValidSnsCertUrl(signingCertUrl)) return false;

        // Fetch the signing cert
        const certResponse = await fetch(signingCertUrl);
        const cert = await certResponse.text();

        // Build the string to sign based on message type
        let signableKeys: string[];
        if (payload.Type === 'Notification') {
            signableKeys = ['Message', 'MessageId', 'Subject', 'Timestamp', 'TopicArn', 'Type'];
        } else {
            signableKeys = ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type'];
        }

        const stringToSign = signableKeys
            .filter(key => key in payload)
            .map(key => `${key}\n${payload[key]}\n`)
            .join('');

        // SNS SignatureVersion 1 = SHA1, version 2 = SHA256. Default to SHA1
        // for backward compatibility with older notifications.
        const algorithm = String(payload.SignatureVersion) === '2' ? 'RSA-SHA256' : 'RSA-SHA1';
        const verify = createVerify(algorithm);
        verify.update(stringToSign, 'utf8');
        return verify.verify(cert, payload.Signature, 'base64');
    } catch (e) {
        console.error("SNS signature verification failed:", e);
        return false;
    }
}

/**
 * Extract the campaign_id SES tag from the mail object.
 * SES includes EmailTags in notifications as { tagName: [value] }.
 */
function extractCampaignId(mail: any): string | undefined {
    return mail?.tags?.campaign_id?.[0] ?? undefined;
}

/**
 * Resolve the list IDs belonging to a brand, used to scope subscriber updates.
 */
async function getListIdsForBrand(brandId: string): Promise<string[]> {
    const lists = await prisma.list.findMany({
        where: { brandId },
        select: { id: true },
    });
    return lists.map(l => l.id);
}

/**
 * Hard bounces: the address is provably invalid, so mark it in every brand's
 * list — preventing all brands from continuing to send to a dead address and
 * burning their SES reputation.
 *
 * CampaignSend records are updated globally for the same reason.
 */
async function processBounce(email: string) {
    await prisma.subscriber.updateMany({
        where: { email },
        data: { status: 'bounced' }
    });
    await prisma.campaignSend.updateMany({
        where: { subscriberEmail: email, status: 'sent' },
        data: { status: 'bounced' }
    });
    // Auto-add to global suppression list so this address is never mailed again
    await prisma.suppressionList.upsert({
        where: { email_brandId: { email, brandId: null as any } },
        update: {},
        create: { email, reason: 'bounce', brandId: null },
    }).catch(() => {/* ignore if already exists */});
}

/**
 * Complaints are brand-specific: the subscriber is objecting to *this* brand's
 * emails, not to every brand they're subscribed to.
 *
 * Resolution order:
 *  1. Use the campaign_id SES tag (attached by the worker) → brand-scoped update.
 *  2. Fall back to CampaignSend records for this email → find brand(s) that sent.
 *  3. If no tracked send exists (welcome/confirmation email), mark globally.
 */
async function processComplaint(email: string, campaignId?: string) {
    let listIds: string[] | null = null;
    let brandId: string | null = null;

    if (campaignId) {
        // Best case: we know exactly which campaign triggered the complaint
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            select: { brandId: true },
        });
        if (campaign) {
            brandId = campaign.brandId;
            listIds = await getListIdsForBrand(campaign.brandId);
            await prisma.campaignSend.updateMany({
                where: { campaignId, subscriberEmail: email, status: 'sent' },
                data: { status: 'complained' },
            });
        }
    }

    if (listIds === null) {
        // Fallback: find every brand that has sent to this address
        const sends = await prisma.campaignSend.findMany({
            where: { subscriberEmail: email, status: 'sent' },
            select: { campaignId: true, campaign: { select: { brandId: true } } },
        });

        if (sends.length > 0) {
            const brandIds = [...new Set(sends.map(s => s.campaign.brandId))];
            const allLists = await Promise.all(brandIds.map(getListIdsForBrand));
            listIds = allLists.flat();
            // Use the first brand found for suppression scoping
            brandId = brandIds[0] ?? null;

            await prisma.campaignSend.updateMany({
                where: { subscriberEmail: email, status: 'sent' },
                data: { status: 'complained' },
            });
        }
    }

    if (listIds !== null && listIds.length > 0) {
        // Scoped update: only mark the subscriber complained in the sending brand's lists
        await prisma.subscriber.updateMany({
            where: { email, listId: { in: listIds } },
            data: { status: 'complained' },
        });
        // Brand-scoped suppression so future campaigns from this brand skip the address
        if (brandId) {
            await prisma.suppressionList.upsert({
                where: { email_brandId: { email, brandId } },
                update: {},
                create: { email, reason: 'complaint', brandId },
            }).catch(() => {});
        }
    } else {
        // No tracked campaign found (e.g. welcome/confirmation email) — mark globally
        // so the address is suppressed everywhere rather than keep spamming.
        await prisma.subscriber.updateMany({
            where: { email },
            data: { status: 'complained' },
        });
        await prisma.suppressionList.upsert({
            where: { email_brandId: { email, brandId: null as any } },
            update: {},
            create: { email, reason: 'complaint', brandId: null },
        }).catch(() => {});
    }
}

export async function handleSnsPayload(payload: any): Promise<{ status: number; body: object }> {
    if (!await verifySnsSignature(payload)) {
        console.warn("SNS signature verification failed, rejecting request");
        return { status: 403, body: { error: "Invalid signature" } };
    }

    // Handle SNS Subscription Confirmation
    if (payload.Type === 'SubscriptionConfirmation' && payload.SubscribeURL) {
        // Validate URL is a legitimate AWS SNS endpoint before fetching (SSRF guard)
        try {
            const subUrl = new URL(payload.SubscribeURL);
            const isAwsHost = /^sns\.[a-z0-9-]+\.amazonaws\.com$/.test(subUrl.hostname);
            const isHttps = subUrl.protocol === "https:";
            if (!isAwsHost || !isHttps) {
                console.warn("SNS SubscribeURL rejected — not an AWS endpoint:", subUrl.hostname);
                return { status: 400, body: { error: "Invalid SubscribeURL" } };
            }
        } catch {
            return { status: 400, body: { error: "Malformed SubscribeURL" } };
        }
        console.log("Confirming SNS subscription:", payload.SubscribeURL);
        await fetch(payload.SubscribeURL);
        return { status: 200, body: { message: "Subscription confirmed" } };
    }

    // Handle SNS Notification (SES Bounce / Complaint)
    if (payload.Type === 'Notification' && payload.Message) {
        const message = JSON.parse(payload.Message);
        const notificationType = message.notificationType;
        const campaignId = extractCampaignId(message.mail);

        if (notificationType === 'Bounce') {
            for (const recipient of message.bounce?.bouncedRecipients ?? []) {
                console.log(`Processing Bounce for: ${recipient.emailAddress}`);
                await processBounce(recipient.emailAddress);
            }
        } else if (notificationType === 'Complaint') {
            for (const recipient of message.complaint?.complainedRecipients ?? []) {
                console.log(`Processing Complaint for: ${recipient.emailAddress} (campaign: ${campaignId ?? 'unknown'})`);
                await processComplaint(recipient.emailAddress, campaignId);
            }
        }
    }

    return { status: 200, body: { success: true } };
}

export async function POST(req: NextRequest) {
    try {
        const payload = JSON.parse(await req.text());
        const result = await handleSnsPayload(payload);
        return NextResponse.json(result.body, { status: result.status });
    } catch (e: any) {
        console.error("Error processing SNS webhook:", e);
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}
