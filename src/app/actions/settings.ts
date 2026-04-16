"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SESClient, GetSendQuotaCommand, GetSendStatisticsCommand } from "@aws-sdk/client-ses";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { writeAuditLog } from "@/lib/audit";

async function isAdmin() {
    const session = await getServerSession(authOptions);
    return session?.user?.role === "admin";
}

export async function getSystemSettings() {
    if (!await isAdmin()) throw new Error("Unauthorized");

    const settings = await prisma.setting.findMany();
    return settings.reduce((acc: Record<string, string>, s: any) => ({ ...acc, [s.key]: s.value }), {} as Record<string, string>);
}

export async function updateSystemSettings(data: Record<string, string>) {
    if (!await isAdmin()) throw new Error("Unauthorized");

    for (const [key, value] of Object.entries(data)) {
        await prisma.setting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
        });
    }

    revalidatePath("/dashboard/settings");
    return { success: true };
}

/**
 * Generate a new API key, hash it with bcrypt, store the hash.
 * Returns the plaintext key once — callers must show it to the user immediately.
 * Subsequent calls rotate the key.
 */
export async function rotateApiKey() {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "admin") throw new Error("Unauthorized");

    const plaintext = randomBytes(32).toString("hex");
    const hash = await bcrypt.hash(plaintext, 12);

    await prisma.setting.upsert({
        where: { key: "API_KEY" },
        update: { value: hash },
        create: { key: "API_KEY", value: hash },
    });

    writeAuditLog({
        action: "api_key_rotated",
        entityType: "setting",
        entityId: "API_KEY",
        actorId: session.user.id,
        meta: {},
    });

    revalidatePath("/dashboard/settings");
    return { plaintext };
}

export async function getSESQuota() {
    if (!await isAdmin()) throw new Error("Unauthorized");

    // Fetch settings from DB
    const settings = await prisma.setting.findMany();
    const config = settings.reduce<Record<string, string>>((acc, s) => ({ ...acc, [s.key]: s.value }), {});

    const region = config.AWS_REGION || process.env.AWS_REGION || "us-east-1";
    const accessKeyId = config.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = config.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
        return { error: "AWS credentials not configured" };
    }

    const client = new SESClient({
        region,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    });

    try {
        const quotaCommand = new GetSendQuotaCommand({});
        const quota = await client.send(quotaCommand);

        const statsCommand = new GetSendStatisticsCommand({});
        const stats = await client.send(statsCommand);

        // Calculate sent today from stats
        const sentToday = stats.SendDataPoints?.reduce((acc: number, point: any) => {
            const now = new Date();
            const pointDate = point.Timestamp ? new Date(point.Timestamp) : null;
            if (pointDate && (now.getTime() - pointDate.getTime()) < 24 * 60 * 60 * 1000) {
                return acc + (point.DeliveryAttempts || 0);
            }
            return acc;
        }, 0) || 0;

        return {
            region,
            dailyQuota: quota.Max24HourSend || 0,
            sentLast24Hours: quota.SentLast24Hours || 0,
            sendsLeft: (quota.Max24HourSend || 0) - (quota.SentLast24Hours || 0),
            sentToday,
            maxSendRate: quota.MaxSendRate || 0,
        };
    } catch (error: any) {
        console.error("Error fetching SES quota:", error);
        return { error: error.message || "Failed to fetch SES quota" };
    }
}
