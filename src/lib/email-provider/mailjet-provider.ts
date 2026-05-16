import type { EmailMessage, EmailProvider, ProviderStatus, SendResult, NormalizedEvent } from "./types";
import { readSettings } from "./settings";

const API_BASE = "https://api.mailjet.com";

function basicAuth(key: string, secret: string): string {
    return `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`;
}

function splitAddress(addr: { email: string; name?: string }) {
    return addr.name ? { Email: addr.email, Name: addr.name } : { Email: addr.email };
}

export const mailjetProvider: EmailProvider = {
    id: "mailjet",
    name: "Mailjet",

    async send(msg: EmailMessage): Promise<SendResult> {
        const { MAILJET_API_KEY, MAILJET_API_SECRET } = await readSettings(["MAILJET_API_KEY", "MAILJET_API_SECRET"]);
        if (!MAILJET_API_KEY || !MAILJET_API_SECRET) throw new Error("Mailjet API key/secret are not configured");

        const message: Record<string, unknown> = {
            From: splitAddress(msg.from),
            To: [splitAddress(msg.to)],
            Subject: msg.subject,
            HTMLPart: msg.html,
            TextPart: msg.text,
            // Disable Mailjet's own tracking — DakSend owns analytics.
            TrackOpens: "disabled",
            TrackClicks: "disabled",
        };
        if (msg.replyTo) message.ReplyTo = { Email: msg.replyTo };
        if (msg.headers) message.Headers = msg.headers;
        if (msg.tags) {
            if (msg.tags.campaign_id) message.CustomID = msg.tags.campaign_id;
            message.EventPayload = JSON.stringify(msg.tags);
        }

        const res = await fetch(`${API_BASE}/v3.1/send`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: basicAuth(MAILJET_API_KEY, MAILJET_API_SECRET),
            },
            body: JSON.stringify({ Messages: [message] }),
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Mailjet send failed (${res.status}): ${errText.slice(0, 300)}`);
        }
        const data = (await res.json()) as { Messages?: Array<{ To?: Array<{ MessageID?: string }> }> };
        const messageId = data.Messages?.[0]?.To?.[0]?.MessageID || "";
        return { messageId: String(messageId) };
    },

    async getStatus(): Promise<ProviderStatus> {
        const { MAILJET_API_KEY, MAILJET_API_SECRET } = await readSettings(["MAILJET_API_KEY", "MAILJET_API_SECRET"]);
        if (!MAILJET_API_KEY || !MAILJET_API_SECRET) {
            return { level: "unconfigured", label: "Not configured", detail: "Add Mailjet API key and secret in Settings.", provider: "mailjet" };
        }
        try {
            const res = await fetch(`${API_BASE}/v3/REST/myprofile`, {
                headers: { Authorization: basicAuth(MAILJET_API_KEY, MAILJET_API_SECRET) },
            });
            if (res.status === 401 || res.status === 403) {
                return { level: "critical", label: "Auth failed", detail: "Mailjet API key/secret is invalid.", provider: "mailjet" };
            }
            if (!res.ok) {
                return { level: "warning", label: `HTTP ${res.status}`, detail: "Unexpected response from Mailjet.", provider: "mailjet" };
            }
            return { level: "healthy", label: "Healthy", detail: "Mailjet credentials are valid.", provider: "mailjet" };
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            return { level: "critical", label: "Error", detail: message.slice(0, 140), provider: "mailjet" };
        }
    },
};

/**
 * Parse a Mailjet Parse webhook payload (array of events) into normalized events.
 * Reference: https://dev.mailjet.com/email/guides/webhooks/
 */
export function parseMailjetWebhook(body: unknown): NormalizedEvent[] {
    const list: Array<Record<string, unknown>> = Array.isArray(body)
        ? (body as Array<Record<string, unknown>>)
        : body && typeof body === "object"
            ? [body as Record<string, unknown>]
            : [];

    const out: NormalizedEvent[] = [];
    for (const e of list) {
        const event = typeof e.event === "string" ? e.event : "";
        const email = typeof e.email === "string" ? e.email : "";
        const messageId = typeof e.MessageID === "string" ? e.MessageID : (typeof e.MessageID === "number" ? String(e.MessageID) : undefined);
        const campaignId = typeof e.CustomID === "string" && e.CustomID ? e.CustomID : undefined;
        if (!email) continue;

        switch (event) {
            case "bounce": {
                const hardBounce = e.hard_bounce === true || (typeof e.error === "string" && /hard/i.test(e.error));
                out.push({
                    type: "bounce",
                    email,
                    subType: hardBounce ? "hard" : "soft",
                    campaignId,
                    messageId,
                    reason: typeof e.error === "string" ? e.error : undefined,
                });
                break;
            }
            case "blocked":
                out.push({ type: "bounce", email, subType: "hard", campaignId, messageId, reason: "blocked" });
                break;
            case "spam":
                out.push({ type: "complaint", email, campaignId, messageId });
                break;
            case "sent":
                out.push({ type: "delivery", email, campaignId, messageId });
                break;
        }
    }
    return out;
}
