import type { EmailMessage, EmailProvider, ProviderStatus, SendResult, NormalizedEvent } from "./types";
import { readSettings } from "./settings";

const API_BASE = "https://api.elasticemail.com";

function formatAddress(addr: { email: string; name?: string }): string {
    return addr.name ? `${addr.name} <${addr.email}>` : addr.email;
}

export const elasticProvider: EmailProvider = {
    id: "elastic",
    name: "Elastic Email",

    async send(msg: EmailMessage): Promise<SendResult> {
        const { ELASTIC_API_KEY } = await readSettings(["ELASTIC_API_KEY"]);
        if (!ELASTIC_API_KEY) throw new Error("Elastic Email API key is not configured");

        const headersField = msg.headers ? Object.entries(msg.headers).map(([Name, Value]) => ({ Name, Value })) : undefined;

        const body: Record<string, unknown> = {
            Recipients: [{ Email: msg.to.email, ...(msg.to.name ? { Fields: { name: msg.to.name } } : {}) }],
            Content: {
                Body: [
                    { ContentType: "HTML", Content: msg.html, Charset: "utf-8" },
                    { ContentType: "PlainText", Content: msg.text, Charset: "utf-8" },
                ],
                From: formatAddress(msg.from),
                Subject: msg.subject,
                ReplyTo: msg.replyTo,
                Headers: headersField,
            },
            Options: {
                // Disable Elastic Email's own tracking — DakSend owns analytics.
                TrackOpens: false,
                TrackClicks: false,
            },
        };

        const res = await fetch(`${API_BASE}/v4/emails`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-ElasticEmail-ApiKey": ELASTIC_API_KEY,
            },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Elastic Email send failed (${res.status}): ${errText.slice(0, 300)}`);
        }
        const data = (await res.json()) as { MessageID?: string; TransactionID?: string };
        return { messageId: data.MessageID || data.TransactionID || "" };
    },

    async getStatus(): Promise<ProviderStatus> {
        const { ELASTIC_API_KEY } = await readSettings(["ELASTIC_API_KEY"]);
        if (!ELASTIC_API_KEY) {
            return { level: "unconfigured", label: "Not configured", detail: "Add an Elastic Email API key in Settings.", provider: "elastic" };
        }
        try {
            const res = await fetch(`${API_BASE}/v4/security/credit`, {
                headers: { "X-ElasticEmail-ApiKey": ELASTIC_API_KEY },
            });
            if (res.status === 401 || res.status === 403) {
                return { level: "critical", label: "Auth failed", detail: "Elastic Email API key is invalid.", provider: "elastic" };
            }
            if (!res.ok) {
                return { level: "warning", label: `HTTP ${res.status}`, detail: "Unexpected response from Elastic Email.", provider: "elastic" };
            }
            const data = (await res.json()) as { Email?: number; Sms?: number };
            const credits = typeof data.Email === "number" ? data.Email : undefined;
            if (credits !== undefined) {
                if (credits === 0) {
                    return { level: "critical", label: "At limit", detail: "No email credits remaining.", provider: "elastic" };
                }
                if (credits < 100) {
                    return { level: "warning", label: "Low credits", detail: `${credits} email credits remaining.`, provider: "elastic" };
                }
                return { level: "healthy", label: "Healthy", detail: `${credits} email credits remaining.`, provider: "elastic" };
            }
            return { level: "healthy", label: "Healthy", detail: "Elastic Email API key is valid.", provider: "elastic" };
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            return { level: "critical", label: "Error", detail: message.slice(0, 140), provider: "elastic" };
        }
    },
};

/**
 * Parse an Elastic Email notification body into normalized events.
 * Reference: https://elasticemail.com/developers/api-documentation/notifications
 * Notifications post a single event with form/JSON body.
 */
export function parseElasticWebhook(body: unknown): NormalizedEvent[] {
    if (!body || typeof body !== "object") return [];
    const evt = body as {
        status?: string;
        category?: string;
        to?: string;
        target?: string;
        messageid?: string;
        msgid?: string;
        customId?: string;
        customid?: string;
    };

    const email = evt.to || evt.target || "";
    const messageId = evt.messageid || evt.msgid;
    const campaignId = evt.customId || evt.customid;
    const status = (evt.status || evt.category || "").toLowerCase();
    if (!email) return [];

    if (status === "abusereport" || status === "abuse") {
        return [{ type: "complaint", email, campaignId, messageId }];
    }
    if (status === "bounced" || status === "error") {
        // Elastic Email's "category" field distinguishes permanent vs transient.
        const cat = (evt.category || "").toLowerCase();
        const isSoft = cat === "deferred" || cat === "softbounce" || cat === "throttled";
        return [{
            type: "bounce",
            email,
            subType: isSoft ? "soft" : "hard",
            campaignId,
            messageId,
            reason: evt.category,
        }];
    }
    if (status === "sent" || status === "delivered") {
        return [{ type: "delivery", email, campaignId, messageId }];
    }
    return [];
}
