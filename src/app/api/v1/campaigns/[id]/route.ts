import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/app/api/v1/_auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
    const authError = await requireApiKey(req);
    if (authError) return authError;

    const { id } = await params;

    const campaign = await prisma.campaign.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            subject: true,
            status: true,
            brandId: true,
            scheduledAt: true,
            sentAt: true,
            createdAt: true,
            sends: {
                select: { status: true, openedAt: true, clickedAt: true },
            },
            clicks: {
                select: { url: true, clickedAt: true },
            },
        },
    });

    if (!campaign) {
        return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    const total = campaign.sends.length;
    const sent = campaign.sends.filter(s => s.status === "sent").length;
    const opened = campaign.sends.filter(s => s.openedAt !== null).length;
    const clicked = campaign.sends.filter(s => s.clickedAt !== null).length;
    const bounced = campaign.sends.filter(s => s.status === "bounced").length;
    const complained = campaign.sends.filter(s => s.status === "complained").length;

    return NextResponse.json({
        data: {
            id: campaign.id,
            name: campaign.name,
            subject: campaign.subject,
            status: campaign.status,
            brandId: campaign.brandId,
            scheduledAt: campaign.scheduledAt,
            sentAt: campaign.sentAt,
            createdAt: campaign.createdAt,
            stats: {
                total,
                sent,
                opened,
                clicked,
                bounced,
                complained,
                openRate: sent > 0 ? Math.round((opened / sent) * 10000) / 100 : 0,
                clickRate: sent > 0 ? Math.round((clicked / sent) * 10000) / 100 : 0,
                bounceRate: sent > 0 ? Math.round((bounced / sent) * 10000) / 100 : 0,
            },
        },
    });
}
