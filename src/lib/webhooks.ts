import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { isSafeWebhookUrl } from "@/lib/validators";
import { assertPublicHost } from "@/lib/safe-url";

type WebhookEvent = "subscribe" | "unsubscribe" | "open" | "click" | "bounce" | "complaint";

interface WebhookPayload {
    event: WebhookEvent;
    timestamp: string;
    data: Record<string, any>;
}

/**
 * Fire outgoing webhooks for a given event.
 * Runs asynchronously — does not block the caller.
 */
export async function dispatchWebhooks(event: WebhookEvent, data: Record<string, any>, brandId?: string) {
    try {
        const where: any = { active: true, events: { has: event } };
        if (brandId) where.brandId = brandId;

        const webhooks = await prisma.webhook.findMany({ where });

        if (webhooks.length === 0) return;

        const payload: WebhookPayload = {
            event,
            timestamp: new Date().toISOString(),
            data,
        };

        const body = JSON.stringify(payload);

        // Fire all webhook requests in parallel, don't await (fire-and-forget)
        const promises = webhooks.map(async (wh: any) => {
            try {
                const headers: Record<string, string> = {
                    "Content-Type": "application/json",
                    "User-Agent": "DakSend-Webhooks/1.0",
                    "X-Webhook-Event": event,
                };

                // HMAC signature if secret is set
                if (wh.secret) {
                    const signature = crypto
                        .createHmac("sha256", wh.secret)
                        .update(body)
                        .digest("hex");
                    headers["X-Webhook-Signature"] = `sha256=${signature}`;
                }

                if (!isSafeWebhookUrl(wh.url)) {
                    console.warn(`Blocked unsafe webhook URL: ${wh.url}`);
                    return;
                }
                // Also verify the hostname doesn't resolve to a private address
                try {
                    await assertPublicHost(new URL(wh.url));
                } catch (err) {
                    console.warn(`Blocked webhook URL resolving to private address: ${wh.url}`, err instanceof Error ? err.message : err);
                    return;
                }

                await fetch(wh.url, {
                    method: "POST",
                    headers,
                    body,
                    signal: AbortSignal.timeout(10000), // 10s timeout
                });
            } catch (err) {
                // Silently fail individual webhooks
                console.error(`Webhook ${wh.id} failed for ${event}:`, err);
            }
        });

        // Don't block — run in background
        Promise.allSettled(promises);
    } catch (err) {
        console.error("dispatchWebhooks error:", err);
    }
}
