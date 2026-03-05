"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Standard 14-day warmup schedule
const DEFAULT_WARMUP_SCHEDULE = [
    { day: 1, limit: 50 },
    { day: 2, limit: 100 },
    { day: 3, limit: 200 },
    { day: 4, limit: 400 },
    { day: 5, limit: 700 },
    { day: 6, limit: 1000 },
    { day: 7, limit: 1500 },
    { day: 8, limit: 2500 },
    { day: 9, limit: 4000 },
    { day: 10, limit: 6000 },
    { day: 11, limit: 9000 },
    { day: 12, limit: 14000 },
    { day: 13, limit: 20000 },
    { day: 14, limit: -1 }, // -1 = unlimited
];

export async function getWarmupStatus(brandId: string) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) throw new Error("Unauthorized");

    const warmup = await (prisma as any).domainWarmup.findUnique({
        where: { brandId },
    });

    if (!warmup) return null;

    const schedule = JSON.parse(warmup.schedule);
    const totalDays = schedule.length;
    const progressPercent = Math.min((warmup.currentDay / totalDays) * 100, 100);
    const isComplete = warmup.currentDay > totalDays || !warmup.isActive;

    return {
        ...warmup,
        schedule,
        totalDays,
        progressPercent,
        isComplete,
        remainingToday: Math.max(0, warmup.dailyLimit - warmup.sentToday),
    };
}

export async function startWarmup(brandId: string) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const currentUserRole = (session?.user as any)?.role || "user";
    if (!userId) throw new Error("Unauthorized");

    const whereCondition: any = currentUserRole === "admin"
        ? { id: brandId }
        : { id: brandId, users: { some: { id: userId } } };

    const brand = await prisma.brand.findFirst({ where: whereCondition });
    if (!brand) throw new Error("Brand not found");
    if (!brand.fromEmail) throw new Error("Brand has no sender email configured");

    const domain = brand.fromEmail.split("@")[1];

    await (prisma as any).domainWarmup.upsert({
        where: { brandId },
        update: {
            isActive: true,
            currentDay: 1,
            dailyLimit: DEFAULT_WARMUP_SCHEDULE[0].limit,
            sentToday: 0,
            startDate: new Date(),
            lastResetAt: new Date(),
            schedule: JSON.stringify(DEFAULT_WARMUP_SCHEDULE),
            domain,
        },
        create: {
            brandId,
            domain,
            schedule: JSON.stringify(DEFAULT_WARMUP_SCHEDULE),
            dailyLimit: DEFAULT_WARMUP_SCHEDULE[0].limit,
        },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
}

export async function stopWarmup(brandId: string) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) throw new Error("Unauthorized");

    await (prisma as any).domainWarmup.update({
        where: { brandId },
        data: { isActive: false },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
}

// Called before sending — returns the current daily limit or -1 if unlimited
export async function getWarmupLimit(brandId: string): Promise<number> {
    const warmup = await (prisma as any).domainWarmup.findUnique({
        where: { brandId },
    });

    if (!warmup || !warmup.isActive) return -1; // No limit

    // Check if we need to advance to the next day
    const now = new Date();
    const lastReset = new Date(warmup.lastResetAt);
    const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

    if (hoursSinceReset >= 24) {
        const schedule = JSON.parse(warmup.schedule);
        const nextDay = Math.min(warmup.currentDay + 1, schedule.length);
        const nextDaySchedule = schedule.find((s: any) => s.day === nextDay);
        const newLimit = nextDaySchedule ? nextDaySchedule.limit : -1;

        await (prisma as any).domainWarmup.update({
            where: { brandId },
            data: {
                currentDay: nextDay,
                dailyLimit: newLimit === -1 ? 999999 : newLimit,
                sentToday: 0,
                lastResetAt: now,
                isActive: nextDay <= schedule.length,
            },
        });

        return newLimit;
    }

    return Math.max(0, warmup.dailyLimit - warmup.sentToday);
}

// Increment the sent counter
export async function incrementWarmupSent(brandId: string, count: number) {
    await (prisma as any).domainWarmup.update({
        where: { brandId },
        data: { sentToday: { increment: count } },
    });
}
