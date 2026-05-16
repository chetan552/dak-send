import type { EmailMessage, EmailProvider, ProviderStatus, SendResult, NormalizedEvent } from "./types";
import { readSettings } from "./settings";

const API_BASE = "https://api.resend.com";

function formatAddress(addr: { email: string; name?: string }): string {
    return addr.name ? `${addr.name} <${addr.email}>` : addr.email;
}

export const resendProvider: EmailProvider = {
    id: "resend",
    name: "Resend",

    async send(msg: EmailMessage): Promise<SendResult> {
        const { RESEND_API_KEY } = await readSettings(["RESEND_API_KEY"]);
        if (!RESEND_API_KEY) throw new Error("Resend API key is not configured");

        const body: Record<string, unknown> = {
            from: formatAddress(msg.from),
            to: [formatAddress(msg.to)],
            subject: msg.subject,
            html: msg.html,
            text: msg.text,
            headers: msg.headers,
            // Disable Resend's own open/click tracking — DakSend owns analytics.
            tracking: { opens: false, clicks: false },
        };
        if (msg.replyTo) body.reply_to = msg.replyTo;
        if (msg.tags) {
            body.tags = Object.entries(msg.tags).map(([name, value]) => ({ name, value }));
        }

        const res = await fetch(`${API_BASE}/emails`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Resend send failed (${res.status}): ${errText.slice(0, 300)}`);
        }
        const data = (await res.json()) as { id?: string };
        return { messageId: data.id || "" };
    },

    async getStatus(): Promise<ProviderStatus> {
        const { RESEND_API_KEY } = await readSettings(["RESEND_API_KEY"]);
        if (!RESEND_API_KEY) {
            return { level: "unconfigured", label: "Not configured", detail: "Add a Resend API key in Settings.", provider: "resend" };
        }
        try {
            // Resend has no public quota endpoint; ping /domains as a credential check.
            const res = await fetch(`${API_BASE}/domains`, {
                headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
            });
            if (res.status === 401 || res.status === 403) {
                return { level: "critical", label: "Auth failed", detail: "Resend API key is invalid or revoked.", provider: "resend" };
            }
            if (!res.ok) {
                return { level: "warning", label: `HTTP ${res.status}`, detail: "Unexpected response from Resend.", provider: "resend" };
            }
            return { level: "healthy", label: "Healthy", detail: "Resend API key is valid.", provider: "resend" };
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            return { level: "critical", label: "Error", detail: message.slice(0, 140), provider: "resend" };
        }
    },
};

/**
 * Parse a Resend webhook body into normalized events.
 * Reference: https://resend.com/docs/dashboard/webhooks/event-types
 */
export function parseResendWebhook(body: unknown): NormalizedEvent[] {
    if (!body || typeof body !== "object") return [];
    const evt = body as { type?: string; data?: Record<string, unknown> };
    const data = (evt.data || {}) as Record<string, unknown>;
    const toField = data.to;
    const email = Array.isArray(toField) && typeof toField[0] === "string"
        ? toField[0]
        : typeof toField === "string"
            ? toField
            : "";
    const messageId = typeof data.email_id === "string" ? data.email_id : (typeof data.id === "string" ? data.id : undefined);
    const tags = (data.tags as Array<{ name?: string; value?: string }> | undefined) || [];
    const campaignId = tags.find((t) => t?.name === "campaign_id")?.value;

    switch (evt.type) {
        case "email.bounced": {
            const bounce = data.bounce as { type?: string } | undefined;
            const isSoft = bounce?.type === "Transient" || bounce?.type === "soft";
            return [{
                type: "bounce",
                email,
                subType: isSoft ? "soft" : "hard",
                campaignId,
                messageId,
                reason: typeof bounce?.type === "string" ? bounce.type : undefined,
            }];
        }
        case "email.complained":
            return [{ type: "complaint", email, campaignId, messageId }];
        case "email.delivered":
            return [{ type: "delivery", email, campaignId, messageId }];
        default:
            return [];
    }
}
