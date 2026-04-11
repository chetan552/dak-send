import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createVerify } from "crypto";

// SNS Message signature verification
async function verifySnsSignature(payload: any): Promise<boolean> {
    try {
        // Skip verification in development
        if (process.env.NODE_ENV === 'development') return true;

        const signingCertUrl = payload.SigningCertURL || payload.SigningCertUrl;
        if (!signingCertUrl) return false;

        // Verify the cert URL is from AWS
        const certUrl = new URL(signingCertUrl);
        if (!certUrl.hostname.endsWith('.amazonaws.com')) return false;

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

        const verify = createVerify('SHA1');
        verify.update(stringToSign);
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

    if (campaignId) {
        // Best case: we know exactly which campaign triggered the complaint
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            select: { brandId: true },
        });
        if (campaign) {
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
    } else {
        // No tracked campaign found (e.g. welcome/confirmation email) — mark globally
        // so the address is suppressed everywhere rather than keep spamming.
        await prisma.subscriber.updateMany({
            where: { email },
            data: { status: 'complained' },
        });
    }
}

export async function handleSnsPayload(payload: any): Promise<{ status: number; body: object }> {
    if (!await verifySnsSignature(payload)) {
        console.warn("SNS signature verification failed, rejecting request");
        return { status: 403, body: { error: "Invalid signature" } };
    }

    // Handle SNS Subscription Confirmation
    if (payload.Type === 'SubscriptionConfirmation' && payload.SubscribeURL) {
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
