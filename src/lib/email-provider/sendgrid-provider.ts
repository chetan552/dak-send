import type { EmailMessage, EmailProvider, ProviderStatus, SendResult, NormalizedEvent } from "./types";
import { readSettings } from "./settings";

const API_BASE = "https://api.sendgrid.com";

function splitAddress(addr: { email: string; name?: string }) {
    return addr.name ? { email: addr.email, name: addr.name } : { email: addr.email };
}

export const sendgridProvider: EmailProvider = {
    id: "sendgrid",
    name: "SendGrid",

    async send(msg: EmailMessage): Promise<SendResult> {
        const { SENDGRID_API_KEY } = await readSettings(["SENDGRID_API_KEY"]);
        if (!SENDGRID_API_KEY) throw new Error("SendGrid API key is not configured");

        const customArgs = msg.tags ? { ...msg.tags } : undefined;
        const headers = msg.headers ? { ...msg.headers } : undefined;

        const body: Record<string, unknown> = {
            personalizations: [{ to: [splitAddress(msg.to)] }],
            from: splitAddress(msg.from),
            subject: msg.subject,
            content: [
                { type: "text/plain", value: msg.text },
                { type: "text/html", value: msg.html },
            ],
            // Disable SendGrid's own tracking — DakSend owns analytics.
            tracking_settings: {
                click_tracking: { enable: false },
                open_tracking: { enable: false },
                subscription_tracking: { enable: false },
            },
        };
        if (msg.replyTo) body.reply_to = { email: msg.replyTo };
        if (headers) body.headers = headers;
        if (customArgs) body.custom_args = customArgs;

        const res = await fetch(`${API_BASE}/v3/mail/send`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SENDGRID_API_KEY}`,
            },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`SendGrid send failed (${res.status}): ${errText.slice(0, 300)}`);
        }
        // SendGrid returns the message id in the X-Message-Id header.
        const messageId = res.headers.get("x-message-id") || "";
        return { messageId };
    },

    async getStatus(): Promise<ProviderStatus> {
        const { SENDGRID_API_KEY } = await readSettings(["SENDGRID_API_KEY"]);
        if (!SENDGRID_API_KEY) {
            return { level: "unconfigured", label: "Not configured", detail: "Add a SendGrid API key in Settings.", provider: "sendgrid" };
        }
        try {
            const res = await fetch(`${API_BASE}/v3/user/credits`, {
                headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` },
            });
            if (res.status === 401 || res.status === 403) {
                return { level: "critical", label: "Auth failed", detail: "SendGrid API key is invalid or lacks permissions.", provider: "sendgrid" };
            }
            if (!res.ok) {
                return { level: "warning", label: `HTTP ${res.status}`, detail: "Unexpected response from SendGrid.", provider: "sendgrid" };
            }
            const data = (await res.json()) as { remain?: number; total?: number };
            if (typeof data.remain === "number" && typeof data.total === "number" && data.total > 0) {
                const usedPct = ((data.total - data.remain) / data.total) * 100;
                if (data.remain === 0) {
                    return { level: "critical", label: "At limit", detail: `Used all ${data.total} credits this period.`, provider: "sendgrid" };
                }
                if (usedPct >= 80) {
                    return { level: "warning", label: "Near limit", detail: `${data.remain} of ${data.total} credits remaining.`, provider: "sendgrid" };
                }
                return { level: "healthy", label: "Healthy", detail: `${data.remain} credits remaining this period.`, provider: "sendgrid" };
            }
            return { level: "healthy", label: "Healthy", detail: "SendGrid API key is valid.", provider: "sendgrid" };
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            return { level: "critical", label: "Error", detail: message.slice(0, 140), provider: "sendgrid" };
        }
    },
};

/**
 * Parse a SendGrid Event Webhook payload (array of events) into normalized events.
 * Reference: https://docs.sendgrid.com/for-developers/tracking-events/event
 */
export function parseSendgridWebhook(body: unknown): NormalizedEvent[] {
    if (!Array.isArray(body)) return [];
    const out: NormalizedEvent[] = [];

    for (const raw of body) {
        if (!raw || typeof raw !== "object") continue;
        const e = raw as {
            event?: string;
            email?: string;
            sg_message_id?: string;
            type?: string;
            reason?: string;
            campaign_id?: string;
        };
        const email = e.email || "";
        const messageId = typeof e.sg_message_id === "string" ? e.sg_message_id : undefined;
        const campaignId = typeof e.campaign_id === "string" ? e.campaign_id : undefined;
        if (!email) continue;

        switch (e.event) {
            case "bounce":
                out.push({ type: "bounce", email, subType: "hard", campaignId, messageId, reason: e.reason });
                break;
            case "dropped":
                out.push({ type: "bounce", email, subType: "hard", campaignId, messageId, reason: e.reason });
                break;
            case "deferred":
                out.push({ type: "bounce", email, subType: "soft", campaignId, messageId, reason: e.reason });
                break;
            case "spamreport":
                out.push({ type: "complaint", email, campaignId, messageId });
                break;
            case "delivered":
                out.push({ type: "delivery", email, campaignId, messageId });
                break;
        }
    }
    return out;
}
