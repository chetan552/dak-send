import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/app/api/v1/_auth";

type Params = { params: Promise<{ email: string }> };

export async function GET(req: NextRequest, { params }: Params) {
    const authError = await requireApiKey(req);
    if (authError) return authError;

    const { email } = await params;
    const listId = req.nextUrl.searchParams.get("listId") ?? undefined;

    const subscriber = await prisma.subscriber.findFirst({
        where: { email: decodeURIComponent(email), ...(listId ? { listId } : {}) },
        select: {
            id: true,
            email: true,
            name: true,
            status: true,
            listId: true,
            hasConfirmedGdpr: true,
            optimalSendHour: true,
            createdAt: true,
            customFields: {
                select: {
                    value: true,
                    customField: { select: { name: true } },
                },
            },
        },
    });

    if (!subscriber) {
        return NextResponse.json({ error: "Subscriber not found." }, { status: 404 });
    }

    return NextResponse.json({
        data: {
            ...subscriber,
            customFields: Object.fromEntries(
                subscriber.customFields.map(cfv => [cfv.customField.name, cfv.value])
            ),
        },
    });
}

export async function PATCH(req: NextRequest, { params }: Params) {
    const authError = await requireApiKey(req);
    if (authError) return authError;

    const { email } = await params;
    const listId = req.nextUrl.searchParams.get("listId") ?? undefined;
    const body = await req.json();

    const subscriber = await prisma.subscriber.findFirst({
        where: { email: decodeURIComponent(email), ...(listId ? { listId } : {}) },
    });

    if (!subscriber) {
        return NextResponse.json({ error: "Subscriber not found." }, { status: 404 });
    }

    const updated = await prisma.subscriber.update({
        where: { id: subscriber.id },
        data: {
            name: body.name ?? undefined,
            status: body.status ?? undefined,
        },
    });

    if (body.customFields && Object.keys(body.customFields).length > 0) {
        const listFields = await prisma.customField.findMany({ where: { listId: subscriber.listId } });
        for (const [fieldName, value] of Object.entries(body.customFields as Record<string, string>)) {
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

    return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest, { params }: Params) {
    const authError = await requireApiKey(req);
    if (authError) return authError;

    const { email } = await params;
    const listId = req.nextUrl.searchParams.get("listId") ?? undefined;

    const subscriber = await prisma.subscriber.findFirst({
        where: { email: decodeURIComponent(email), ...(listId ? { listId } : {}) },
    });

    if (!subscriber) {
        return NextResponse.json({ error: "Subscriber not found." }, { status: 404 });
    }

    // Unsubscribe rather than hard-delete, to preserve bounce/complaint history
    await prisma.subscriber.update({
        where: { id: subscriber.id },
        data: { status: "unsubscribed" },
    });

    return NextResponse.json({ data: { success: true } });
}
