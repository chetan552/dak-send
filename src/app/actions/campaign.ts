"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { BlockEmailDocument } from "@/lib/blocks-to-html";
import { sanitizeEmailHtml } from "@/lib/sanitize-email-html";

const MAX_HTML_BYTES = 1_500_000;

function safeOriginUrl(raw: string): URL {
    let url: URL;
    try {
        url = new URL(raw);
    } catch {
        throw new Error("That doesn't look like a valid URL.");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("Only http and https URLs are supported.");
    }
    const host = url.hostname.toLowerCase();
    if (
        host === "localhost" ||
        host === "0.0.0.0" ||
        host.endsWith(".localhost") ||
        host.endsWith(".internal") ||
        host.startsWith("127.") ||
        host.startsWith("10.") ||
        host.startsWith("192.168.") ||
        /^169\.254\./.test(host) ||
        /^172\.(1[6-9]|2[0-9]|3[01])\./.test(host)
    ) {
        throw new Error("Refusing to fetch from internal/private hosts.");
    }
    return url;
}

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
    const htmlText = formData.get("htmlText") as string;
    const plainText = formData.get("plainText") as string;
    const brandId = formData.get("brandId") as string;

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
            status: "draft"
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
    const htmlText = formData.get("htmlText") as string;
    const plainText = formData.get("plainText") as string;

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
