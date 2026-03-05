import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/aws";

export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
        return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    try {
        const subToken = await (prisma as any).subscriptionToken.findUnique({
            where: { token },
            include: { subscriber: { include: { list: { include: { brand: true } } } } }
        });

        if (!subToken) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 });
        }

        if (subToken.expiresAt < new Date()) {
            await (prisma as any).subscriptionToken.delete({ where: { id: subToken.id } });
            return NextResponse.json({ error: "Token has expired. Please subscribe again." }, { status: 410 });
        }

        // Confirm the subscriber
        await prisma.subscriber.update({
            where: { id: subToken.subscriberId },
            data: { status: "subscribed" }
        });

        // Clean up the used token
        await (prisma as any).subscriptionToken.delete({ where: { id: subToken.id } });

        // Send welcome email if configured
        const list = subToken.subscriber.list;
        if (list.welcomeEmailHtml && list.brand.fromEmail) {
            try {
                const brandName = list.brand.fromName || list.brand.name;
                await sendEmail({
                    FromEmailAddress: `${brandName} <${list.brand.fromEmail}>`,
                    Destination: { ToAddresses: [subToken.subscriber.email] },
                    ReplyToAddresses: list.brand.replyTo ? [list.brand.replyTo] : [],
                    Content: {
                        Simple: {
                            Subject: { Data: `Welcome to ${list.name}!` },
                            Body: {
                                Html: {
                                    Data: list.welcomeEmailHtml
                                        .replace(/\[Name\]/gi, subToken.subscriber.name || "Friend")
                                        .replace(/\[Email\]/gi, subToken.subscriber.email)
                                }
                            }
                        }
                    }
                });
            } catch (emailError) {
                console.error("Error sending welcome email:", emailError);
            }
        }

        // Trigger automations for confirmed subscriber
        try {
            const activeAutomations = await (prisma as any).automation.findMany({
                where: {
                    triggerListId: list.id,
                    trigger: "subscriber_confirmed",
                    status: "active",
                },
                include: {
                    steps: { orderBy: { order: "asc" }, take: 1 },
                },
            });

            for (const automation of activeAutomations) {
                if (automation.steps.length === 0) continue;

                const firstStep = automation.steps[0];
                let nextProcessAt = new Date();
                if (firstStep.type === "delay") {
                    nextProcessAt = new Date(Date.now() + (firstStep.delayMinutes || 0) * 60 * 1000);
                }

                try {
                    await (prisma as any).automationEnrollment.create({
                        data: {
                            automationId: automation.id,
                            subscriberEmail: subToken.subscriber.email,
                            subscriberId: subToken.subscriberId,
                            currentStepId: firstStep.id,
                            status: "active",
                            nextProcessAt,
                        },
                    });
                } catch {
                    // Already enrolled, skip
                }
            }
        } catch (e) {
            console.error("Automation trigger error:", e);
        }

        // Redirect to custom confirmation URL or return success
        if (list.optInConfirmationUrl) {
            return NextResponse.redirect(list.optInConfirmationUrl, { status: 302 });
        }

        // Return a simple HTML confirmation page
        const html = `<!DOCTYPE html>
<html><head><title>Subscription Confirmed</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fafafa;color:#333;}
.card{text-align:center;padding:3rem;border-radius:12px;background:white;box-shadow:0 2px 16px rgba(0,0,0,.08);max-width:400px;}
h1{font-size:1.5rem;margin:0 0 .5rem;}p{margin:0;color:#666;}</style></head>
<body><div class="card"><h1>✅ You're confirmed!</h1><p>Your subscription has been confirmed. You can close this page.</p></div></body></html>`;

        return new NextResponse(html, {
            status: 200,
            headers: { "Content-Type": "text/html" }
        });

    } catch (error) {
        console.error("Confirm error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
