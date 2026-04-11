import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispatchWebhooks } from "@/lib/webhooks";

export async function GET(req: NextRequest) {
    const campaignId = req.nextUrl.searchParams.get("cid");
    const email = req.nextUrl.searchParams.get("email");
    const url = req.nextUrl.searchParams.get("url");

    if (!url) {
        return NextResponse.json({ error: "Missing URL" }, { status: 400 });
    }

    if (campaignId && email) {
        try {
            await prisma.campaignSend.updateMany({
                where: {
                    campaignId,
                    subscriberEmail: email,
                    clickedAt: null
                },
                data: { clickedAt: new Date() }
            });

            // Record individual click for URL-level analytics
            await prisma.campaignClick.create({
                data: {
                    campaignId,
                    subscriberEmail: email,
                    url,
                }
            });

            // Dispatch click webhook
            const campaign = await prisma.campaign.findUnique({
                where: { id: campaignId },
                select: { brandId: true },
            });
            dispatchWebhooks("click", { email, campaignId, url }, campaign?.brandId);
        } catch (e) {
            console.error("Error recording click:", e);
        }
    }

    return NextResponse.redirect(url, { status: 302 });
}
