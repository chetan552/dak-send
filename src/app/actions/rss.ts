"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Parser from "rss-parser";

const parser = new Parser();

const DEFAULT_RSS_TEMPLATE = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.05);">
<tr><td style="padding:32px 40px;border-bottom:1px solid #eee;">
<h1 style="margin:0;font-size:24px;color:#111;">[RssTitle]</h1>
</td></tr>
<tr><td style="padding:32px 40px;">
<div style="color:#333;font-size:16px;line-height:1.7;">[RssContent]</div>
<p style="margin:24px 0 0;">
<a href="[RssLink]" style="background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Read Full Article →</a>
</p>
</td></tr>
<tr><td style="padding:20px 40px;background:#fafafa;border-top:1px solid #eee;text-align:center;">
<p style="color:#999;font-size:12px;margin:0;">[Unsubscribe]</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

export async function getRssFeeds() {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const currentUserRole = (session?.user as any)?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const whereCondition: any = currentUserRole === "admin"
        ? {}
        : { brand: { users: { some: { id: userId } } } };

    return await (prisma as any).rssFeed.findMany({
        where: whereCondition,
        include: { brand: true },
        orderBy: { createdAt: "desc" },
    });
}

export async function createRssFeed(formData: FormData) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const currentUserRole = (session?.user as any)?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const name = formData.get("name") as string;
    const url = formData.get("url") as string;
    const brandId = formData.get("brandId") as string;
    const listIdsStr = formData.get("listIds") as string;
    const templateHtml = (formData.get("templateHtml") as string) || DEFAULT_RSS_TEMPLATE;

    if (!name || !url || !brandId) throw new Error("Missing required fields");

    // Validate feed URL
    try {
        await parser.parseURL(url);
    } catch (e) {
        throw new Error("Invalid RSS feed URL — could not parse feed");
    }

    const whereCondition: any = currentUserRole === "admin"
        ? { id: brandId }
        : { id: brandId, users: { some: { id: userId } } };

    const brand = await prisma.brand.findFirst({ where: whereCondition });
    if (!brand) throw new Error("Brand not found or unauthorized");

    const listIds = listIdsStr ? listIdsStr.split(",").filter(Boolean) : [];

    await (prisma as any).rssFeed.create({
        data: {
            name,
            url,
            brandId,
            listIds,
            templateHtml,
        },
    });

    revalidatePath("/dashboard/rss");
    return { success: true };
}

export async function deleteRssFeed(feedId: string) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const currentUserRole = (session?.user as any)?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const whereCondition: any = currentUserRole === "admin"
        ? { id: feedId }
        : { id: feedId, brand: { users: { some: { id: userId } } } };

    const feed = await (prisma as any).rssFeed.findFirst({ where: whereCondition });
    if (!feed) throw new Error("Feed not found or unauthorized");

    await (prisma as any).rssFeed.delete({ where: { id: feedId } });

    revalidatePath("/dashboard/rss");
    return { success: true };
}

export async function toggleRssFeed(feedId: string) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const currentUserRole = (session?.user as any)?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const whereCondition: any = currentUserRole === "admin"
        ? { id: feedId }
        : { id: feedId, brand: { users: { some: { id: userId } } } };

    const feed = await (prisma as any).rssFeed.findFirst({ where: whereCondition });
    if (!feed) throw new Error("Feed not found or unauthorized");

    await (prisma as any).rssFeed.update({
        where: { id: feedId },
        data: { isActive: !feed.isActive },
    });

    revalidatePath("/dashboard/rss");
    return { success: true };
}

export async function updateRssFeed(feedId: string, formData: FormData) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const currentUserRole = (session?.user as any)?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const whereCondition: any = currentUserRole === "admin"
        ? { id: feedId }
        : { id: feedId, brand: { users: { some: { id: userId } } } };

    const feed = await (prisma as any).rssFeed.findFirst({ where: whereCondition });
    if (!feed) throw new Error("Feed not found or unauthorized");

    const name = formData.get("name") as string;
    const url = formData.get("url") as string;
    const listIdsStr = formData.get("listIds") as string;
    const templateHtml = formData.get("templateHtml") as string;

    const data: any = {};
    if (name) data.name = name;
    if (url && url !== feed.url) {
        try { await parser.parseURL(url); } catch { throw new Error("Invalid RSS feed URL"); }
        data.url = url;
    }
    if (listIdsStr !== null && listIdsStr !== undefined) {
        data.listIds = listIdsStr.split(",").filter(Boolean);
    }
    if (templateHtml !== null && templateHtml !== undefined) {
        data.templateHtml = templateHtml || null;
    }

    await (prisma as any).rssFeed.update({ where: { id: feedId }, data });

    revalidatePath("/dashboard/rss");
    return { success: true };
}

// Called by the cron endpoint to check all active feeds
export async function checkRssFeeds() {
    const feeds = await (prisma as any).rssFeed.findMany({
        where: { isActive: true },
        include: { brand: true },
    });

    let campaignsCreated = 0;

    for (const feed of feeds) {
        try {
            // Check polling interval
            if (feed.lastCheckedAt) {
                const minutesSinceCheck = (Date.now() - new Date(feed.lastCheckedAt).getTime()) / 60000;
                if (minutesSinceCheck < feed.pollInterval) continue;
            }

            const parsedFeed = await parser.parseURL(feed.url);

            if (!parsedFeed.items || parsedFeed.items.length === 0) {
                await (prisma as any).rssFeed.update({
                    where: { id: feed.id },
                    data: { lastCheckedAt: new Date() },
                });
                continue;
            }

            // Get new items since last check
            const latestItem = parsedFeed.items[0];
            const itemGuid = latestItem.guid || latestItem.link || latestItem.title || "";

            if (itemGuid === feed.lastItemGuid) {
                // No new items
                await (prisma as any).rssFeed.update({
                    where: { id: feed.id },
                    data: { lastCheckedAt: new Date() },
                });
                continue;
            }

            // Create campaign from the new RSS item
            const template = feed.templateHtml || DEFAULT_RSS_TEMPLATE;
            const htmlContent = template
                .replace(/\[RssTitle\]/gi, latestItem.title || "New Post")
                .replace(/\[RssContent\]/gi, latestItem.contentSnippet || latestItem.content || "")
                .replace(/\[RssLink\]/gi, latestItem.link || "#")
                .replace(/\[RssAuthor\]/gi, latestItem.creator || latestItem.author || "")
                .replace(/\[RssDate\]/gi, latestItem.pubDate || "");

            await prisma.campaign.create({
                data: {
                    name: `[RSS] ${latestItem.title || feed.name}`,
                    subject: latestItem.title || `New from ${feed.name}`,
                    htmlText: htmlContent,
                    brandId: feed.brandId,
                    status: "draft",
                    rssItemGuid: itemGuid,
                    includedLists: {
                        connect: feed.listIds.map((id: string) => ({ id })),
                    },
                },
            });

            // Update feed
            await (prisma as any).rssFeed.update({
                where: { id: feed.id },
                data: {
                    lastCheckedAt: new Date(),
                    lastItemGuid: itemGuid,
                },
            });

            campaignsCreated++;
            console.log(`Created campaign from RSS feed "${feed.name}" for item: ${latestItem.title}`);
        } catch (err) {
            console.error(`Error processing RSS feed ${feed.id}:`, err);
        }
    }

    return { success: true, campaignsCreated };
}
