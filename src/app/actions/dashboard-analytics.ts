"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Get high-level overview stats across all campaigns the user has access to
export async function getOverviewStats() {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const role = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const campaignWhere: any = role === "admin"
        ? { status: "sent" }
        : { status: "sent", brand: { users: { some: { id: userId } } } };

    const campaigns = await prisma.campaign.findMany({
        where: campaignWhere,
        select: { id: true },
    });

    const campaignIds = campaigns.map((c) => c.id);

    if (campaignIds.length === 0) {
        return {
            totalCampaigns: 0,
            totalSent: 0,
            totalOpened: 0,
            totalClicked: 0,
            totalBounced: 0,
            totalComplaints: 0,
            avgOpenRate: "0.0",
            avgClickRate: "0.0",
            avgBounceRate: "0.0",
        };
    }

    const totalSent = await prisma.campaignSend.count({
        where: { campaignId: { in: campaignIds }, status: "sent" },
    });
    const totalOpened = await prisma.campaignSend.count({
        where: { campaignId: { in: campaignIds }, openedAt: { not: null } },
    });
    const totalClicked = await prisma.campaignSend.count({
        where: { campaignId: { in: campaignIds }, clickedAt: { not: null } },
    });
    const totalBounced = await prisma.campaignSend.count({
        where: { campaignId: { in: campaignIds }, status: "bounced" },
    });
    const totalComplaints = await prisma.campaignSend.count({
        where: { campaignId: { in: campaignIds }, status: "complained" },
    });

    return {
        totalCampaigns: campaignIds.length,
        totalSent,
        totalOpened,
        totalClicked,
        totalBounced,
        totalComplaints,
        avgOpenRate: totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : "0.0",
        avgClickRate: totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : "0.0",
        avgBounceRate: totalSent > 0 ? ((totalBounced / totalSent) * 100).toFixed(1) : "0.0",
    };
}

// Get per-campaign metrics for the comparison table
export async function getCampaignPerformanceTable() {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const role = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const campaignWhere: any = role === "admin"
        ? { status: "sent" }
        : { status: "sent", brand: { users: { some: { id: userId } } } };

    const campaigns = await prisma.campaign.findMany({
        where: campaignWhere,
        include: {
            brand: { select: { name: true } },
            _count: { select: { sends: true } },
        },
        orderBy: { sentAt: "desc" },
    });

    const results = await Promise.all(
        campaigns.map(async (campaign) => {
            const sent = await prisma.campaignSend.count({
                where: { campaignId: campaign.id, status: "sent" },
            });
            const opened = await prisma.campaignSend.count({
                where: { campaignId: campaign.id, openedAt: { not: null } },
            });
            const clicked = await prisma.campaignSend.count({
                where: { campaignId: campaign.id, clickedAt: { not: null } },
            });
            const bounced = await prisma.campaignSend.count({
                where: { campaignId: campaign.id, status: "bounced" },
            });

            return {
                id: campaign.id,
                name: campaign.name,
                subject: campaign.subject,
                brandName: campaign.brand.name,
                sentAt: campaign.sentAt?.toISOString() || campaign.updatedAt.toISOString(),
                totalRecipients: campaign._count.sends,
                sent,
                opened,
                clicked,
                bounced,
                openRate: sent > 0 ? parseFloat(((opened / sent) * 100).toFixed(1)) : 0,
                clickRate: sent > 0 ? parseFloat(((clicked / sent) * 100).toFixed(1)) : 0,
                bounceRate: sent > 0 ? parseFloat(((bounced / sent) * 100).toFixed(1)) : 0,
            };
        })
    );

    return results;
}

