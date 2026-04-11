import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/app/api/v1/_auth";

export async function GET(req: NextRequest) {
    const authError = await requireApiKey(req);
    if (authError) return authError;

    const brands = await prisma.brand.findMany({
        select: {
            id: true,
            name: true,
            fromEmail: true,
            fromName: true,
            createdAt: true,
        },
        orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: brands });
}
