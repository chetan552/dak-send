import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/aws";
import { dispatchWebhooks } from "@/lib/webhooks";
import { redisRateLimit } from "@/lib/redis-rate-limit";

// ---------------------------------------------------------------------------
// Shared helper — used by both GET and POST
// ---------------------------------------------------------------------------

async function markUnsubscribed(subscriberId: string, listId: string): Promise<
    | { ok: false; status: number; error: string }
    | { ok: true; alreadyUnsubscribed: boolean; subscriber: Awaited<ReturnType<typeof fetchSubscriber>> }
> {
    const subscriber = await fetchSubscriber(subscriberId, listId);
    if (!subscriber) return { ok: false, status: 404, error: "Subscriber not found" };
    if (subscriber.listId !== listId) return { ok: false, status: 404, error: "Subscriber not found" };

    if (subscriber.status === "unsubscribed") {
        return { ok: true, alreadyUnsubscribed: true, subscriber };
    }

    await prisma.subscriber.update({
        where: { id: subscriberId },
        data: { status: "unsubscribed" },
    });

    // Dispatch webhook (fire-and-forget, non-fatal)
    try {
        dispatchWebhooks(
            "unsubscribe",
            { email: subscriber.email, listId: subscriber.listId },
            subscriber.list.brand.id,
        );
    } catch {
        // webhooks are best-effort
    }

    return { ok: true, alreadyUnsubscribed: false, subscriber };
}

async function fetchSubscriber(subscriberId: string, listId: string) {
    return prisma.subscriber.findUnique({
        where: { id: subscriberId },
        include: { list: { include: { brand: true } } },
    }).then((s) => (s?.listId === listId ? s : null));
}

// ---------------------------------------------------------------------------
// GET — user clicks the unsubscribe link in their email client
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
    const limited = await redisRateLimit(req, "unsubscribe", 20, 60);
    if (limited) return limited;

    const searchParams = req.nextUrl.searchParams;
    const subscriberId = searchParams.get("i");
    const listId = searchParams.get("l");

    if (!subscriberId || !listId) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    try {
        const result = await markUnsubscribed(subscriberId, listId);

        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        const { subscriber, alreadyUnsubscribed } = result;
        const list = subscriber!.list;

        if (alreadyUnsubscribed) {
            if (list.unsubscribeConfirmationUrl && isSafeUrl(list.unsubscribeConfirmationUrl)) {
                return NextResponse.redirect(list.unsubscribeConfirmationUrl, { status: 302 });
            }
            return new NextResponse(
                getUnsubscribeHtml("Already Unsubscribed", "You have already been unsubscribed from this list."),
                { status: 200, headers: { "Content-Type": "text/html" } },
            );
        }

        // Send goodbye email if configured
        if (list.goodbyeEmailHtml && list.brand.fromEmail) {
            try {
                const brandName = list.brand.fromName || list.brand.name;
                await sendEmail({
                    FromEmailAddress: `${brandName} <${list.brand.fromEmail}>`,
                    Destination: { ToAddresses: [subscriber!.email] },
                    ReplyToAddresses: list.brand.replyTo ? [list.brand.replyTo] : [],
                    Content: {
                        Simple: {
                            Subject: { Data: `You've been unsubscribed from ${list.name}` },
                            Body: {
                                Html: {
                                    Data: list.goodbyeEmailHtml
                                        .replace(/\[Name\]/gi, subscriber!.name || "Friend")
                                        .replace(/\[Email\]/gi, subscriber!.email),
                                },
                            },
                        },
                    },
                });
            } catch (emailError) {
                console.error("Error sending goodbye email:", emailError);
            }
        }

        if (list.unsubscribeConfirmationUrl && isSafeUrl(list.unsubscribeConfirmationUrl)) {
            return NextResponse.redirect(list.unsubscribeConfirmationUrl, { status: 302 });
        }

        return new NextResponse(
            getUnsubscribeHtml(
                "Unsubscribed",
                "You have been successfully unsubscribed. You will no longer receive emails from this list.",
            ),
            { status: 200, headers: { "Content-Type": "text/html" } },
        );
    } catch (error) {
        console.error("Unsubscribe error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// ---------------------------------------------------------------------------
// POST — one-click unsubscribe per RFC 8058 / Gmail & Yahoo bulk-sender rules
//
// Gmail and Yahoo POST to the exact URL in the List-Unsubscribe header
// (i.e. the same URL as GET with ?i=...&l=... query params) with a body of
// "List-Unsubscribe=One-Click". We read the subscriber IDs from query params
// just like GET does, so no body parsing is needed.
//
// Requirements:
//  - Must return 2xx without requiring additional user interaction
//  - Must NOT redirect
//  - Must NOT send a goodbye email (that's for the human-clicked GET flow)
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
    const limited = await redisRateLimit(req, "unsubscribe", 20, 60);
    if (limited) return limited;

    const searchParams = req.nextUrl.searchParams;
    const subscriberId = searchParams.get("i");
    const listId = searchParams.get("l");

    // Skip test sends that use a placeholder URL
    if (searchParams.get("test") === "1") {
        return new NextResponse(null, { status: 200 });
    }

    if (!subscriberId || !listId) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    try {
        const result = await markUnsubscribed(subscriberId, listId);

        if (!result.ok) {
            // Return 200 even on not-found — RFC 8058 says the server MUST respond
            // with a 2xx so mailbox providers don't retry indefinitely.
            return new NextResponse(null, { status: 200 });
        }

        return new NextResponse(null, { status: 200 });
    } catch (error) {
        console.error("One-click unsubscribe error:", error);
        // Still 200 — we don't want ISPs retrying
        return new NextResponse(null, { status: 200 });
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Allow only http/https redirect targets (rejects javascript:, data:, etc.) */
function isSafeUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
}

// ---------------------------------------------------------------------------
// HTML helper
// ---------------------------------------------------------------------------

function getUnsubscribeHtml(title: string, message: string): string {
    return `<!DOCTYPE html>
<html><head><title>${title}</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fafafa;color:#333;}
.card{text-align:center;padding:3rem;border-radius:12px;background:white;box-shadow:0 2px 16px rgba(0,0,0,.08);max-width:400px;}
h1{font-size:1.5rem;margin:0 0 .5rem;}p{margin:0;color:#666;}</style></head>
<body><div class="card"><h1>${title}</h1><p>${message}</p></div></body></html>`;
}
