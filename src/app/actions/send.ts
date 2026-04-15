"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emailQueue } from "@/lib/queue";
import { revalidatePath } from "next/cache";
import { translateSegmentQuery } from "@/lib/segment-query";
import { getNextSendTime } from "@/lib/send-time";
import { getWarmupRemaining } from "@/lib/warmup";

async function drainCampaignJobs(campaignId: string) {
    try {
        // Fetch all waiting and delayed jobs, remove those belonging to this campaign.
        // BullMQ doesn't support pattern-based removal, so we iterate and filter by data.
        const [waiting, delayed] = await Promise.all([
            emailQueue.getWaiting(0, -1),
            emailQueue.getDelayed(0, -1),
        ]);
        const toRemove = [...waiting, ...delayed].filter(
            job => job.data?.campaignId === campaignId
        );
        await Promise.all(toRemove.map(job => job.remove()));
        if (toRemove.length > 0) {
            console.log(`Removed ${toRemove.length} queued jobs for cancelled campaign ${campaignId}`);
        }
    } catch (e) {
        // Non-fatal — the worker skips jobs for non-sending campaigns anyway
        console.error("Failed to drain jobs for campaign", campaignId, e);
    }
}

export async function dispatchCampaign(campaignId: string, data: {
    includedLists: string[];
    excludedLists: string[];
    includedSegments: string[];
    excludedSegments: string[];
    useOptimalTime?: boolean;
}) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const whereCondition: any = currentUserRole === 'admin'
        ? { id: campaignId }
        : { id: campaignId, brand: { users: { some: { id: userId } } } };

    const campaign = await prisma.campaign.findFirst({
        where: whereCondition
    });

    if (!campaign || campaign.status !== 'draft') {
        throw new Error("Invalid campaign");
    }

    // 1. Gather all included emails
    const allIncludedEmails = new Set<string>();

    // Lists
    if (data.includedLists?.length > 0) {
        const listSubs = await prisma.subscriber.findMany({
            where: { listId: { in: data.includedLists }, status: "subscribed" },
            select: { email: true }
        });
        listSubs.forEach(s => allIncludedEmails.add(s.email));
    }

    // Segments
    if (data.includedSegments?.length > 0) {
        for (const segId of data.includedSegments) {
            const segment = await prisma.segment.findUnique({ where: { id: segId } });
            if (segment && segment.query) {
                try {
                    const whereObj = JSON.parse(segment.query);
                    const translatedWhere = translateSegmentQuery(whereObj);
                    const subs = await prisma.subscriber.findMany({
                        where: { ...translatedWhere, listId: segment.listId, status: "subscribed" },
                        select: { email: true }
                    });
                    subs.forEach(s => allIncludedEmails.add(s.email));
                } catch (e) { console.warn("Segment parsing error:", e) }
            }
        }
    }

    // 2. Gather excluded emails
    const allExcludedEmails = new Set<string>();

    if (data.excludedLists?.length > 0) {
        const excSubs = await prisma.subscriber.findMany({
            where: { listId: { in: data.excludedLists } },
            select: { email: true }
        });
        excSubs.forEach(s => allExcludedEmails.add(s.email));
    }

    if (data.excludedSegments?.length > 0) {
        for (const segId of data.excludedSegments) {
            const segment = await prisma.segment.findUnique({ where: { id: segId } });
            if (segment && segment.query) {
                try {
                    const whereObj = JSON.parse(segment.query);
                    const translatedWhere = translateSegmentQuery(whereObj);
                    const subs = await prisma.subscriber.findMany({
                        where: { ...translatedWhere, listId: segment.listId },
                        select: { email: true }
                    });
                    subs.forEach(s => allExcludedEmails.add(s.email));
                } catch (e) { console.warn("Segment parsing error:", e) }
            }
        }
    }

    // 3. Final unique subs
    const finalEmails = Array.from(allIncludedEmails).filter(e => !allExcludedEmails.has(e));

    if (finalEmails.length === 0) {
        throw new Error("No active subscribers found in selected criteria.");
    }

    // 4. Remove suppressed emails (global + brand-scoped)
    const suppressed = await prisma.suppressionList.findMany({
        where: {
            email: { in: finalEmails },
            OR: [{ brandId: null }, { brandId: campaign.brandId }],
        },
        select: { email: true },
    });
    const suppressedSet = new Set(suppressed.map(s => s.email));
    const unsuppressedEmails = finalEmails.filter(e => !suppressedSet.has(e));

    const fetchTime = new Date();
    let subscribers = await prisma.subscriber.findMany({
        where: {
            email: { in: unsuppressedEmails },
            status: "subscribed",
            OR: [
                { pausedUntil: null },
                { pausedUntil: { lt: fetchTime } },
            ],
        },
        distinct: ['email'],
        select: { id: true, email: true, name: true, listId: true, optimalSendHour: true },
    });

    // Enforce domain warmup daily limit
    const warmupRemaining = await getWarmupRemaining(campaign.brandId);
    let warmupTruncated = false;
    if (warmupRemaining !== -1 && subscribers.length > warmupRemaining) {
        console.log(`Warmup active: capping send from ${subscribers.length} to ${warmupRemaining} subscribers for brand ${campaign.brandId}`);
        subscribers = subscribers.slice(0, warmupRemaining);
        warmupTruncated = true;
    }

    if (subscribers.length === 0) {
        throw new Error(
            warmupTruncated
                ? "Domain warmup daily limit already reached. Try again tomorrow."
                : "No active subscribers found in selected criteria."
        );
    }

    // Update campaign status AND relations
    // Disconnect old and connect new
    await prisma.campaign.update({
        where: { id: campaignId },
        data: {
            status: "sending",
            includedLists: { set: data.includedLists.map((id: string) => ({ id })) },
            excludedLists: { set: data.excludedLists.map((id: string) => ({ id })) },
            includedSegments: { set: data.includedSegments.map((id: string) => ({ id })) },
            excludedSegments: { set: data.excludedSegments.map((id: string) => ({ id })) },
        }
    });

    // Enqueue jobs
    const now = new Date();
    const jobs = subscribers.map((sub: any) => {
        let delay = 0;
        if (data.useOptimalTime && sub.optimalSendHour !== null) {
            const nextTime = getNextSendTime(sub.optimalSendHour, now);
            delay = Math.max(0, nextTime.getTime() - now.getTime());
        }

        return {
            name: "send-email",
            data: {
                campaignId,
                subscriberId: sub.id,
                subscriberEmail: sub.email,
                subscriberName: sub.name,
                listId: sub.listId,
            },
            opts: delay > 0 ? { delay } : undefined
        };
    });

    // Batch insert into Redis for speed
    await emailQueue.addBulk(jobs);

    revalidatePath("/dashboard/campaigns");
    return { jobCount: jobs.length, warmupTruncated };
}

