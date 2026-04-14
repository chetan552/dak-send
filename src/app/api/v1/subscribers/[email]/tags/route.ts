import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/app/api/v1/_auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/v1/subscribers/:email/tags?listId=...
 * List tags on a subscriber.
 *
 * POST /api/v1/subscribers/:email/tags
 * Body: { listId, tagId } OR { listId, tagName, brandId }
 * Add a tag to a subscriber (creates the tag if tagName given and it doesn't exist).
 *
 * DELETE /api/v1/subscribers/:email/tags?listId=...&tagId=...
 * Remove a tag from a subscriber.
 */

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ email: string }> }
) {
    const authError = await requireApiKey(req);
    if (authError) return authError;

    const { email } = await params;
    const listId = req.nextUrl.searchParams.get("listId");
    if (!listId) return NextResponse.json({ error: "listId is required." }, { status: 400 });

    const subscriber = await prisma.subscriber.findUnique({
        where: { email_listId: { email: email.toLowerCase(), listId } },
        select: { id: true },
    });
    if (!subscriber) return NextResponse.json({ error: "Subscriber not found." }, { status: 404 });

    const tags = await prisma.subscriberTag.findMany({
        where: { subscriberId: subscriber.id },
        include: { tag: true },
        orderBy: { tag: { name: "asc" } },
    });

    return NextResponse.json({ tags: tags.map((t) => t.tag) });
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ email: string }> }
) {
    const authError = await requireApiKey(req);
    if (authError) return authError;

    const { email } = await params;

    let body: Record<string, any>;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const listId = body.listId?.trim();
    if (!listId) return NextResponse.json({ error: "listId is required." }, { status: 400 });

    const subscriber = await prisma.subscriber.findUnique({
        where: { email_listId: { email: email.toLowerCase(), listId } },
        select: { id: true, list: { select: { brandId: true } } },
    });
    if (!subscriber) return NextResponse.json({ error: "Subscriber not found." }, { status: 404 });

    let tagId = body.tagId?.trim();

    // Allow passing tagName + brandId to auto-create the tag
    if (!tagId && body.tagName) {
        const tagName = body.tagName.trim();
        const brandId = body.brandId?.trim() ?? subscriber.list.brandId;
        const tag = await prisma.tag.upsert({
            where: { name_brandId: { name: tagName, brandId } },
            create: { name: tagName, brandId },
            update: {},
        });
        tagId = tag.id;
    }

    if (!tagId) return NextResponse.json({ error: "tagId or tagName is required." }, { status: 400 });

    await prisma.subscriberTag.upsert({
        where: { subscriberId_tagId: { subscriberId: subscriber.id, tagId } },
        create: { subscriberId: subscriber.id, tagId },
        update: {},
    });

    return NextResponse.json({ success: true });
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ email: string }> }
) {
    const authError = await requireApiKey(req);
    if (authError) return authError;

    const { email } = await params;
    const listId = req.nextUrl.searchParams.get("listId");
    const tagId = req.nextUrl.searchParams.get("tagId");

    if (!listId || !tagId) {
        return NextResponse.json({ error: "listId and tagId are required." }, { status: 400 });
    }

    const subscriber = await prisma.subscriber.findUnique({
        where: { email_listId: { email: email.toLowerCase(), listId } },
        select: { id: true },
    });
    if (!subscriber) return NextResponse.json({ error: "Subscriber not found." }, { status: 404 });

    await prisma.subscriberTag.deleteMany({
        where: { subscriberId: subscriber.id, tagId },
    });

    return NextResponse.json({ success: true });
}
