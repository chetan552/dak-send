import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispatchWebhooks } from "@/lib/webhooks";
import { verifyToken } from "@/lib/sign-url";

// Tracking endpoints must never be cached — each request is a unique event.
export const dynamic = "force-dynamic";

interface ClickToken {
    cid: string;
    e: string;  // subscriber email
    u: string;  // destination URL
}

async function recordClick(campaignId: string, email: string, url: string) {
    try {
        await prisma.campaignSend.updateMany({
            where: { campaignId, subscriberEmail: email, clickedAt: null },
            data: { clickedAt: new Date() },
        });
        await prisma.campaignClick.create({
            data: { campaignId, subscriberEmail: email, url },
        });
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            select: { brandId: true },
        });
        dispatchWebhooks("click", { email, campaignId, url }, campaign?.brandId);
    } catch (e) {
        console.error("Error recording click:", e);
    }
}

function isSafeRedirect(raw: string): boolean {
    try {
        const parsed = new URL(raw);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
}

export async function GET(req: NextRequest) {
    // Preferred path: HMAC-signed token issued at render time.
    const t = req.nextUrl.searchParams.get("t");
    if (t) {
        const claims = verifyToken<ClickToken>("click", t);
        if (!claims || !isSafeRedirect(claims.u)) {
            return NextResponse.json({ error: "Invalid token" }, { status: 400 });
        }
        await recordClick(claims.cid, claims.e, claims.u);
        return NextResponse.redirect(claims.u, { status: 302 });
    }

    // Legacy path (emails sent before signing was introduced): require that
    // a matching CampaignSend actually exists, so attackers can't construct
    // arbitrary redirect URLs — only URLs that came from a real campaign run.
    const campaignId = req.nextUrl.searchParams.get("cid");
    const email = req.nextUrl.searchParams.get("email");
    const url = req.nextUrl.searchParams.get("url");

    if (!campaignId || !email || !url) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }
    if (!isSafeRedirect(url)) {
        return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const send = await prisma.campaignSend.findFirst({
        where: { campaignId, subscriberEmail: email },
        select: { id: true },
    });
    if (!send) {
        return NextResponse.json({ error: "Unknown campaign/recipient" }, { status: 404 });
    }

    await recordClick(campaignId, email, url);
    return NextResponse.redirect(url, { status: 302 });
}
