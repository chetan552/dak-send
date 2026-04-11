import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/app/api/v1/_auth";

export async function GET(req: NextRequest) {
    const authError = await requireApiKey(req);
    if (authError) return authError;

    const { searchParams } = req.nextUrl;
    const listId = searchParams.get("listId") ?? undefined;
    const email = searchParams.get("email") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 500);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const where: Record<string, unknown> = {};
    if (listId) where.listId = listId;
    if (email) where.email = email;
    if (status) where.status = status;

    const [subscribers, total] = await Promise.all([
        prisma.subscriber.findMany({
            where,
            select: {
                id: true,
                email: true,
                name: true,
                status: true,
                listId: true,
                hasConfirmedGdpr: true,
                createdAt: true,
                customFields: {
                    select: {
                        value: true,
                        customField: { select: { name: true } },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: offset,
        }),
        prisma.subscriber.count({ where }),
    ]);

    return NextResponse.json({
        data: subscribers.map(s => ({
            id: s.id,
            email: s.email,
            name: s.name,
            status: s.status,
            listId: s.listId,
            hasConfirmedGdpr: s.hasConfirmedGdpr,
            createdAt: s.createdAt,
            customFields: Object.fromEntries(
                s.customFields.map(cfv => [cfv.customField.name, cfv.value])
            ),
        })),
        total,
        limit,
        offset,
    });
}

export async function POST(req: NextRequest) {
    const authError = await requireApiKey(req);
    if (authError) return authError;

    const body = await req.json();
    const { listId, email, name, status, customFields } = body as {
        listId: string;
        email: string;
        name?: string;
        status?: string;
        customFields?: Record<string, string>;
    };

    if (!listId || !email) {
        return NextResponse.json({ error: "listId and email are required." }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    const list = await prisma.list.findUnique({ where: { id: listId } });
    if (!list) {
        return NextResponse.json({ error: "List not found." }, { status: 404 });
    }

    const subscriber = await prisma.subscriber.upsert({
        where: { email_listId: { email, listId } },
        update: {
            name: name ?? undefined,
            status: status ?? "subscribed",
        },
        create: {
            email,
            name: name ?? null,
            listId,
            status: status ?? (list.optIn === "double" ? "pending" : "subscribed"),
        },
    });

    if (customFields && Object.keys(customFields).length > 0) {
        const listFields = await prisma.customField.findMany({ where: { listId } });
        for (const [fieldName, value] of Object.entries(customFields)) {
            const field = listFields.find(f => f.name.toLowerCase() === fieldName.toLowerCase());
            if (field) {
                await prisma.subscriberFieldValue.upsert({
                    where: { subscriberId_customFieldId: { subscriberId: subscriber.id, customFieldId: field.id } },
                    update: { value },
                    create: { subscriberId: subscriber.id, customFieldId: field.id, value },
                });
            }
        }
    }

    return NextResponse.json({ data: subscriber }, { status: subscriber ? 200 : 201 });
}
