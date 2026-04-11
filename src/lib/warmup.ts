import { prisma } from "./prisma";

interface WarmupScheduleEntry {
    day: number;
    limit: number; // -1 means unlimited (warmup complete)
}

/**
 * Returns how many emails the brand may still send today under warmup.
 * Returns -1 if warmup is inactive, complete, or on the unlimited final day.
 * Advances to the next warmup day automatically when 24 h have elapsed.
 */
export async function getWarmupRemaining(brandId: string): Promise<number> {
    const warmup = await prisma.domainWarmup.findUnique({ where: { brandId } });
    if (!warmup || !warmup.isActive) return -1;

    const schedule: WarmupScheduleEntry[] = JSON.parse(warmup.schedule);
    const now = new Date();
    const hoursSinceReset = (now.getTime() - warmup.lastResetAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceReset >= 24) {
        const nextDay = warmup.currentDay + 1;
        const nextEntry = schedule.find(s => s.day === nextDay);
        const warmupComplete = nextDay > schedule.length;
        const newLimit = nextEntry?.limit ?? -1;

        await prisma.domainWarmup.update({
            where: { brandId },
            data: {
                currentDay: nextDay,
                // 999999 is the sentinel for "unlimited" stored in the DB
                dailyLimit: newLimit === -1 ? 999999 : newLimit,
                sentToday: 0,
                lastResetAt: now,
                isActive: !warmupComplete,
            },
        });

        if (warmupComplete || newLimit === -1) return -1;
        return newLimit;
    }

    // dailyLimit of 999999 means the last-day unlimited sentinel
    if (warmup.dailyLimit >= 999999) return -1;
    return Math.max(0, warmup.dailyLimit - warmup.sentToday);
}

/**
 * Atomically increment the sent counter for today. Call after each successful
 * send so getWarmupRemaining stays accurate across the day.
 */
export async function incrementWarmupSent(brandId: string, count = 1): Promise<void> {
    await prisma.domainWarmup.updateMany({
        where: { brandId, isActive: true },
        data: { sentToday: { increment: count } },
    });
}
