"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { isSafeWebhookUrl } from "@/lib/validators";
import { assertPublicHost } from "@/lib/safe-url";

export async function getWebhooks() {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const role = session?.user?.role || "user";
    if (!userId) throw new Error("Unauthorized");

    const where = role === "admin"
        ? {}
        : { brand: { users: { some: { id: userId } } } };

    return prisma.webhook.findMany({
        where,
        include: { brand: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
    });
}

export async function createWebhook(data: {
    name: string;
    url: string;
    events: string[];
    brandId: string;
    secret?: string;
}) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const role = session?.user?.role || "user";
    if (!userId) throw new Error("Unauthorized");

    // Webhooks receive subscriber events (emails) for the brand — the caller
    // must actually have access to that brand.
    const brandWhere = role === "admin"
        ? { id: data.brandId }
        : { id: data.brandId, users: { some: { id: userId } } };
    const brand = await prisma.brand.findFirst({ where: brandWhere, select: { id: true } });
    if (!brand) throw new Error("Brand not found or unauthorized");

    if (!isSafeWebhookUrl(data.url)) {
        throw new Error("Invalid or blocked webhook URL");
    }

    const webhook = await prisma.webhook.create({
        data: {
            name: data.name,
            url: data.url,
            events: data.events,
            brandId: data.brandId,
            secret: data.secret || crypto.randomBytes(24).toString("hex"),
            userId,
        },
    });

    revalidatePath("/dashboard/settings/webhooks");
    return webhook;
}

export async function toggleWebhook(id: string) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const role = session?.user?.role || "user";
    if (!userId) throw new Error("Unauthorized");

    const where: any = role === "admin" ? { id } : { id, brand: { users: { some: { id: userId } } } };
    const webhook = await prisma.webhook.findFirst({ where });
    if (!webhook) throw new Error("Not found");

    await prisma.webhook.update({
        where: { id },
        data: { active: !webhook.active },
    });

    revalidatePath("/dashboard/settings/webhooks");
}

export async function deleteWebhook(id: string) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const role = session?.user?.role || "user";
    if (!userId) throw new Error("Unauthorized");

    const where: any = role === "admin" ? { id } : { id, brand: { users: { some: { id: userId } } } };
    const webhook = await prisma.webhook.findFirst({ where });
    if (!webhook) throw new Error("Not found");

    await prisma.webhook.delete({ where: { id } });
    revalidatePath("/dashboard/settings/webhooks");
}

export async function testWebhook(id: string) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const role = session?.user?.role || "user";
    if (!userId) throw new Error("Unauthorized");

    const where: any = role === "admin" ? { id } : { id, brand: { users: { some: { id: userId } } } };
    const webhook = await prisma.webhook.findFirst({ where });
    if (!webhook) throw new Error("Not found");
    if (!isSafeWebhookUrl(webhook.url)) throw new Error("Invalid or blocked webhook URL");
    await assertPublicHost(new URL(webhook.url));

    const payload = JSON.stringify({
        event: "test",
        timestamp: new Date().toISOString(),
        data: { message: "This is a test webhook from DakSend" },
    });

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "DakSend-Webhooks/1.0",
        "X-Webhook-Event": "test",
    };

    if (webhook.secret) {
        const signature = (await import("crypto")).createHmac("sha256", webhook.secret).update(payload).digest("hex");
        headers["X-Webhook-Signature"] = `sha256=${signature}`;
    }

    const res = await fetch(webhook.url, {
        method: "POST",
        headers,
        body: payload,
        signal: AbortSignal.timeout(10000),
    });

    return { status: res.status, ok: res.ok };
}
