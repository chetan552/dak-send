import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/app/api/v1/_auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/v1/tags?brandId=...
 * List all tags for a brand.
 *
 * POST /api/v1/tags
 * Body: { brandId, name }
 * Create a tag.
 *
 * DELETE /api/v1/tags?id=...
 * Delete a tag by id.
 */

export async function GET(req: NextRequest) {
    const authError = await requireApiKey(req);
    if (authError) return authError;

    const brandId = req.nextUrl.searchParams.get("brandId");
    if (!brandId) {
        return NextResponse.json({ error: "brandId query param is required." }, { status: 400 });
    }

    const tags = await prisma.tag.findMany({
        where: { brandId },
        include: { _count: { select: { subscribers: true } } },
        orderBy: { name: "asc" },
    });

    return NextResponse.json({ tags });
}

export async function POST(req: NextRequest) {
    const authError = await requireApiKey(req);
    if (authError) return authError;

    let body: Record<string, any>;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const brandId = body.brandId?.trim();
    const name = body.name?.trim();

    if (!brandId) return NextResponse.json({ error: "brandId is required." }, { status: 400 });
    if (!name) return NextResponse.json({ error: "name is required." }, { status: 400 });

    const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { id: true } });
    if (!brand) return NextResponse.json({ error: "Brand not found." }, { status: 404 });

    const tag = await prisma.tag.upsert({
        where: { name_brandId: { name, brandId } },
        create: { name, brandId },
        update: {},
    });

    return NextResponse.json({ tag }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
    const authError = await requireApiKey(req);
    if (authError) return authError;

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id query param is required." }, { status: 400 });

    const tag = await prisma.tag.findUnique({ where: { id } });
    if (!tag) return NextResponse.json({ error: "Tag not found." }, { status: 404 });

    await prisma.tag.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
