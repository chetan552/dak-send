export type ProviderId = "ses" | "resend" | "postmark" | "sendgrid" | "mailjet" | "elastic";

export interface EmailAddress {
    email: string;
    name?: string;
}

export interface EmailMessage {
    from: EmailAddress;
    to: EmailAddress;
    replyTo?: string;
    subject: string;
    html: string;
    text: string;
    /**
     * Wire-level headers DakSend wants on the outbound email.
     * Currently: List-Unsubscribe, List-Unsubscribe-Post, Precedence, Feedback-ID.
     * Each provider maps these to its own header syntax.
     */
    headers?: Record<string, string>;
    /**
     * Lightweight per-message metadata (e.g. campaign_id) used to correlate
     * webhooks back to a campaign. Each provider maps this to its tag/metadata API.
     */
    tags?: Record<string, string>;
}

export interface SendResult {
    messageId: string;
}

export interface ProviderStatus {
    level: "healthy" | "warning" | "critical" | "unconfigured";
    label: string;
    detail: string;
    provider: ProviderId;
}

export interface EmailProvider {
    id: ProviderId;
    /** Human label for UIs. */
    name: string;
    /** Send a single email. Throws on transport failure; returns the provider's message id on success. */
    send(msg: EmailMessage): Promise<SendResult>;
    /** Optional reputation/quota check for the sidebar status widget. */
    getStatus(): Promise<ProviderStatus>;
}

/**
 * Normalized webhook event the per-provider parser produces.
 * The shared handler updates Subscriber.status and the suppression list based on this.
 */
export type NormalizedEvent =
    | { type: "bounce"; email: string; subType?: "hard" | "soft"; campaignId?: string; messageId?: string; reason?: string }
    | { type: "complaint"; email: string; campaignId?: string; messageId?: string; reason?: string }
    | { type: "delivery"; email: string; campaignId?: string; messageId?: string };
