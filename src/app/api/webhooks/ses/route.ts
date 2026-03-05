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

export async function POST(req: NextRequest) {
    try {
        const bodyText = await req.text();
        const payload = JSON.parse(bodyText);

        // Verify SNS signature
        if (!await verifySnsSignature(payload)) {
            console.warn("SNS signature verification failed, rejecting request");
            return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
        }

        // Handle SNS Subscription Confirmation
        if (payload.Type === 'SubscriptionConfirmation' && payload.SubscribeURL) {
            console.log("Confirming SNS subscription:", payload.SubscribeURL);
            await fetch(payload.SubscribeURL);
            return NextResponse.json({ message: "Subscription confirmed" });
        }

        // Handle SNS Notification (SES Bounce / Complaint)
        if (payload.Type === 'Notification' && payload.Message) {
            const message = JSON.parse(payload.Message);
            const notificationType = message.notificationType;

            if (notificationType === 'Bounce') {
                const bouncedRecipients = message.bounce?.bouncedRecipients || [];
                for (const recipient of bouncedRecipients) {
                    const email = recipient.emailAddress;
                    console.log(`Processing Bounce for: ${email}`);

                    await prisma.subscriber.updateMany({
                        where: { email },
                        data: { status: 'bounced' }
                    });

                    // Also update CampaignSend records
                    await (prisma as any).campaignSend.updateMany({
                        where: { subscriberEmail: email, status: 'sent' },
                        data: { status: 'bounced' }
                    });
                }
            } else if (notificationType === 'Complaint') {
                const complainedRecipients = message.complaint?.complainedRecipients || [];
                for (const recipient of complainedRecipients) {
                    const email = recipient.emailAddress;
                    console.log(`Processing Complaint for: ${email}`);

                    await prisma.subscriber.updateMany({
                        where: { email },
                        data: { status: 'complained' }
                    });

                    // Also update CampaignSend records
                    await (prisma as any).campaignSend.updateMany({
                        where: { subscriberEmail: email, status: 'sent' },
                        data: { status: 'complained' }
                    });
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("Error processing SNS webhook:", e);
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}
