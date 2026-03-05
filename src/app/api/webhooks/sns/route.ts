import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const isSns = req.headers.get("x-amz-sns-message-type");
        if (!isSns) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        const body = await req.json();
        const type = body.Type;

        // SNS requires acknowledging the subscription URL initially
        if (type === "SubscriptionConfirmation") {
            const subscribeUrl = body.SubscribeURL;
            console.log(`SNS Subscription URL: ${subscribeUrl}`);
            // In production, we should actively perform a GET request to `subscribeUrl`
            await fetch(subscribeUrl);
            return NextResponse.json({ status: "Confirmed" });
        }

        if (type === "Notification") {
            const message = JSON.parse(body.Message);
            const notificationType = message.notificationType;

            if (notificationType === "Bounce") {
                const bouncedRecipients = message.bounce.bouncedRecipients;
                for (const recipient of bouncedRecipients) {
                    const email = recipient.emailAddress;
                    await prisma.subscriber.updateMany({
                        where: { email },
                        data: { status: "bounced" }
                    });
                }
            } else if (notificationType === "Complaint") {
                const complainedRecipients = message.complaint.complainedRecipients;
                for (const recipient of complainedRecipients) {
                    const email = recipient.emailAddress;
                    await prisma.subscriber.updateMany({
                        where: { email },
                        data: { status: "complained" }
                    });
                }
            }

            // We can also handle 'Delivery' here if we wanted to track exact delivery percentages
        }

        return NextResponse.json({ status: "Success" });
    } catch (error) {
        console.error("SNS Webhook Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
