import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/app/api/v1/_auth";

export async function GET(req: NextRequest) {
    const authError = await requireApiKey(req);
    if (authError) return authError;

    const { searchParams } = req.nextUrl;
    const brandId = searchParams.get("brandId") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const where: Record<string, unknown> = {};
    if (brandId) where.brandId = brandId;
    if (status) where.status = status;

    const [campaigns, total] = await Promise.all([
        prisma.campaign.findMany({
            where,
            select: {
                id: true,
                name: true,
                subject: true,
                status: true,
                brandId: true,
                scheduledAt: true,
                sentAt: true,
                createdAt: true,
                _count: { select: { sends: true } },
            },
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: offset,
        }),
        prisma.campaign.count({ where }),
    ]);

    return NextResponse.json({
        data: campaigns.map(c => ({
            id: c.id,
            name: c.name,
            subject: c.subject,
            status: c.status,
            brandId: c.brandId,
            scheduledAt: c.scheduledAt,
            sentAt: c.sentAt,
            createdAt: c.createdAt,
            totalSends: c._count.sends,
        })),
        total,
        limit,
        offset,
    });
}
