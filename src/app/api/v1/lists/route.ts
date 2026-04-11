import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/app/api/v1/_auth";

export async function GET(req: NextRequest) {
    const authError = await requireApiKey(req);
    if (authError) return authError;

    const brandId = req.nextUrl.searchParams.get("brandId") ?? undefined;

    const lists = await prisma.list.findMany({
        where: brandId ? { brandId } : undefined,
        select: {
            id: true,
            name: true,
            brandId: true,
            optIn: true,
            _count: { select: { subscribers: { where: { status: "subscribed" } } } },
            createdAt: true,
        },
        orderBy: { name: "asc" },
    });

    return NextResponse.json({
        data: lists.map(l => ({
            id: l.id,
            name: l.name,
            brandId: l.brandId,
            optIn: l.optIn,
            subscriberCount: l._count.subscribers,
            createdAt: l.createdAt,
        })),
    });
}
