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

// Default per-item block used inside a digest email. Renders one sermon/article card.
const DEFAULT_DIGEST_ITEM_TEMPLATE = `<div style="border-bottom:1px solid #e5e7eb;padding:24px 0;">
  <h3 style="margin:0 0 6px;font-size:18px;font-weight:600;">
    <a href="[RssLink]" style="color:#2563eb;text-decoration:none;">[RssTitle]</a>
  </h3>
  <p style="margin:0 0 10px;color:#6b7280;font-size:13px;">[RssAuthor] &mdash; [RssDate]</p>
  <p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:1.6;">[RssContent]</p>
  <a href="[RssLink]" style="display:inline-block;color:#fff;background:#2563eb;padding:8px 18px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">Watch Sermon →</a>
</div>`;

// Default outer wrapper for digest emails. [RssItems] is replaced with all rendered item blocks.
const DEFAULT_DIGEST_WRAPPER = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06);">
  <tr><td style="padding:32px 40px;background:#1e293b;">
    <h1 style="margin:0;font-size:22px;color:#fff;font-weight:700;">[RssFeedName]</h1>
    <p style="margin:8px 0 0;color:#94a3b8;font-size:14px;">[RssCount] new sermon(s) added &mdash; [RssDate]</p>
  </td></tr>
  <tr><td style="padding:32px 40px;">
    [RssItems]
    <div style="border-top:none;padding-top:8px;"></div>
  </td></tr>
  <tr><td style="padding:20px 40px;background:#fafafa;border-top:1px solid #eee;text-align:center;">
    <p style="color:#999;font-size:12px;margin:0;">[Unsubscribe]</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

const DEFAULT_DIGEST_SUBJECT = "New Sermons Added — [RssDate]";

export async function getRssFeeds() {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const whereCondition: any = currentUserRole === "admin"
        ? {}
        : { brand: { users: { some: { id: userId } } } };

    return await prisma.rssFeed.findMany({
        where: whereCondition,
        include: { brand: true },
        orderBy: { createdAt: "desc" },
    });
}

export async function createRssFeed(formData: FormData) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const name = formData.get("name") as string;
    const url = formData.get("url") as string;
    const brandId = formData.get("brandId") as string;
    const listIdsStr = formData.get("listIds") as string;
    const digestMode = formData.get("digestMode") === "1";
    const digestSubject = (formData.get("digestSubject") as string) || null;
    const digestWrapperHtml = (formData.get("digestWrapperHtml") as string) || null;
    // In digest mode templateHtml is the per-item block; in non-digest it's the full email.
    const templateHtml = (formData.get("templateHtml") as string) || null;

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

    await prisma.rssFeed.create({
        data: {
            name,
            url,
            brandId,
            listIds,
            templateHtml,
            digestMode,
            digestSubject,
            digestWrapperHtml,
        },
    });

    revalidatePath("/dashboard/rss");
    return { success: true };
}

export async function deleteRssFeed(feedId: string) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const whereCondition: any = currentUserRole === "admin"
        ? { id: feedId }
        : { id: feedId, brand: { users: { some: { id: userId } } } };

    const feed = await prisma.rssFeed.findFirst({ where: whereCondition });
    if (!feed) throw new Error("Feed not found or unauthorized");

    await prisma.rssFeed.delete({ where: { id: feedId } });

    revalidatePath("/dashboard/rss");
    return { success: true };
}

export async function toggleRssFeed(feedId: string) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const whereCondition: any = currentUserRole === "admin"
        ? { id: feedId }
        : { id: feedId, brand: { users: { some: { id: userId } } } };

    const feed = await prisma.rssFeed.findFirst({ where: whereCondition });
    if (!feed) throw new Error("Feed not found or unauthorized");

    await prisma.rssFeed.update({
        where: { id: feedId },
        data: { isActive: !feed.isActive },
    });

    revalidatePath("/dashboard/rss");
    return { success: true };
}

export async function updateRssFeed(feedId: string, formData: FormData) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const whereCondition: any = currentUserRole === "admin"
        ? { id: feedId }
        : { id: feedId, brand: { users: { some: { id: userId } } } };

    const feed = await prisma.rssFeed.findFirst({ where: whereCondition });
    if (!feed) throw new Error("Feed not found or unauthorized");

    const name = formData.get("name") as string;
    const url = formData.get("url") as string;
    const listIdsStr = formData.get("listIds") as string;
    const templateHtml = formData.get("templateHtml") as string;
    const digestMode = formData.get("digestMode") === "1";
    const digestSubject = formData.get("digestSubject") as string | null;
    const digestWrapperHtml = formData.get("digestWrapperHtml") as string | null;

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
    data.digestMode = digestMode;
    data.digestSubject = digestSubject || null;
    data.digestWrapperHtml = digestWrapperHtml || null;

    await prisma.rssFeed.update({ where: { id: feedId }, data });

    revalidatePath("/dashboard/rss");
    return { success: true };
}

