"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getAbTestVariants(campaignId: string) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) throw new Error("Unauthorized");

    return await (prisma as any).abTestVariant.findMany({
        where: { campaignId },
        orderBy: { createdAt: "asc" },
    });
}

export async function createAbTestVariant(campaignId: string, formData: FormData) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const currentUserRole = (session?.user as any)?.role || "user";
    if (!userId) throw new Error("Unauthorized");

    const whereCondition: any = currentUserRole === "admin"
        ? { id: campaignId, status: "draft" }
        : { id: campaignId, status: "draft", brand: { users: { some: { id: userId } } } };

    const campaign = await prisma.campaign.findFirst({ where: whereCondition });
    if (!campaign) throw new Error("Campaign not found, not a draft, or unauthorized");

    const name = formData.get("name") as string;
    const subject = formData.get("subject") as string;
    const htmlText = formData.get("htmlText") as string;
    const splitPercent = parseInt(formData.get("splitPercent") as string) || 50;

    if (!name) throw new Error("Variant name is required");

    await (prisma as any).abTestVariant.create({
        data: {
            campaignId,
            name,
            subject: subject || null,
            htmlText: htmlText || null,
            splitPercent: Math.min(Math.max(splitPercent, 1), 99),
        },
    });

    revalidatePath(`/dashboard/campaigns/${campaignId}/ab-test`);
    return { success: true };
}

export async function deleteAbTestVariant(variantId: string) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) throw new Error("Unauthorized");

    await (prisma as any).abTestVariant.delete({ where: { id: variantId } });
    return { success: true };
}

export async function pickAbTestWinner(variantId: string) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) throw new Error("Unauthorized");

    const variant = await (prisma as any).abTestVariant.findUnique({
        where: { id: variantId },
    });

    if (!variant) throw new Error("Variant not found");

    // Mark all variants as not winner, then mark this one
    await (prisma as any).abTestVariant.updateMany({
        where: { campaignId: variant.campaignId },
        data: { isWinner: false },
    });

    await (prisma as any).abTestVariant.update({
        where: { id: variantId },
        data: { isWinner: true },
    });

    // Update the campaign with the winning variant's content
    const updateData: any = {};
    if (variant.subject) updateData.subject = variant.subject;
    if (variant.htmlText) updateData.htmlText = variant.htmlText;

    if (Object.keys(updateData).length > 0) {
        await prisma.campaign.update({
            where: { id: variant.campaignId },
            data: updateData,
        });
    }

    revalidatePath(`/dashboard/campaigns/${variant.campaignId}/ab-test`);
    return { success: true };
}

export async function getAbTestResults(campaignId: string) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) throw new Error("Unauthorized");

    const variants = await (prisma as any).abTestVariant.findMany({
        where: { campaignId },
        orderBy: { createdAt: "asc" },
    });

    const results = [];
    for (const variant of variants) {
        const totalSent = await (prisma as any).campaignSend.count({
            where: { campaignId, abVariantId: variant.id, status: "sent" },
        });

        const totalOpened = await (prisma as any).campaignSend.count({
            where: { campaignId, abVariantId: variant.id, openedAt: { not: null } },
        });

        const totalClicked = await (prisma as any).campaignSend.count({
            where: { campaignId, abVariantId: variant.id, clickedAt: { not: null } },
        });

        results.push({
            ...variant,
            totalSent,
            totalOpened,
            totalClicked,
            openRate: totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : "0.0",
            clickRate: totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : "0.0",
        });
    }

    return results;
}
