import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispatchWebhooks } from "@/lib/webhooks";
import { computeOptimalHour } from "@/lib/send-time";

// 1x1 transparent GIF pixel
const TRACKING_PIXEL = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
);

export async function GET(req: NextRequest) {
    const campaignId = req.nextUrl.searchParams.get("cid");
    const email = req.nextUrl.searchParams.get("email");

    if (campaignId && email) {
        try {
            const updated = await (prisma as any).campaignSend.updateMany({
                where: {
                    campaignId,
                    subscriberEmail: email,
                    openedAt: null
                },
                data: { openedAt: new Date() }
            });

            if (updated.count > 0) {
                // Get brandId for webhooks
                const campaign = await prisma.campaign.findUnique({
                    where: { id: campaignId },
                    select: { brandId: true },
                });

                // Dispatch webhook
                dispatchWebhooks("open", { email, campaignId }, campaign?.brandId);

                // Update optimal send hour
                try {
                    const allOpens = await (prisma as any).campaignSend.findMany({
                        where: { subscriberEmail: email, openedAt: { not: null } },
                        select: { openedAt: true },
                    });
                    const timestamps = allOpens.map((o: any) => new Date(o.openedAt));
                    const optimalHour = computeOptimalHour(timestamps);
                    if (optimalHour !== null) {
                        await (prisma as any).subscriber.updateMany({
                            where: { email },
                            data: { optimalSendHour: optimalHour },
                        });
                    }
                } catch (e) {
                    // Non-critical
                }
            }
        } catch (e) {
            console.error("Error recording open:", e);
        }
    }

    return new NextResponse(TRACKING_PIXEL, {
        status: 200,
        headers: {
            "Content-Type": "image/gif",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    });
}
