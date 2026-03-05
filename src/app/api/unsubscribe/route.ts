import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/aws";
import { dispatchWebhooks } from "@/lib/webhooks";

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const subscriberId = searchParams.get("i");
    const listId = searchParams.get("l");

    if (!subscriberId || !listId) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    try {
        const subscriber = await prisma.subscriber.findUnique({
            where: { id: subscriberId },
            include: { list: { include: { brand: true } } }
        });

        if (!subscriber || subscriber.listId !== listId) {
            return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
        }

        if (subscriber.status === "unsubscribed") {
            const list = subscriber.list;
            if (list.unsubscribeConfirmationUrl) {
                return NextResponse.redirect(list.unsubscribeConfirmationUrl, { status: 302 });
            }
            return new NextResponse(getUnsubscribeHtml("Already Unsubscribed", "You have already been unsubscribed from this list."), {
                status: 200,
                headers: { "Content-Type": "text/html" }
            });
        }

        await prisma.subscriber.update({
            where: { id: subscriberId },
            data: { status: "unsubscribed" }
        });

        // Dispatch unsubscribe webhook
        dispatchWebhooks("unsubscribe", {
            email: subscriber.email,
            listId: subscriber.listId,
        }, subscriber.list.brand.id);

        // Send goodbye email if configured
        const list = subscriber.list;
        if (list.goodbyeEmailHtml && list.brand.fromEmail) {
            try {
                const brandName = list.brand.fromName || list.brand.name;
                await sendEmail({
                    FromEmailAddress: `${brandName} <${list.brand.fromEmail}>`,
                    Destination: { ToAddresses: [subscriber.email] },
                    ReplyToAddresses: list.brand.replyTo ? [list.brand.replyTo] : [],
                    Content: {
                        Simple: {
                            Subject: { Data: `You've been unsubscribed from ${list.name}` },
                            Body: {
                                Html: {
                                    Data: list.goodbyeEmailHtml
                                        .replace(/\[Name\]/gi, subscriber.name || "Friend")
                                        .replace(/\[Email\]/gi, subscriber.email)
                                }
                            }
                        }
                    }
                });
            } catch (emailError) {
                console.error("Error sending goodbye email:", emailError);
            }
        }

        // Redirect to custom unsubscribe confirmation URL or show success page
        if (list.unsubscribeConfirmationUrl) {
            return NextResponse.redirect(list.unsubscribeConfirmationUrl, { status: 302 });
        }

        return new NextResponse(getUnsubscribeHtml("Unsubscribed", "You have been successfully unsubscribed. You will no longer receive emails from this list."), {
            status: 200,
            headers: { "Content-Type": "text/html" }
        });

    } catch (error) {
        console.error("Unsubscribe error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

function getUnsubscribeHtml(title: string, message: string): string {
    return `<!DOCTYPE html>
<html><head><title>${title}</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fafafa;color:#333;}
.card{text-align:center;padding:3rem;border-radius:12px;background:white;box-shadow:0 2px 16px rgba(0,0,0,.08);max-width:400px;}
h1{font-size:1.5rem;margin:0 0 .5rem;}p{margin:0;color:#666;}</style></head>
<body><div class="card"><h1>${title}</h1><p>${message}</p></div></body></html>`;
}
