import { prisma } from "@/lib/prisma";
import type { NormalizedEvent } from "./types";

async function getListIdsForBrand(brandId: string): Promise<string[]> {
    const lists = await prisma.list.findMany({
        where: { brandId },
        select: { id: true },
    });
    return lists.map((l) => l.id);
}

async function processBounce(email: string, subType: "hard" | "soft" | undefined) {
    await prisma.subscriber.updateMany({
        where: { email },
        data: { status: "bounced" },
    });
    await prisma.campaignSend.updateMany({
        where: { subscriberEmail: email, status: "sent" },
        data: { status: "bounced" },
    });

    // Only hard bounces auto-suppress. Soft bounces are transient (mailbox full,
    // greylisting) — keep the address suppressible by an admin if desired but
    // don't lock it out automatically.
    if (subType !== "soft") {
        await prisma.suppressionList.upsert({
            where: { email_brandId: { email, brandId: null as unknown as string } },
            update: {},
            create: { email, reason: "bounce", brandId: null },
        }).catch(() => {});
    }
}

async function processComplaint(email: string, campaignId?: string) {
    let listIds: string[] | null = null;
    let brandId: string | null = null;

    if (campaignId) {
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            select: { brandId: true },
        });
        if (campaign) {
            brandId = campaign.brandId;
            listIds = await getListIdsForBrand(campaign.brandId);
            await prisma.campaignSend.updateMany({
                where: { campaignId, subscriberEmail: email, status: "sent" },
                data: { status: "complained" },
            });
        }
    }

    if (listIds === null) {
        const sends = await prisma.campaignSend.findMany({
            where: { subscriberEmail: email, status: "sent" },
            select: { campaignId: true, campaign: { select: { brandId: true } } },
        });

        if (sends.length > 0) {
            const brandIds = [...new Set(sends.map((s) => s.campaign.brandId))];
            const allLists = await Promise.all(brandIds.map(getListIdsForBrand));
            listIds = allLists.flat();
            brandId = brandIds[0] ?? null;

            await prisma.campaignSend.updateMany({
                where: { subscriberEmail: email, status: "sent" },
                data: { status: "complained" },
            });
        }
    }

    if (listIds !== null && listIds.length > 0) {
        await prisma.subscriber.updateMany({
            where: { email, listId: { in: listIds } },
            data: { status: "complained" },
        });
        if (brandId) {
            await prisma.suppressionList.upsert({
                where: { email_brandId: { email, brandId } },
                update: {},
                create: { email, reason: "complaint", brandId },
            }).catch(() => {});
        }
    } else {
        await prisma.subscriber.updateMany({
            where: { email },
            data: { status: "complained" },
        });
        await prisma.suppressionList.upsert({
            where: { email_brandId: { email, brandId: null as unknown as string } },
            update: {},
            create: { email, reason: "complaint", brandId: null },
        }).catch(() => {});
    }
}

/**
 * Apply a provider-normalized webhook event to DakSend's state.
 * Each provider's webhook route parses its native payload into NormalizedEvent[]
 * then calls this for every event. Behavior:
 *  - hard bounce → mark Subscriber.status=bounced everywhere, add to global suppression
 *  - soft bounce → mark Subscriber.status=bounced everywhere, no auto-suppression
 *  - complaint   → brand-scoped subscriber+suppression, falling back to global
 *  - delivery    → currently ignored (tracking pixel covers opens)
 */
export async function handleProviderEvent(event: NormalizedEvent): Promise<void> {
    if (!event.email) return;
    const email = event.email.toLowerCase().trim();
    if (!email) return;

    if (event.type === "bounce") {
        await processBounce(email, event.subType);
        return;
    }
    if (event.type === "complaint") {
        await processComplaint(email, event.campaignId);
        return;
    }
    // delivery: no-op for now
}
