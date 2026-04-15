import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emailQueue } from "@/lib/queue";
import { translateSegmentQuery } from "@/lib/segment-query";
import { getWarmupRemaining } from "@/lib/warmup";
import { markCronLastRun } from "@/app/actions/cron-settings";
import { verifyCronSecret } from "../_auth";

export async function GET(req: NextRequest) {
    const authError = verifyCronSecret(req);
    if (authError) return authError;

    try {
        // Find campaigns that are scheduled and due
        const now = new Date();
        const dueCampaigns = await prisma.campaign.findMany({
            where: {
                status: "scheduled",
                scheduledAt: { lte: now },
            },
            include: {
                includedLists: true,
                excludedLists: true,
                includedSegments: true,
                excludedSegments: true,
            },
        });

        let dispatched = 0;

        for (const campaign of dueCampaigns) {
            try {
                // Gather included subscribers
                const allIncludedEmails = new Set<string>();

                if (campaign.includedLists.length > 0) {
                    const listSubs = await prisma.subscriber.findMany({
                        where: {
                            listId: { in: campaign.includedLists.map(l => l.id) },
                            status: "subscribed",
                        },
                        select: { email: true },
                    });
                    listSubs.forEach(s => allIncludedEmails.add(s.email));
                }

                for (const seg of campaign.includedSegments) {
                    try {
                        const segment = await prisma.segment.findUnique({ where: { id: seg.id } });
                        if (segment?.query) {
                            const translatedWhere = translateSegmentQuery(JSON.parse(segment.query));
                            const subs = await prisma.subscriber.findMany({
                                where: { ...translatedWhere, listId: segment.listId, status: "subscribed" },
                                select: { email: true },
                            });
                            subs.forEach(s => allIncludedEmails.add(s.email));
                        }
                    } catch (e) { console.warn("Included segment parsing error:", e); }
                }

                // Gather excluded subscribers
                const allExcludedEmails = new Set<string>();

                if (campaign.excludedLists.length > 0) {
                    const excSubs = await prisma.subscriber.findMany({
                        where: { listId: { in: campaign.excludedLists.map(l => l.id) } },
                        select: { email: true },
                    });
                    excSubs.forEach(s => allExcludedEmails.add(s.email));
                }

                for (const seg of campaign.excludedSegments) {
                    try {
                        const segment = await prisma.segment.findUnique({ where: { id: seg.id } });
                        if (segment?.query) {
                            const translatedWhere = translateSegmentQuery(JSON.parse(segment.query));
                            const subs = await prisma.subscriber.findMany({
                                where: { ...translatedWhere, listId: segment.listId },
                                select: { email: true },
                            });
                            subs.forEach(s => allExcludedEmails.add(s.email));
                        }
                    } catch (e) { console.warn("Excluded segment parsing error:", e); }
                }

                // Final list
                const finalEmails = Array.from(allIncludedEmails).filter(e => !allExcludedEmails.has(e));

                if (finalEmails.length === 0) {
                    await prisma.campaign.update({
                        where: { id: campaign.id },
                        data: { status: "sent" },
                    });
                    continue;
                }

                let subscribers = await prisma.subscriber.findMany({
                    where: { email: { in: finalEmails }, status: "subscribed" },
                    distinct: ["email"],
                    select: { id: true, email: true, name: true, listId: true },
                });

                // Enforce domain warmup daily limit
                const warmupRemaining = await getWarmupRemaining(campaign.brandId);
                if (warmupRemaining !== -1 && subscribers.length > warmupRemaining) {
                    console.log(`Warmup cap: scheduled campaign "${campaign.name}" truncated from ${subscribers.length} to ${warmupRemaining}`);
                    subscribers = subscribers.slice(0, warmupRemaining);
                }

                if (subscribers.length === 0) {
                    console.log(`Warmup daily limit reached for campaign "${campaign.name}", skipping until tomorrow`);
                    continue;
                }

                // Update status to sending
                await prisma.campaign.update({
                    where: { id: campaign.id },
                    data: { status: "sending" },
                });

                // Enqueue jobs
                const jobs = subscribers.map(sub => ({
                    name: "send-email",
                    data: {
                        campaignId: campaign.id,
                        subscriberId: sub.id,
                        subscriberEmail: sub.email,
                        subscriberName: sub.name,
                        listId: sub.listId,
                    },
                }));

                await emailQueue.addBulk(jobs);
                dispatched++;

                console.log(`Dispatched scheduled campaign "${campaign.name}" with ${jobs.length} emails`);
            } catch (err) {
                console.error(`Error dispatching scheduled campaign ${campaign.id}:`, err);
            }
        }

        await markCronLastRun("scheduled").catch(() => {});
        return NextResponse.json({
            success: true,
            checked: dueCampaigns.length,
            dispatched,
        });
    } catch (error: any) {
        console.error("Scheduled send cron error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