// Get daily activity data for area chart (last N days)
export async function getActivityOverTime(days: number = 30) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const role = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const campaignWhere: any = role === "admin"
        ? { status: "sent" }
        : { status: "sent", brand: { users: { some: { id: userId } } } };

    const campaigns = await prisma.campaign.findMany({
        where: campaignWhere,
        select: { id: true },
    });

    const campaignIds = campaigns.map((c) => c.id);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get all sends within the date range
    const sends = await prisma.campaignSend.findMany({
        where: {
            campaignId: { in: campaignIds },
            createdAt: { gte: startDate },
        },
        select: {
            sentAt: true,
            openedAt: true,
            clickedAt: true,
            status: true,
        },
    });

    // Build day-by-day data
    const dayMap: Record<string, { date: string; sends: number; opens: number; clicks: number }> = {};

    for (let i = 0; i <= days; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().split("T")[0];
        dayMap[key] = { date: key, sends: 0, opens: 0, clicks: 0 };
    }

    for (const send of sends) {
        if (send.sentAt) {
            const key = new Date(send.sentAt).toISOString().split("T")[0];
            if (dayMap[key]) dayMap[key].sends++;
        }
        if (send.openedAt) {
            const key = new Date(send.openedAt).toISOString().split("T")[0];
            if (dayMap[key]) dayMap[key].opens++;
        }
        if (send.clickedAt) {
            const key = new Date(send.clickedAt).toISOString().split("T")[0];
            if (dayMap[key]) dayMap[key].clicks++;
        }
    }

    return Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
}

// Get top clicked links for a specific campaign
export async function getTopLinks(campaignId: string) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const role = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const campaignWhere: any = role === "admin"
        ? { id: campaignId }
        : { id: campaignId, brand: { users: { some: { id: userId } } } };

    const campaign = await prisma.campaign.findFirst({ where: campaignWhere });
    if (!campaign) throw new Error("Campaign not found");

    const clicks = await prisma.campaignClick.findMany({
        where: { campaignId },
        select: { url: true, subscriberEmail: true },
    });

    // Aggregate by URL
    const urlMap: Record<string, { url: string; totalClicks: number; uniqueClickers: Set<string> }> = {};

    for (const click of clicks) {
        if (!urlMap[click.url]) {
            urlMap[click.url] = { url: click.url, totalClicks: 0, uniqueClickers: new Set() };
        }
        urlMap[click.url].totalClicks++;
        urlMap[click.url].uniqueClickers.add(click.subscriberEmail);
    }

    return Object.values(urlMap)
        .map((entry) => ({
            url: entry.url,
            totalClicks: entry.totalClicks,
            uniqueClicks: entry.uniqueClickers.size,
        }))
        .sort((a, b) => b.totalClicks - a.totalClicks)
        .slice(0, 20);
}

// Get open/click activity timeline for a specific campaign
export async function getCampaignTimeline(campaignId: string) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const role = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const campaignWhere: any = role === "admin"
        ? { id: campaignId }
        : { id: campaignId, brand: { users: { some: { id: userId } } } };

    const campaign = await prisma.campaign.findFirst({ where: campaignWhere });
    if (!campaign) throw new Error("Campaign not found");

    const sends = await prisma.campaignSend.findMany({
        where: { campaignId },
        select: { openedAt: true, clickedAt: true, sentAt: true },
    });

    // Group by hour for the first 72 hours, then by day
    const hourMap: Record<string, { label: string; opens: number; clicks: number }> = {};

    for (const send of sends) {
        if (send.openedAt) {
            const d = new Date(send.openedAt);
            const key = `${d.toISOString().split("T")[0]} ${d.getHours().toString().padStart(2, "0")}:00`;
            if (!hourMap[key]) hourMap[key] = { label: key, opens: 0, clicks: 0 };
            hourMap[key].opens++;
        }
        if (send.clickedAt) {
            const d = new Date(send.clickedAt);
            const key = `${d.toISOString().split("T")[0]} ${d.getHours().toString().padStart(2, "0")}:00`;
            if (!hourMap[key]) hourMap[key] = { label: key, opens: 0, clicks: 0 };
            hourMap[key].clicks++;
        }
    }

    return Object.values(hourMap).sort((a, b) => a.label.localeCompare(b.label));
}
