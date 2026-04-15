"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function assertAuth() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");
    return session;
}

/** Add one or more emails to the suppression list. brandId=null → global. */
export async function addSuppression(emails: string[], reason: string, brandId: string | null, note?: string) {
    const session = await assertAuth();
    const role = session.user?.role || "user";

    // Non-admins can only suppress within their own brands
    if (brandId && role !== "admin") {
        const brand = await prisma.brand.findFirst({
            where: { id: brandId, users: { some: { id: session.user!.id } } },
        });
        if (!brand) throw new Error("Unauthorized");
    }
    if (!brandId && role !== "admin") throw new Error("Only admins can add global suppressions");

    const rows = emails.map(email => ({ email: email.trim().toLowerCase(), reason, brandId: brandId ?? null, note: note ?? null }));

    for (const row of rows) {
        await prisma.suppressionList.upsert({
            where: { email_brandId: { email: row.email, brandId: row.brandId as any } },
            update: { reason: row.reason, note: row.note },
            create: row,
        });
    }

    revalidatePath("/dashboard/deliverability");
}

/** Remove a suppression entry by ID. */
export async function removeSuppression(id: string) {
    const session = await assertAuth();
    const role = session.user?.role || "user";

    const entry = await prisma.suppressionList.findUnique({ where: { id } });
    if (!entry) throw new Error("Not found");

    // Non-admins can only remove brand-scoped suppressions they own
    if (entry.brandId === null && role !== "admin") throw new Error("Only admins can remove global suppressions");
    if (entry.brandId && role !== "admin") {
        const brand = await prisma.brand.findFirst({
            where: { id: entry.brandId, users: { some: { id: session.user!.id } } },
        });
        if (!brand) throw new Error("Unauthorized");
    }

    await prisma.suppressionList.delete({ where: { id } });
    revalidatePath("/dashboard/deliverability");
}

/** Fetch suppression list entries, scoped to brands the user can access. */
export async function getSuppressions(brandId?: string | null) {
    const session = await assertAuth();
    const role = session.user?.role || "user";

    if (role === "admin") {
        return prisma.suppressionList.findMany({
            where: brandId !== undefined ? { brandId: brandId ?? null } : undefined,
            include: { brand: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
        });
    }

    // Regular users: see global suppressions + their own brand suppressions
    const userBrands = await prisma.brand.findMany({
        where: { users: { some: { id: session.user!.id } } },
        select: { id: true },
    });
    const brandIds = userBrands.map(b => b.id);

    return prisma.suppressionList.findMany({
        where: {
            OR: [
                { brandId: null },
                { brandId: { in: brandIds } },
            ],
        },
        include: { brand: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
    });
}

/** Fetch deliverability stats: subscriber status counts per brand. */
export async function getDeliverabilityStats() {
    const session = await assertAuth();
    const role = session.user?.role || "user";

    const brandsWhere = role === "admin" ? {} : { users: { some: { id: session.user!.id } } };

    const brands = await prisma.brand.findMany({
        where: brandsWhere,
        select: {
            id: true,
            name: true,
            lists: {
                select: {
                    id: true,
                    name: true,
                    _count: {
                        select: {
                            subscribers: true,
                        },
                    },
                },
            },
        },
    });

    // Per-brand subscriber status breakdown
    const stats = await Promise.all(brands.map(async brand => {
        const listIds = brand.lists.map(l => l.id);

        const [subscribed, unsubscribed, bounced, complained] = await Promise.all([
            prisma.subscriber.count({ where: { listId: { in: listIds }, status: "subscribed" } }),
            prisma.subscriber.count({ where: { listId: { in: listIds }, status: "unsubscribed" } }),
            prisma.subscriber.count({ where: { listId: { in: listIds }, status: "bounced" } }),
            prisma.subscriber.count({ where: { listId: { in: listIds }, status: "complained" } }),
        ]);

        const suppressionCount = await prisma.suppressionList.count({
            where: { OR: [{ brandId: null }, { brandId: brand.id }] },
        });

        return {
            brandId: brand.id,
            brandName: brand.name,
            subscribed,
            unsubscribed,
            bounced,
            complained,
            suppressionCount,
            total: subscribed + unsubscribed + bounced + complained,
        };
    }));

    // Recent bounced/complained subscribers (last 50 across all accessible brands)
    const allListIds = brands.flatMap(b => b.lists.map(l => l.id));
    const recentIssues = await prisma.subscriber.findMany({
        where: {
            listId: { in: allListIds },
            status: { in: ["bounced", "complained"] },
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
        select: {
            id: true,
            email: true,
            status: true,
            updatedAt: true,
            list: { select: { id: true, name: true, brand: { select: { id: true, name: true } } } },
        },
    });

    return { stats, recentIssues };
}