/** Render item-level merge tags into an HTML block. */
function renderItemBlock(template: string, item: {
    title?: string;
    link?: string;
    contentSnippet?: string;
    content?: string;
    creator?: string;
    author?: string;
    pubDate?: string;
    isoDate?: string;
    enclosure?: { url?: string };
}): string {
    const dateStr = item.pubDate
        ? new Date(item.pubDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
        : (item.isoDate ? new Date(item.isoDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "");
    const snippet = (item.contentSnippet || item.content || "").slice(0, 200).trim();
    const cleanSnippet = snippet.replace(/<[^>]*>/g, "");

    return template
        .replace(/\[RssTitle\]/gi, item.title || "Untitled")
        .replace(/\[RssLink\]/gi, item.link || "#")
        .replace(/\[RssContent\]/gi, cleanSnippet)
        .replace(/\[RssAuthor\]/gi, item.creator || (item as any).author || "")
        .replace(/\[RssDate\]/gi, dateStr)
        .replace(/\[RssThumbnail\]/gi, item.enclosure?.url || "");
}

// Called by the cron endpoint to check all active feeds
export async function checkRssFeeds() {
    const feeds = await prisma.rssFeed.findMany({
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
                await prisma.rssFeed.update({ where: { id: feed.id }, data: { lastCheckedAt: new Date() } });
                continue;
            }

            // Collect new items: walk from newest until we hit the last-seen GUID
            const newItems: typeof parsedFeed.items = [];
            for (const item of parsedFeed.items) {
                const guid = item.guid || item.link || item.title || "";
                if (guid === feed.lastItemGuid) break;
                newItems.push(item);
            }

            if (newItems.length === 0) {
                await prisma.rssFeed.update({ where: { id: feed.id }, data: { lastCheckedAt: new Date() } });
                continue;
            }

            const newestItem = newItems[0];
            const newestGuid = newestItem.guid || newestItem.link || newestItem.title || "";
            const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

            if (feed.digestMode) {
                // ── DIGEST MODE: one email listing ALL new items ──────────────────
                const itemTemplate = feed.templateHtml || DEFAULT_DIGEST_ITEM_TEMPLATE;
                const wrapper = feed.digestWrapperHtml || DEFAULT_DIGEST_WRAPPER;
                const subjectTemplate = feed.digestSubject || DEFAULT_DIGEST_SUBJECT;

                const renderedItems = newItems.map((item) => renderItemBlock(itemTemplate, item)).join("\n");

                const htmlContent = wrapper
                    .replace(/\[RssItems\]/gi, renderedItems)
                    .replace(/\[RssDate\]/gi, today)
                    .replace(/\[RssCount\]/gi, String(newItems.length))
                    .replace(/\[RssFeedName\]/gi, feed.name);

                const subject = subjectTemplate
                    .replace(/\[RssDate\]/gi, today)
                    .replace(/\[RssCount\]/gi, String(newItems.length))
                    .replace(/\[RssFeedName\]/gi, feed.name);

                await prisma.campaign.create({
                    data: {
                        name: `[Digest] ${feed.name} — ${today}`,
                        subject,
                        htmlText: htmlContent,
                        brandId: feed.brandId,
                        status: "draft",
                        rssItemGuid: newestGuid,
                        includedLists: {
                            connect: feed.listIds.map((id: string) => ({ id })),
                        },
                    },
                });

                console.log(`Created digest campaign from RSS feed "${feed.name}" with ${newItems.length} item(s)`);
            } else {
                // ── PER-ITEM MODE (original behaviour): one campaign per new item ──
                // Only create a campaign for the single newest item to avoid flooding
                const template = feed.templateHtml || DEFAULT_RSS_TEMPLATE;
                const htmlContent = renderItemBlock(template, newestItem);

                await prisma.campaign.create({
                    data: {
                        name: `[RSS] ${newestItem.title || feed.name}`,
                        subject: newestItem.title || `New from ${feed.name}`,
                        htmlText: htmlContent,
                        brandId: feed.brandId,
                        status: "draft",
                        rssItemGuid: newestGuid,
                        includedLists: {
                            connect: feed.listIds.map((id: string) => ({ id })),
                        },
                    },
                });

                console.log(`Created campaign from RSS feed "${feed.name}" for item: ${newestItem.title}`);
            }

            await prisma.rssFeed.update({
                where: { id: feed.id },
                data: { lastCheckedAt: new Date(), lastItemGuid: newestGuid },
            });

            campaignsCreated++;
        } catch (err) {
            console.error(`Error processing RSS feed ${feed.id}:`, err);
        }
    }

    return { success: true, campaignsCreated };
}
