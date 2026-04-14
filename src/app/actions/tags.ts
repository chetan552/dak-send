"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─── Brand-level tag management ──────────────────────────────────────────────

export async function getTagsForBrand(brandId: string) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const role = session?.user?.role || "user";
    if (!userId) throw new Error("Unauthorized");

    const brandWhere: any = role === "admin"
        ? { id: brandId }
        : { id: brandId, users: { some: { id: userId } } };

    const brand = await prisma.brand.findFirst({ where: brandWhere });
    if (!brand) throw new Error("Brand not found or access denied");

    return prisma.tag.findMany({
        where: { brandId },
        include: { _count: { select: { subscribers: true } } },
        orderBy: { name: "asc" },
    });
}

export async function createTag(brandId: string, name: string) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const role = session?.user?.role || "user";
    if (!userId) throw new Error("Unauthorized");

    const trimmed = name.trim();
    if (!trimmed) throw new Error("Tag name is required");

    const brandWhere: any = role === "admin"
        ? { id: brandId }
        : { id: brandId, users: { some: { id: userId } } };

    const brand = await prisma.brand.findFirst({ where: brandWhere });
    if (!brand) throw new Error("Brand not found or access denied");

    const tag = await prisma.tag.create({
        data: { name: trimmed, brandId },
    });

    revalidatePath("/dashboard/tags");
    return tag;
}

export async function deleteTag(tagId: string) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const role = session?.user?.role || "user";
    if (!userId) throw new Error("Unauthorized");

    const tag = await prisma.tag.findUnique({
        where: { id: tagId },
        include: { brand: { select: { userId: true, users: { select: { id: true } } } } },
    });
    if (!tag) throw new Error("Tag not found");

    const hasAccess = role === "admin" || tag.brand.users.some((u: any) => u.id === userId);
    if (!hasAccess) throw new Error("Access denied");

    await prisma.tag.delete({ where: { id: tagId } });
    revalidatePath("/dashboard/tags");
}

// ─── Per-subscriber tag management ───────────────────────────────────────────

export async function getSubscriberTags(subscriberId: string) {
    return prisma.subscriberTag.findMany({
        where: { subscriberId },
        include: { tag: true },
        orderBy: { tag: { name: "asc" } },
    });
}

export async function addTagToSubscriber(subscriberId: string, tagId: string) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    // upsert so double-adding is safe
    await prisma.subscriberTag.upsert({
        where: { subscriberId_tagId: { subscriberId, tagId } },
        create: { subscriberId, tagId },
        update: {},
    });
}

export async function removeTagFromSubscriber(subscriberId: string, tagId: string) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    await prisma.subscriberTag.deleteMany({ where: { subscriberId, tagId } });
}
