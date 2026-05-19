"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { BlockEmailDocument } from "@/lib/blocks-to-html";
import { sanitizeEmailHtml } from "@/lib/sanitize-email-html";
import { safeOriginUrl } from "@/lib/safe-url";
import { renderMailyToHtml } from "@/lib/maily";

/**
 * If the form was submitted from the Maily editor, the source of truth is
 * `contentJson` — we server-render it to HTML here so the worker doesn't
 * have to. Returns { htmlText, contentFormat, contentJson } for the caller
 * to persist. Returns null if no Maily input was provided.
 */
async function resolveMailyContent(formData: FormData): Promise<{
    htmlText: string;
    contentFormat: "maily";
    contentJson: any;
} | null> {
    const contentFormat = formData.get("contentFormat") as string | null;
    if (contentFormat !== "maily") return null;

    const contentJsonRaw = formData.get("contentJson") as string | null;
    if (!contentJsonRaw) throw new Error("Maily content is missing.");

    let contentJson: any;
    try {
        contentJson = JSON.parse(contentJsonRaw);
    } catch {
        throw new Error("Maily content is not valid JSON.");
    }

    // Re-render server-side rather than trusting client-supplied HTML.
    const htmlText = await renderMailyToHtml(contentJson);
    if (!htmlText || !htmlText.trim()) {
        throw new Error("Maily content rendered to empty HTML.");
    }
    return { htmlText, contentFormat: "maily", contentJson };
}

const MAX_HTML_BYTES = 1_500_000;

export async function importCampaignContent(input: { html?: string; url?: string }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    if (input.html && input.html.trim()) {
        if (input.html.length > MAX_HTML_BYTES) throw new Error("Pasted HTML is too large (max 1.5 MB).");
        return { html: sanitizeEmailHtml(input.html) };
    }

    if (input.url) {
        const url = safeOriginUrl(input.url);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15_000);
        try {
            const res = await fetch(url.toString(), {
                signal: controller.signal,
                redirect: "follow",
                headers: { "User-Agent": "DakSend/1.0 (+import)" },
            });
            if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status}`);
            const buf = await res.arrayBuffer();
            if (buf.byteLength > MAX_HTML_BYTES) throw new Error("Fetched HTML is too large (max 1.5 MB).");
            const html = new TextDecoder().decode(buf);
            return { html: sanitizeEmailHtml(html) };
        } finally {
            clearTimeout(timeout);
        }
    }

    throw new Error("Provide either HTML or a URL.");
}

export async function createCampaignDraft(formData: FormData) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const name = formData.get("name") as string;
    const subject = formData.get("subject") as string;
    const plainText = formData.get("plainText") as string;
    const brandId = formData.get("brandId") as string;

    const maily = await resolveMailyContent(formData);
    const htmlText = maily ? maily.htmlText : (formData.get("htmlText") as string);

    if (!name || !subject || !brandId || !htmlText) {
        throw new Error("Missing required fields");
    }

    const whereCondition: any = currentUserRole === 'admin'
        ? { id: brandId }
        : { id: brandId, users: { some: { id: userId } } };

    const brand = await prisma.brand.findFirst({
        where: whereCondition
    });

    if (!brand) throw new Error("Brand not found or unauthorized");

    const campaign = await prisma.campaign.create({
        data: {
            name,
            subject,
            htmlText,
            plainText: plainText || null,
            brandId,
            status: "draft",
            ...(maily ? { contentFormat: maily.contentFormat, contentJson: maily.contentJson } : {}),
        }
    });

    revalidatePath("/dashboard/campaigns");
    return campaign;
}

export async function updateCampaignDraft(id: string, formData: FormData) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const name = formData.get("name") as string;
    const subject = formData.get("subject") as string;
    const plainText = formData.get("plainText") as string;

    const maily = await resolveMailyContent(formData);
    const htmlText = maily ? maily.htmlText : (formData.get("htmlText") as string);

    const whereCondition: any = currentUserRole === 'admin'
        ? { id }
        : { id, brand: { users: { some: { id: userId } } } };

    const campaign = await prisma.campaign.findFirst({
        where: whereCondition
    });

    if (!campaign || campaign.status !== 'draft') {
        throw new Error("Campaign not found or cannot be edited");
    }

    const updated = await prisma.campaign.update({
        where: { id },
        data: {
            name,
            subject,
            htmlText,
            plainText: plainText || null,
            ...(maily ? { contentFormat: maily.contentFormat, contentJson: maily.contentJson } : {}),
        }
    });

    revalidatePath(`/dashboard/campaigns/${id}`);
    return updated;
}

export async function deleteCampaign(id: string) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const whereCondition: any = currentUserRole === 'admin'
        ? { id }
        : { id, brand: { users: { some: { id: userId } } } };

    const campaign = await prisma.campaign.findFirst({
        where: whereCondition
    });

    if (!campaign) {
        throw new Error("Campaign not found or unauthorized");
    }

    await prisma.campaign.delete({
        where: { id }
    });

    revalidatePath("/dashboard/campaigns");
}

export async function updateCampaignBlocks(
    id: string,
    doc: BlockEmailDocument,
    compiledHtml: string,
) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const whereCondition: any = currentUserRole === "admin"
        ? { id }
        : { id, brand: { users: { some: { id: userId } } } };

    const campaign = await prisma.campaign.findFirst({ where: whereCondition });
    if (!campaign || campaign.status !== "draft") {
        throw new Error("Campaign not found or cannot be edited");
    }

    const updated = await prisma.campaign.update({
        where: { id },
        data: {
            htmlText: compiledHtml,
            contentJson: doc as any,
        },
    });

    revalidatePath(`/dashboard/campaigns/${id}`);
    return updated;
}

export async function deleteMultipleCampaigns(ids: string[]) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");
    if (!ids.length) return { deleted: 0 };

    const whereCondition: any = currentUserRole === 'admin'
        ? { id: { in: ids } }
        : { id: { in: ids }, brand: { users: { some: { id: userId } } } };

    const { count } = await prisma.campaign.deleteMany({ where: whereCondition });

    revalidatePath("/dashboard/campaigns");
    return { deleted: count };
}

export async function duplicateCampaign(id: string) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const whereCondition: any = currentUserRole === 'admin'
        ? { id }
        : { id, brand: { users: { some: { id: userId } } } };

    const campaign = await prisma.campaign.findFirst({
        where: whereCondition
    });

    if (!campaign) {
        throw new Error("Campaign not found or unauthorized");
    }

    const newCampaign = await prisma.campaign.create({
        data: {
            name: `${campaign.name} (Copy)`,
            subject: campaign.subject,
            htmlText: campaign.htmlText,
            plainText: campaign.plainText,
            brandId: campaign.brandId,
            status: "draft"
        }
    });

    revalidatePath("/dashboard/campaigns");
    return newCampaign;
}
