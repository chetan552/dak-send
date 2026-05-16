"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getCampaignStats(campaignId: string) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const whereCondition: any = currentUserRole === 'admin'
        ? { id: campaignId }
        : { id: campaignId, brand: { users: { some: { id: userId } } } };

    const campaign = await prisma.campaign.findFirst({
        where: whereCondition,
    });

    if (!campaign) throw new Error("Campaign not found or unauthorized");

    const totalSent = await prisma.campaignSend.count({
        where: { campaignId, status: "sent" }
    });

    const totalFailed = await prisma.campaignSend.count({
        where: { campaignId, status: "failed" }
    });

    const totalBounced = await prisma.campaignSend.count({
        where: { campaignId, status: "bounced" }
    });

    const totalComplained = await prisma.campaignSend.count({
        where: { campaignId, status: "complained" }
    });

    const totalOpened = await prisma.campaignSend.count({
        where: { campaignId, openedAt: { not: null } }
    });

    const totalClicked = await prisma.campaignSend.count({
        where: { campaignId, clickedAt: { not: null } }
    });

    const totalQueued = await prisma.campaignSend.count({
        where: { campaignId, status: "queued" }
    });

    const total = totalSent + totalFailed + totalBounced + totalComplained + totalQueued;

    return {
        total,
        totalSent,
        totalFailed,
        totalBounced,
        totalComplained,
        totalOpened,
        totalClicked,
        totalQueued,
        openRate: totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : "0.0",
        clickRate: totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : "0.0",
        ctor: totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(1) : "0.0",
        bounceRate: total > 0 ? ((totalBounced / total) * 100).toFixed(1) : "0.0",
        complaintRate: total > 0 ? ((totalComplained / total) * 100).toFixed(1) : "0.0",
    };
}


export async function getListStats(listId: string) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const whereCondition: any = currentUserRole === 'admin'
        ? { id: listId }
        : { id: listId, brand: { users: { some: { id: userId } } } };

    const list = await prisma.list.findFirst({ where: whereCondition });
    if (!list) throw new Error("List not found or unauthorized");

    const totalSubscribers = await prisma.subscriber.count({ where: { listId, status: "subscribed" } });
    const totalUnsubscribed = await prisma.subscriber.count({ where: { listId, status: "unsubscribed" } });
    const totalBounced = await prisma.subscriber.count({ where: { listId, status: "bounced" } });
    const totalComplained = await prisma.subscriber.count({ where: { listId, status: "complained" } });
    const totalPending = await prisma.subscriber.count({ where: { listId, status: "pending" } });

    return {
        totalSubscribers,
        totalUnsubscribed,
        totalBounced,
        totalComplained,
        totalPending,
        total: totalSubscribers + totalUnsubscribed + totalBounced + totalComplained + totalPending,
    };
}
