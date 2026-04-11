import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/app/api/v1/_auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
    const authError = await requireApiKey(req);
    if (authError) return authError;

    const { id } = await params;

    const webhook = await prisma.webhook.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            url: true,
            events: true,
            active: true,
            brandId: true,
            createdAt: true,
        },
    });

    if (!webhook) {
        return NextResponse.json({ error: "Webhook not found." }, { status: 404 });
    }

    return NextResponse.json({ data: webhook });
}

export async function PATCH(req: NextRequest, { params }: Params) {
    const authError = await requireApiKey(req);
    if (authError) return authError;

    const { id } = await params;
    const body = await req.json();

    const webhook = await prisma.webhook.findUnique({ where: { id } });
    if (!webhook) {
        return NextResponse.json({ error: "Webhook not found." }, { status: 404 });
    }

    const updated = await prisma.webhook.update({
        where: { id },
        data: {
            name: body.name ?? undefined,
            active: body.active ?? undefined,
            events: body.events ?? undefined,
        },
        select: {
            id: true,
            name: true,
            url: true,
            events: true,
            active: true,
            brandId: true,
            createdAt: true,
        },
    });

    return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest, { params }: Params) {
    const authError = await requireApiKey(req);
    if (authError) return authError;

    const { id } = await params;

    const webhook = await prisma.webhook.findUnique({ where: { id } });
    if (!webhook) {
        return NextResponse.json({ error: "Webhook not found." }, { status: 404 });
    }

    await prisma.webhook.delete({ where: { id } });

    return NextResponse.json({ data: { success: true } });
}
