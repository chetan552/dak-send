"use server";

import { prisma } from "@/lib/prisma";
import { SESClient, GetSendQuotaCommand } from "@aws-sdk/client-ses";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type ProviderStatusLevel = "healthy" | "warning" | "critical" | "unconfigured";

export interface ProviderStatus {
    level: ProviderStatusLevel;
    label: string;
    detail: string;
    provider: string;
}

export async function getProviderStatus(): Promise<ProviderStatus> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return { level: "unconfigured", label: "Signed out", detail: "", provider: "ses" };
    }

    const settings = await prisma.setting.findMany({
        where: { key: { in: ["AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"] } },
    });
    const config = settings.reduce<Record<string, string>>((acc, s) => ({ ...acc, [s.key]: s.value }), {});

    const region = config.AWS_REGION || process.env.AWS_REGION || "us-east-1";
    const accessKeyId = config.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = config.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
        return {
            level: "unconfigured",
            label: "Not configured",
            detail: "Add AWS credentials in Settings to enable sending.",
            provider: "ses",
        };
    }

    const client = new SESClient({ region, credentials: { accessKeyId, secretAccessKey } });

    try {
        const quota = await client.send(new GetSendQuotaCommand({}));
        const max = quota.Max24HourSend || 0;
        const sent = quota.SentLast24Hours || 0;
        const usedPct = max > 0 ? (sent / max) * 100 : 0;

        if (max === 0) {
            return {
                level: "warning",
                label: "Sandbox",
                detail: "SES account is in sandbox mode — request production access from AWS.",
                provider: "ses",
            };
        }
        if (usedPct >= 95) {
            return {
                level: "critical",
                label: "At limit",
                detail: `Used ${sent.toFixed(0)} of ${max.toFixed(0)} daily emails (${usedPct.toFixed(0)}%).`,
                provider: "ses",
            };
        }
        if (usedPct >= 80) {
            return {
                level: "warning",
                label: "Near limit",
                detail: `Used ${usedPct.toFixed(0)}% of today's quota.`,
                provider: "ses",
            };
        }
        return {
            level: "healthy",
            label: "Healthy",
            detail: `${(max - sent).toFixed(0)} sends remaining today.`,
            provider: "ses",
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return {
            level: "critical",
            label: "Error",
            detail: message.slice(0, 140),
            provider: "ses",
        };
    }
}
