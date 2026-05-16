import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { SESClient, GetSendQuotaCommand } from "@aws-sdk/client-ses";
import { prisma } from "@/lib/prisma";
import type { EmailMessage, EmailProvider, ProviderStatus, SendResult } from "./types";

async function readSesConfig() {
    const settings = await prisma.setting.findMany({
        where: { key: { in: ["AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"] } },
    });
    const config = settings.reduce<Record<string, string>>((acc, s) => ({ ...acc, [s.key]: s.value }), {});
    return {
        region: config.AWS_REGION || process.env.AWS_REGION || "us-east-1",
        accessKeyId: config.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "",
    };
}

function formatAddress(addr: { email: string; name?: string }): string {
    if (!addr.name) return addr.email;
    const escaped = addr.name.replace(/"/g, '\\"');
    return `"${escaped}" <${addr.email}>`;
}

export const sesProvider: EmailProvider = {
    id: "ses",
    name: "Amazon SES",

    async send(msg: EmailMessage): Promise<SendResult> {
        const { region, accessKeyId, secretAccessKey } = await readSesConfig();
        const client = new SESv2Client({ region, credentials: { accessKeyId, secretAccessKey } });

        const headerEntries = Object.entries(msg.headers || {}).map(([Name, Value]) => ({ Name, Value }));
        const tagEntries = Object.entries(msg.tags || {}).map(([Name, Value]) => ({ Name, Value }));

        const result = await client.send(new SendEmailCommand({
            FromEmailAddress: formatAddress(msg.from),
            Destination: { ToAddresses: [formatAddress(msg.to)] },
            ReplyToAddresses: msg.replyTo ? [msg.replyTo] : [],
            Content: {
                Simple: {
                    Subject: { Data: msg.subject },
                    Body: {
                        Html: { Data: msg.html },
                        Text: { Data: msg.text },
                    },
                    Headers: headerEntries.length > 0 ? headerEntries : undefined,
                },
            },
            EmailTags: tagEntries.length > 0 ? tagEntries : undefined,
        }));

        return { messageId: result.MessageId || "" };
    },

    async getStatus(): Promise<ProviderStatus> {
        const { region, accessKeyId, secretAccessKey } = await readSesConfig();
        if (!accessKeyId || !secretAccessKey) {
            return { level: "unconfigured", label: "Not configured", detail: "Add AWS credentials in Settings.", provider: "ses" };
        }
        try {
            const client = new SESClient({ region, credentials: { accessKeyId, secretAccessKey } });
            const quota = await client.send(new GetSendQuotaCommand({}));
            const max = quota.Max24HourSend || 0;
            const sent = quota.SentLast24Hours || 0;
            const usedPct = max > 0 ? (sent / max) * 100 : 0;

            if (max === 0) {
                return { level: "warning", label: "Sandbox", detail: "SES account is in sandbox mode — request production access from AWS.", provider: "ses" };
            }
            if (usedPct >= 95) {
                return { level: "critical", label: "At limit", detail: `Used ${sent.toFixed(0)} of ${max.toFixed(0)} daily emails (${usedPct.toFixed(0)}%).`, provider: "ses" };
            }
            if (usedPct >= 80) {
                return { level: "warning", label: "Near limit", detail: `Used ${usedPct.toFixed(0)}% of today's quota.`, provider: "ses" };
            }
            return { level: "healthy", label: "Healthy", detail: `${(max - sent).toFixed(0)} sends remaining today.`, provider: "ses" };
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            return { level: "critical", label: "Error", detail: message.slice(0, 140), provider: "ses" };
        }
    },
};
