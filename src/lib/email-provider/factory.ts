import { prisma } from "@/lib/prisma";
import type { EmailProvider, ProviderId } from "./types";
import { sesProvider } from "./ses-provider";
import { resendProvider } from "./resend-provider";
import { postmarkProvider } from "./postmark-provider";
import { sendgridProvider } from "./sendgrid-provider";
import { mailjetProvider } from "./mailjet-provider";
import { elasticProvider } from "./elastic-provider";

const PROVIDER_KEY = "EMAIL_PROVIDER";

const PROVIDERS: Record<ProviderId, EmailProvider> = {
    ses: sesProvider,
    resend: resendProvider,
    postmark: postmarkProvider,
    sendgrid: sendgridProvider,
    mailjet: mailjetProvider,
    elastic: elasticProvider,
};

export async function getActiveProviderId(): Promise<ProviderId> {
    try {
        const setting = await prisma.setting.findUnique({ where: { key: PROVIDER_KEY } });
        const value = (setting?.value || process.env.EMAIL_PROVIDER || "ses") as ProviderId;
        return value in PROVIDERS ? value : "ses";
    } catch {
        return "ses";
    }
}

export async function getProvider(): Promise<EmailProvider> {
    const id = await getActiveProviderId();
    return PROVIDERS[id];
}

export function getProviderById(id: ProviderId): EmailProvider | undefined {
    return PROVIDERS[id];
}

export const SUPPORTED_PROVIDERS: ReadonlyArray<{ id: ProviderId; label: string }> = [
    { id: "ses", label: "Amazon SES" },
    { id: "resend", label: "Resend" },
    { id: "postmark", label: "Postmark" },
    { id: "sendgrid", label: "SendGrid" },
    { id: "mailjet", label: "Mailjet" },
    { id: "elastic", label: "Elastic Email" },
];

export function registerProvider(id: ProviderId, provider: EmailProvider) {
    PROVIDERS[id] = provider;
}
