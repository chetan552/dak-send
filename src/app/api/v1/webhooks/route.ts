import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/app/api/v1/_auth";
import { isSafeWebhookUrl } from "@/lib/validators";
import crypto from "crypto";

const VALID_EVENTS = ["subscribe", "unsubscribe", "open", "click", "bounce", "complaint"];

export async function GET(req: NextRequest) {
    const authError = await requireApiKey(req);
    if (authError) return authError;

    const brandId = req.nextUrl.searchParams.get("brandId") ?? undefined;

    const webhooks = await prisma.webhook.findMany({
        where: brandId ? { brandId } : undefined,
        select: {
            id: true,
            name: true,
            url: true,
            events: true,
            active: true,
            brandId: true,
            createdAt: true,
        },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: webhooks });
}

export async function POST(req: NextRequest) {
    const authError = await requireApiKey(req);
    if (authError) return authError;

    const body = await req.json();
    const { name, url, events, brandId, secret } = body as {
        name: string;
        url: string;
        events: string[];
        brandId: string;
        secret?: string;
    };

    if (!name || !url || !events?.length || !brandId) {
        return NextResponse.json(
            { error: "name, url, events, and brandId are required." },
            { status: 400 }
        );
    }

    const invalidEvents = events.filter(e => !VALID_EVENTS.includes(e));
    if (invalidEvents.length > 0) {
        return NextResponse.json(
            { error: `Invalid events: ${invalidEvents.join(", ")}. Valid: ${VALID_EVENTS.join(", ")}` },
            { status: 400 }
        );
    }

    if (!isSafeWebhookUrl(url)) {
        return NextResponse.json({ error: "Invalid or unsafe webhook URL." }, { status: 400 });
    }

    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) {
        return NextResponse.json({ error: "Brand not found." }, { status: 404 });
    }

    // Use the first admin user as owner for API-created webhooks
    const adminUser = await prisma.user.findFirst({ where: { role: "admin" } });
    if (!adminUser) {
        return NextResponse.json({ error: "No admin user found." }, { status: 500 });
    }

    const webhook = await prisma.webhook.create({
        data: {
            name,
            url,
            events,
            brandId,
            secret: secret ?? crypto.randomBytes(24).toString("hex"),
            active: true,
            userId: adminUser.id,
        },
    });

    return NextResponse.json({ data: webhook }, { status: 201 });
}
