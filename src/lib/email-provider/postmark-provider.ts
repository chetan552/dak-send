import type { EmailMessage, EmailProvider, ProviderStatus, SendResult, NormalizedEvent } from "./types";
import { readSettings } from "./settings";

const API_BASE = "https://api.postmarkapp.com";

function formatAddress(addr: { email: string; name?: string }): string {
    return addr.name ? `${addr.name} <${addr.email}>` : addr.email;
}

export const postmarkProvider: EmailProvider = {
    id: "postmark",
    name: "Postmark",

    async send(msg: EmailMessage): Promise<SendResult> {
        const { POSTMARK_SERVER_TOKEN, POSTMARK_MESSAGE_STREAM } = await readSettings([
            "POSTMARK_SERVER_TOKEN",
            "POSTMARK_MESSAGE_STREAM",
        ]);
        if (!POSTMARK_SERVER_TOKEN) throw new Error("Postmark server token is not configured");
        if (!POSTMARK_MESSAGE_STREAM) {
            throw new Error("Postmark message stream is not configured — bulk campaigns require a broadcast stream");
        }

        const body: Record<string, unknown> = {
            From: formatAddress(msg.from),
            To: formatAddress(msg.to),
            Subject: msg.subject,
            HtmlBody: msg.html,
            TextBody: msg.text,
            MessageStream: POSTMARK_MESSAGE_STREAM,
            // Disable Postmark's own tracking — DakSend owns analytics.
            TrackOpens: false,
            TrackLinks: "None",
        };
        if (msg.replyTo) body.ReplyTo = msg.replyTo;
        if (msg.headers) {
            body.Headers = Object.entries(msg.headers).map(([Name, Value]) => ({ Name, Value }));
        }
        if (msg.tags) {
            // Postmark only supports a single Tag string; pick campaign_id if present.
            if (msg.tags.campaign_id) body.Tag = msg.tags.campaign_id;
            body.Metadata = msg.tags;
        }

        const res = await fetch(`${API_BASE}/email`, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN,
            },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Postmark send failed (${res.status}): ${errText.slice(0, 300)}`);
        }
        const data = (await res.json()) as { MessageID?: string };
        return { messageId: data.MessageID || "" };
    },

    async getStatus(): Promise<ProviderStatus> {
        const { POSTMARK_SERVER_TOKEN } = await readSettings(["POSTMARK_SERVER_TOKEN"]);
        if (!POSTMARK_SERVER_TOKEN) {
            return { level: "unconfigured", label: "Not configured", detail: "Add a Postmark server token in Settings.", provider: "postmark" };
        }
        try {
            const res = await fetch(`${API_BASE}/server`, {
                headers: {
                    Accept: "application/json",
                    "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN,
                },
            });
            if (res.status === 401 || res.status === 403) {
                return { level: "critical", label: "Auth failed", detail: "Postmark server token is invalid.", provider: "postmark" };
            }
            if (!res.ok) {
                return { level: "warning", label: `HTTP ${res.status}`, detail: "Unexpected response from Postmark.", provider: "postmark" };
            }
            return { level: "healthy", label: "Healthy", detail: "Postmark server token is valid.", provider: "postmark" };
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            return { level: "critical", label: "Error", detail: message.slice(0, 140), provider: "postmark" };
        }
    },
};

/**
 * Parse a Postmark webhook body into normalized events.
 * Postmark sends one event per request. RecordType identifies the type.
 * Reference: https://postmarkapp.com/developer/webhooks/webhooks-overview
 */
export function parsePostmarkWebhook(body: unknown): NormalizedEvent[] {
    if (!body || typeof body !== "object") return [];
    const evt = body as {
        RecordType?: string;
        Email?: string;
        Recipient?: string;
        Type?: string;
        TypeCode?: number;
        MessageID?: string;
        Metadata?: Record<string, string>;
        Tag?: string;
    };

    const email = evt.Email || evt.Recipient || "";
    const messageId = evt.MessageID;
    const campaignId = evt.Metadata?.campaign_id || (evt.Tag && evt.Tag !== "" ? evt.Tag : undefined);

    if (evt.RecordType === "Bounce") {
        // Postmark Type: HardBounce, SoftBounce, Transient, Blocked, SpamComplaint, etc.
        if (evt.Type === "SpamComplaint") {
            return [{ type: "complaint", email, campaignId, messageId }];
        }
        const subType: "soft" | "hard" = evt.Type === "SoftBounce" || evt.Type === "Transient" ? "soft" : "hard";
        return [{ type: "bounce", email, subType, campaignId, messageId, reason: evt.Type }];
    }
    if (evt.RecordType === "SpamComplaint") {
        return [{ type: "complaint", email, campaignId, messageId }];
    }
    if (evt.RecordType === "Delivery") {
        return [{ type: "delivery", email, campaignId, messageId }];
    }
    return [];
}
