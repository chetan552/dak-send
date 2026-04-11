import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/aws";
import { randomBytes } from "crypto";
import { dispatchWebhooks } from "@/lib/webhooks";
import { redis } from "@/lib/queue";

const RATE_LIMIT_WINDOW_SEC = 60;
const MAX_REQUESTS_PER_WINDOW = 10;

export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        }
    });
}

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
        if (ip !== "unknown") {
            const key = `subscribe:ratelimit:${ip}`;
            const count = await redis.incr(key);
            if (count === 1) {
                // First request in this window — set TTL
                await redis.expire(key, RATE_LIMIT_WINDOW_SEC);
            }
            if (count > MAX_REQUESTS_PER_WINDOW) {
                const ttl = await redis.ttl(key);
                return NextResponse.json({ error: "Too many requests. Please try again later." }, {
                    status: 429,
                    headers: {
                        "Access-Control-Allow-Origin": "*",
                        "Retry-After": String(ttl > 0 ? ttl : RATE_LIMIT_WINDOW_SEC),
                    }
                });
            }
        }

        let listId: string | null = null;
        let email: string | null = null;
        let name: string | null = null;
        let redirectUrl: string | null = null;
        let gdprConsent: string | null = null;
        const customFieldInputs: Record<string, string> = {};

        const contentType = req.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            const body = await req.json();
            listId = body.listId;
            email = body.email;
            name = body.name;
            redirectUrl = body.redirectUrl;
            gdprConsent = body.gdpr;

            for (const [key, value] of Object.entries(body)) {
                if (key.startsWith("cf_")) {
                    customFieldInputs[key.replace("cf_", "")] = String(value);
                }
            }
        } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
            const formData = await req.formData();
            listId = formData.get("listId") as string;
            email = formData.get("email") as string;
            name = formData.get("name") as string;
            redirectUrl = formData.get("redirectUrl") as string;
            gdprConsent = formData.get("gdpr") as string;

            for (const [key, value] of Array.from(formData.entries())) {
                if (key.startsWith("cf_")) {
                    customFieldInputs[key.replace("cf_", "")] = String(value);
                }
            }
        }

        if (!listId || !email) {
            return NextResponse.json({ error: "Missing required fields" }, {
                status: 400,
                headers: { "Access-Control-Allow-Origin": "*" }
            });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: "Invalid email address" }, {
                status: 400,
                headers: { "Access-Control-Allow-Origin": "*" }
            });
        }

        const list = await prisma.list.findUnique({
            where: { id: listId },
            include: { brand: true }
        });

        if (!list) {
            return NextResponse.json({ error: "List not found" }, {
                status: 404,
                headers: { "Access-Control-Allow-Origin": "*" }
            });
        }

        const hasConsent = gdprConsent === "on" || gdprConsent === "true";

        if (list.requireGdpr && !hasConsent) {
            return NextResponse.json({ error: "GDPR consent is required for this list." }, {
                status: 400,
                headers: { "Access-Control-Allow-Origin": "*" }
            });
        }

        const isDoubleOptIn = list.optIn === "double";

        // Add or update subscriber
        const subscriber = await prisma.subscriber.upsert({
            where: {
                email_listId: {
                    email,
                    listId
                }
            },
            update: {
                name: name || undefined,
                status: isDoubleOptIn ? "pending" : "subscribed",
                ...(hasConsent && { hasConfirmedGdpr: true })
            },
            create: {
                email,
                listId,
                name: name || null,
                status: isDoubleOptIn ? "pending" : "subscribed",
                hasConfirmedGdpr: hasConsent
            }
        });

        // Handle custom fields
        if (Object.keys(customFieldInputs).length > 0) {
            const listCustomFields = await prisma.customField.findMany({
                where: { listId }
            });

            for (const [cfId, value] of Object.entries(customFieldInputs)) {
                const customFieldDef = listCustomFields.find(cf => cf.id === cfId);

                if (customFieldDef) {
                    await prisma.subscriberFieldValue.upsert({
                        where: {
                            subscriberId_customFieldId: {
                                subscriberId: subscriber.id,
                                customFieldId: customFieldDef.id
                            }
                        },
                        update: { value },
                        create: {
                            subscriberId: subscriber.id,
                            customFieldId: customFieldDef.id,
                            value
                        }
                    });
                }
            }
        }

        // Double opt-in: send confirmation email
        if (isDoubleOptIn) {
            const token = randomBytes(32).toString("hex");
            const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

            await prisma.subscriptionToken.create({
                data: {
                    token,
                    subscriberId: subscriber.id,
                    listId,
                    type: "confirm",
                    expiresAt
                }
            });

            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
            const confirmUrl = `${appUrl}/api/confirm?token=${token}`;
            const brandName = list.brand.fromName || list.brand.name;

            try {
                await sendEmail({
                    FromEmailAddress: `${brandName} <${list.brand.fromEmail}>`,
                    Destination: { ToAddresses: [email] },
                    ReplyToAddresses: list.brand.replyTo ? [list.brand.replyTo] : [],
                    Content: {
                        Simple: {
                            Subject: { Data: `Please confirm your subscription to ${list.name}` },
                            Body: {
                                Html: {
                                    Data: `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:500px;margin:0 auto;padding:2rem;">
<h2>Confirm your subscription</h2>
<p>Hi ${name || "there"},</p>
<p>Please confirm your subscription to <strong>${list.name}</strong> by clicking the button below:</p>
<p style="text-align:center;margin:2rem 0;">
<a href="${confirmUrl}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Confirm Subscription</a>
</p>
<p style="color:#666;font-size:0.875rem;">If you didn't request this, you can safely ignore this email.</p>
<p style="color:#999;font-size:0.75rem;">This link expires in 48 hours.</p>
</div>`
                                }
                            }
                        }
                    }
                });
            } catch (emailError) {
                console.error("Error sending confirmation email:", emailError);
            }
        } else {
            // Single opt-in: send welcome email if configured
            if (list.welcomeEmailHtml) {
                try {
                    const brandName = list.brand.fromName || list.brand.name;
                    await sendEmail({
                        FromEmailAddress: `${brandName} <${list.brand.fromEmail}>`,
                        Destination: { ToAddresses: [email] },
                        ReplyToAddresses: list.brand.replyTo ? [list.brand.replyTo] : [],
                        Content: {
                            Simple: {
                                Subject: { Data: `Welcome to ${list.name}!` },
                                Body: {
                                    Html: {
                                        Data: list.welcomeEmailHtml
                                            .replace(/\[Name\]/gi, name || "Friend")
                                            .replace(/\[Email\]/gi, email)
                                    }
                                }
                            }
                        }
                    });
                } catch (emailError) {
                    console.error("Error sending welcome email:", emailError);
                }
            }
        }

        // Trigger automations for new subscriber
        try {
            const activeAutomations = await prisma.automation.findMany({
                where: {
                    triggerListId: listId,
                    trigger: isDoubleOptIn ? "subscriber_confirmed" : "subscriber_added",
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
                    await prisma.automationEnrollment.create({
                        data: {
                            automationId: automation.id,
                            subscriberEmail: email,
                            subscriberId: subscriber.id,
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

        // Handle redirect or JSON response
        if (redirectUrl) {
            return NextResponse.redirect(redirectUrl, {
                status: 302,
                headers: { "Access-Control-Allow-Origin": "*" }
            });
        }

        const message = isDoubleOptIn
            ? "A confirmation email has been sent. Please check your inbox."
            : "Subscribed successfully";

        // Dispatch subscribe webhook
        const listData = await prisma.list.findUnique({
            where: { id: listId },
            select: { brandId: true },
        });
        dispatchWebhooks("subscribe", { email, name, listId }, listData?.brandId);

        return NextResponse.json({ success: true, message }, {
            status: 200,
            headers: { "Access-Control-Allow-Origin": "*" }
        });

    } catch (error) {
        console.error("Subscribe Error:", error);
        return NextResponse.json({ error: "Internal server error" }, {
            status: 500,
            headers: { "Access-Control-Allow-Origin": "*" }
        });
    }
}