export async function scheduleCampaign(campaignId: string, data: {
    includedLists: string[];
    excludedLists: string[];
    includedSegments: string[];
    excludedSegments: string[];
    scheduledAt: string; // ISO string from the client
}) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const scheduledDate = new Date(data.scheduledAt);
    if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
        throw new Error("Scheduled time must be in the future");
    }

    const whereCondition: any = currentUserRole === "admin"
        ? { id: campaignId }
        : { id: campaignId, brand: { users: { some: { id: userId } } } };

    const campaign = await prisma.campaign.findFirst({ where: whereCondition });
    if (!campaign || campaign.status !== "draft") throw new Error("Invalid campaign");

    // Persist the list/segment selections and mark as scheduled
    await prisma.campaign.update({
        where: { id: campaignId },
        data: {
            status: "scheduled",
            scheduledAt: scheduledDate,
            includedLists: {
                set: data.includedLists.map(id => ({ id })),
            },
            excludedLists: {
                set: data.excludedLists.map(id => ({ id })),
            },
            includedSegments: {
                set: data.includedSegments.map(id => ({ id })),
            },
            excludedSegments: {
                set: data.excludedSegments.map(id => ({ id })),
            },
        },
    });

    revalidatePath("/dashboard/campaigns");
    return { scheduledAt: scheduledDate.toISOString() };
}

export async function unscheduleCampaign(campaignId: string) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const whereCondition: any = currentUserRole === "admin"
        ? { id: campaignId }
        : { id: campaignId, brand: { users: { some: { id: userId } } } };

    const campaign = await prisma.campaign.findFirst({ where: whereCondition });
    if (!campaign || campaign.status !== "scheduled") throw new Error("Campaign is not scheduled");

    await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "draft", scheduledAt: null },
    });

    revalidatePath("/dashboard/campaigns");
}

export async function cancelCampaign(campaignId: string) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const whereCondition: any = currentUserRole === 'admin'
        ? { id: campaignId }
        : { id: campaignId, brand: { users: { some: { id: userId } } } };

    const campaign = await prisma.campaign.findFirst({
        where: whereCondition
    });

    if (!campaign || campaign.status !== 'sending') {
        throw new Error("Invalid campaign or not currently sending");
    }

    await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "cancelled" }
    });

    // Best-effort: remove queued/delayed jobs from Redis so they don't consume
    // worker capacity. The worker also skips jobs for non-sending campaigns.
    await drainCampaignJobs(campaignId);

    revalidatePath("/dashboard/campaigns");
}
