"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Automatically segment subscribers based on open/click engagement
export async function generateEngagementSegments(listId: string) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const currentUserRole = (session?.user as any)?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const whereCondition: any = currentUserRole === 'admin'
        ? { id: listId }
        : { id: listId, brand: { users: { some: { id: userId } } } };

    const list = await prisma.list.findFirst({ where: whereCondition });
    if (!list) throw new Error("List not found or unauthorized");

    // Get subscribers and their engagement across last 30 days
    const subscribers = await prisma.subscriber.findMany({
        where: { listId, status: "subscribed" },
        select: { id: true, email: true }
    });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get engagement stats per subscriber
    const engagement: { email: string; opens: number; clicks: number }[] = [];

    for (const sub of subscribers) {
        const opens = await (prisma as any).campaignSend.count({
            where: {
                subscriberEmail: sub.email,
                openedAt: { not: null, gte: thirtyDaysAgo }
            }
        });

        const clicks = await (prisma as any).campaignSend.count({
            where: {
                subscriberEmail: sub.email,
                clickedAt: { not: null, gte: thirtyDaysAgo }
            }
        });

        engagement.push({ email: sub.email, opens, clicks });
    }

    // Create auto-segments
    const segments = [
        {
            name: "🔥 Highly Engaged (30d)",
            description: "Subscribers who opened OR clicked in the last 30 days",
            query: JSON.stringify({
                email: { in: engagement.filter(e => e.opens > 0 || e.clicks > 0).map(e => e.email) }
            })
        },
        {
            name: "⚠️ At Risk (30d)",
            description: "Subscribers who haven't opened any email in 30 days",
            query: JSON.stringify({
                email: { in: engagement.filter(e => e.opens === 0 && e.clicks === 0).map(e => e.email) }
            })
        },
        {
            name: "🎯 Clickers (30d)",
            description: "Subscribers who clicked links in the last 30 days",
            query: JSON.stringify({
                email: { in: engagement.filter(e => e.clicks > 0).map(e => e.email) }
            })
        }
    ];

    for (const seg of segments) {
        // Upsert by name + listId to avoid duplicates
        const existing = await (prisma as any).segment.findFirst({
            where: { listId, name: seg.name }
        });

        if (existing) {
            await (prisma as any).segment.update({
                where: { id: existing.id },
                data: { query: seg.query, description: seg.description }
            });
        } else {
            await (prisma as any).segment.create({
                data: { ...seg, listId }
            });
        }
    }

    revalidatePath(`/dashboard/lists/${listId}`);
    return { success: true, segmentsCreated: segments.length };
}
