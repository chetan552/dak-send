"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Parser from "rss-parser";
import { emailQueue } from "@/lib/queue";
import { getWarmupRemaining } from "@/lib/warmup";
import { safeOriginUrl } from "@/lib/safe-url";

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
const DEFAULT_RSS_SUBJECT = "[RssTitle]";

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
    const autoSend = formData.get("autoSend") === "1";
    const digestSubject = (formData.get("digestSubject") as string) || null;
    const digestWrapperHtml = (formData.get("digestWrapperHtml") as string) || null;
    const subject = (formData.get("subject") as string) || null;
    // In digest mode templateHtml is the per-item block; in non-digest it's the full email.
    const templateHtml = (formData.get("templateHtml") as string) || null;

    if (!name || !url || !brandId) throw new Error("Missing required fields");

    // Block SSRF before any network fetch
    const safeUrl = safeOriginUrl(url);

    // Validate feed URL
    try {
        await parser.parseURL(safeUrl.toString());
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
            subject,
            templateHtml,
            digestMode,
            autoSend,
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
    const subject = formData.get("subject") as string | null;
    const templateHtml = formData.get("templateHtml") as string;
    const digestMode = formData.get("digestMode") === "1";
    const autoSend = formData.get("autoSend") === "1";
    const digestSubject = formData.get("digestSubject") as string | null;
    const digestWrapperHtml = formData.get("digestWrapperHtml") as string | null;

    const data: any = {};
    if (name) data.name = name;
    if (url && url !== feed.url) {
        const safeUrl = safeOriginUrl(url);
        try { await parser.parseURL(safeUrl.toString()); } catch { throw new Error("Invalid RSS feed URL"); }
        data.url = safeUrl.toString();
    }
    if (listIdsStr !== null && listIdsStr !== undefined) {
        data.listIds = listIdsStr.split(",").filter(Boolean);
    }
    if (templateHtml !== null && templateHtml !== undefined) {
        data.templateHtml = templateHtml || null;
    }
    data.subject = subject || null;
    data.digestMode = digestMode;
    data.autoSend = autoSend;
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
    description?: string; // raw <description> field (may contain HTML)
    creator?: string;
    author?: string;
    pubDate?: string;
    isoDate?: string;
    enclosure?: { url?: string };
}): string {
    const dateStr = item.pubDate
        ? new Date(item.pubDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
        : (item.isoDate ? new Date(item.isoDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "");

    // [RssContent] — plain-text excerpt (first 200 chars, strips HTML).
    // Falls back to description if neither contentSnippet nor content:encoded is present.
    const rawSnippet = item.contentSnippet || item.content || item.description || "";
    const snippet = rawSnippet.replace(/<[^>]*>/g, "").slice(0, 200).trim();

    // [RssDescription] — HTML from the <description> field, sanitized to strip
    // dangerous tags (script, iframe, form, object, embed) and event-handler
    // attributes before embedding in email templates.
    const rawDescription = item.description || item.content || "";
    const fullDescription = rawDescription
        .replace(/<(script|iframe|object|embed|form|base|meta|link)[^>]*>[\s\S]*?<\/\1>/gi, "")
        .replace(/<(script|iframe|object|embed|form|base|meta|link)(\s[^>]*)?\/?>/gi, "")
        .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "")
        .replace(/\s+href\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, "");

    return template
        .replace(/\[RssTitle\]/gi, item.title || "Untitled")
        .replace(/\[RssLink\]/gi, item.link || "#")
        .replace(/\[RssContent\]/gi, snippet)
        .replace(/\[RssDescription\]/gi, fullDescription)
        .replace(/\[RssAuthor\]/gi, item.creator || (item as any).author || "")
        .replace(/\[RssDate\]/gi, dateStr)
        .replace(/\[RssThumbnail\]/gi, item.enclosure?.url || "");
}

/** Render RSS merge tags into a subject line and strip CRLF header injection. */
function renderItemSubject(template: string, item: Parameters<typeof renderItemBlock>[1], feedName: string): string {
    return renderItemBlock(template, item)
        .replace(/\[RssFeedName\]/gi, feedName)
        .replace(/<[^>]*>/g, "")
        .replace(/[\r\n]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/** Internal helper: dispatch a just-created draft campaign to the given lists, without a user session. */
async function autoDispatchCampaign(campaignId: string, brandId: string, listIds: string[]) {
    // Gather subscribed emails across all target lists
    const listSubs = await prisma.subscriber.findMany({
        where: { listId: { in: listIds }, status: "subscribed" },
        select: { id: true, email: true, name: true, listId: true },
    });

    if (listSubs.length === 0) return;

    // Remove suppressed addresses (global + brand-scoped)
    const suppressed = await prisma.suppressionList.findMany({
        where: {
            email: { in: listSubs.map(s => s.email) },
            OR: [{ brandId: null }, { brandId }],
        },
        select: { email: true },
    });
    const suppressedSet = new Set(suppressed.map(s => s.email));

    let subscribers = listSubs.filter(s => !suppressedSet.has(s.email));

    // Deduplicate by email (subscriber may appear in multiple lists)
    const seen = new Set<string>();
    subscribers = subscribers.filter(s => {
        if (seen.has(s.email)) return false;
        seen.add(s.email);
        return true;
    });

    // Apply domain warmup limit
    const warmupRemaining = await getWarmupRemaining(brandId);
    if (warmupRemaining !== -1 && subscribers.length > warmupRemaining) {
        subscribers = subscribers.slice(0, warmupRemaining);
    }

    if (subscribers.length === 0) return;

    await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "sending", trackOpens: true, trackClicks: true },
    });

    await emailQueue.addBulk(
        subscribers.map(sub => ({
            name: "send-email",
            data: {
                campaignId,
                subscriberId: sub.id,
                subscriberEmail: sub.email,
                subscriberName: sub.name,
                listId: sub.listId,
            },
        }))
    );
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

            // Re-validate at fetch time: defense against DNS rebinding and against feeds
            // created before SSRF checks were added.
            let safeFeedUrl: URL;
            try {
                safeFeedUrl = safeOriginUrl(feed.url);
            } catch (err) {
                console.warn(`Skipping RSS feed ${feed.id} — unsafe URL:`, err instanceof Error ? err.message : err);
                continue;
            }

            const parsedFeed = await parser.parseURL(safeFeedUrl.toString());

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
            // Sanitize feed name to prevent email header injection (strip newlines/CRLFs)
            const safeFeedName = feed.name.replace(/[\r\n]/g, " ");

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
                    .replace(/\[RssFeedName\]/gi, safeFeedName);

                const subject = subjectTemplate
                    .replace(/\[RssDate\]/gi, today)
                    .replace(/\[RssCount\]/gi, String(newItems.length))
                    .replace(/\[RssFeedName\]/gi, safeFeedName);

                const campaign = await prisma.campaign.create({
                    data: {
                        name: `[Digest] ${safeFeedName} — ${today}`,
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

                if (feed.autoSend && feed.listIds.length > 0) {
                    await autoDispatchCampaign(campaign.id, feed.brandId, feed.listIds);
                }

                console.log(`Created digest campaign from RSS feed "${feed.name}" with ${newItems.length} item(s)${feed.autoSend ? " (auto-sending)" : ""}`);
            } else {
                // ── PER-ITEM MODE (original behaviour): one campaign per new item ──
                // Only create a campaign for the single newest item to avoid flooding
                const template = feed.templateHtml || DEFAULT_RSS_TEMPLATE;
                const subjectTemplate = feed.subject || DEFAULT_RSS_SUBJECT;
                const htmlContent = renderItemBlock(template, newestItem);
                const subject = renderItemSubject(subjectTemplate, newestItem, safeFeedName)
                    || newestItem.title
                    || `New from ${safeFeedName}`;

                const campaign = await prisma.campaign.create({
                    data: {
                        name: `[RSS] ${newestItem.title || safeFeedName}`,
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

                if (feed.autoSend && feed.listIds.length > 0) {
                    await autoDispatchCampaign(campaign.id, feed.brandId, feed.listIds);
                }

                console.log(`Created campaign from RSS feed "${feed.name}" for item: ${newestItem.title}${feed.autoSend ? " (auto-sending)" : ""}`);
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
