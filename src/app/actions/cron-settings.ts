"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { CronJobKey, CronSettings } from "@/lib/cron-config";

async function requireAdmin() {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");
    if (session.user.role !== "admin") throw new Error("Admin required");
}

async function getSettingValue(key: string): Promise<string | null> {
    const s = await prisma.setting.findUnique({ where: { key } });
    return s?.value ?? null;
}

async function setSettingValue(key: string, value: string) {
    await prisma.setting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
    });
}

export async function getCronSettings(): Promise<CronSettings> {
    await requireAdmin();

    const keys: CronJobKey[] = ["scheduled", "rss", "automations"];
    const defaults: Record<CronJobKey, { interval: string }> = {
        scheduled:   { interval: "* * * * *" },
        rss:         { interval: "*/30 * * * *" },
        automations: { interval: "*/2 * * * *" },
    };

    const result: any = {};
    for (const k of keys) {
        const [enabled, interval, lastRun] = await Promise.all([
            getSettingValue(`cron.${k}.enabled`),
            getSettingValue(`cron.${k}.interval`),
            getSettingValue(`cron.${k}.lastRun`),
        ]);
        result[k] = {
            enabled: enabled === "true",
            interval: interval ?? defaults[k].interval,
            lastRun: lastRun ?? null,
        };
    }
    return result as CronSettings;
}

export async function updateCronJob(job: CronJobKey, config: { enabled: boolean; interval: string }) {
    await requireAdmin();
    await Promise.all([
        setSettingValue(`cron.${job}.enabled`, config.enabled ? "true" : "false"),
        setSettingValue(`cron.${job}.interval`, config.interval),
    ]);
    revalidatePath("/dashboard/settings");
    return { success: true };
}

export async function runCronJobNow(job: CronJobKey): Promise<{ success: boolean; message: string }> {
    await requireAdmin();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const secret = process.env.CRON_SECRET || "";
    const url = `${appUrl}/api/cron/${job}?secret=${encodeURIComponent(secret)}`;

    try {
        const res = await fetch(url, { method: "GET", cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        await setSettingValue(`cron.${job}.lastRun`, new Date().toISOString());
        revalidatePath("/dashboard/settings");
        return { success: true, message: JSON.stringify(data) };
    } catch (err: any) {
        return { success: false, message: err.message || "Failed" };
    }
}

/** Called by the cron HTTP routes after a successful run (no session check needed). */
export async function markCronLastRun(job: CronJobKey) {
    await prisma.setting.upsert({
        where: { key: `cron.${job}.lastRun` },
        create: { key: `cron.${job}.lastRun`, value: new Date().toISOString() },
        update: { value: new Date().toISOString() },
    });
}
