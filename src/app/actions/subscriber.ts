"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ImportResult = {
    created: number;
    updated: number;
    skipped: { existing: number; invalid: number; errored: number };
};

export async function importSubscribersAction(formData: FormData): Promise<ImportResult> {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";

    if (!userId) {
        throw new Error("Unauthorized");
    }

    const listId = formData.get("listId") as string;
    const subscribersJsonStr = formData.get("subscribers") as string;
    const updateExisting = formData.get("updateExisting") === "true";

    if (!listId || !subscribersJsonStr) {
        throw new Error("List ID and subscribers are required");
    }

    const whereCondition: any = currentUserRole === 'admin'
        ? { id: listId }
        : { id: listId, brand: { users: { some: { id: userId } } } };

    const list = await prisma.list.findFirst({
        where: whereCondition
    });

    if (!list) {
        throw new Error("List not found or unauthorized");
    }

    const rawRows = JSON.parse(subscribersJsonStr) as { email: string, name?: string, customFields?: Record<string, string> }[];

    const result: ImportResult = {
        created: 0,
        updated: 0,
        skipped: { existing: 0, invalid: 0, errored: 0 },
    };

    // Normalize + dedupe by email (last write wins for same address in one upload).
    const byEmail = new Map<string, { email: string; name?: string; customFields?: Record<string, string> }>();
    for (const row of rawRows) {
        const email = (row.email || "").trim().toLowerCase();
        if (!email || !EMAIL_REGEX.test(email)) {
            result.skipped.invalid++;
            continue;
        }
        byEmail.set(email, { ...row, email });
    }

    if (byEmail.size === 0) {
        return result;
    }

    const emails = Array.from(byEmail.keys());

    // Pre-fetch existing rows in this list once.
    const existingRows = await prisma.subscriber.findMany({
        where: { listId, email: { in: emails } },
        select: { id: true, email: true },
    });
    const existingByEmail = new Map(existingRows.map(r => [r.email, r.id]));

    const listCustomFields = await prisma.customField.findMany({ where: { listId } });
    const validCustomFieldIds = new Set(listCustomFields.map(cf => cf.id));

    for (const sub of byEmail.values()) {
        const existingId = existingByEmail.get(sub.email);

        try {
            let subscriberId: string;

            if (existingId) {
                if (!updateExisting) {
                    result.skipped.existing++;
                    continue;
                }
                // Update name only — never touch status (preserves unsubscribed/bounced/complained).
                await prisma.subscriber.update({
                    where: { id: existingId },
                    data: { name: sub.name?.trim() || undefined },
                });
                subscriberId = existingId;
                result.updated++;
            } else {
                const created = await prisma.subscriber.create({
                    data: {
                        email: sub.email,
                        name: sub.name?.trim() || null,
                        listId,
                        hasConfirmedGdpr: list.requireGdpr,
                    },
                });
                subscriberId = created.id;
                result.created++;
            }

            if (sub.customFields) {
                for (const [cfId, fieldValue] of Object.entries(sub.customFields)) {
                    if (!validCustomFieldIds.has(cfId)) continue;
                    if (fieldValue === undefined || fieldValue === null || fieldValue === "") continue;
                    await prisma.subscriberFieldValue.upsert({
                        where: { subscriberId_customFieldId: { subscriberId, customFieldId: cfId } },
                        update: { value: String(fieldValue) },
                        create: { subscriberId, customFieldId: cfId, value: String(fieldValue) },
                    });
                }
            }
        } catch (e) {
            console.warn("Failed inserting subscriber", sub.email, e);
            result.skipped.errored++;
        }
    }

    revalidatePath(`/dashboard/lists/${listId}`);
    return result;
}

export async function checkExistingEmailsAction(listId: string, emails: string[]): Promise<{ existing: string[] }> {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");
    if (!listId) throw new Error("List ID is required");
    if (!Array.isArray(emails) || emails.length === 0) return { existing: [] };

    const whereCondition: any = currentUserRole === 'admin'
        ? { id: listId }
        : { id: listId, brand: { users: { some: { id: userId } } } };

    const list = await prisma.list.findFirst({ where: whereCondition, select: { id: true } });
    if (!list) throw new Error("List not found or unauthorized");

    const normalized = Array.from(new Set(emails.map(e => (e || "").trim().toLowerCase()).filter(Boolean)));

    const rows = await prisma.subscriber.findMany({
        where: { listId, email: { in: normalized } },
        select: { email: true },
    });

    return { existing: rows.map(r => r.email) };
}

export async function deleteSubscriber(id: string, listId: string) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";
    if (!userId) throw new Error("Unauthorized");

    const whereCondition: any = currentUserRole === 'admin'
        ? { id: listId }
        : { id: listId, brand: { users: { some: { id: userId } } } };

    const list = await prisma.list.findFirst({
        where: whereCondition
    });

    if (!list) throw new Error("Unauthorized");

    const sub = await prisma.subscriber.findUnique({ where: { id }, select: { email: true } });
    await prisma.subscriber.delete({ where: { id } });

    writeAuditLog({
        action: "subscriber_deleted",
        entityType: "subscriber",
        entityId: id,
        actorId: userId,
        meta: { email: sub?.email, listId },
    });

    revalidatePath(`/dashboard/lists/${listId}`);
}

export async function deleteSubscribers(listId: string, subscriberIds: string[]) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";
    if (!userId) throw new Error("Unauthorized");
    if (!Array.isArray(subscriberIds) || subscriberIds.length === 0) throw new Error("No subscribers selected");

    const whereCondition: any = currentUserRole === 'admin'
        ? { id: listId }
        : { id: listId, brand: { users: { some: { id: userId } } } };

    const list = await prisma.list.findFirst({
        where: whereCondition
    });

    if (!list) throw new Error("Unauthorized");

    await prisma.subscriber.deleteMany({
        where: {
            listId,
            id: { in: subscriberIds }
        }
    });

    writeAuditLog({
        action: "subscriber_deleted",
        entityType: "subscriber",
        entityId: listId,
        actorId: userId,
        meta: { listId, count: subscriberIds.length, ids: subscriberIds },
    });

    revalidatePath(`/dashboard/lists/${listId}`);
}


export async function unsubscribeSubscriber(id: string, listId: string) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";
    if (!userId) throw new Error("Unauthorized");

    const whereCondition: any = currentUserRole === 'admin'
        ? { id: listId }
        : { id: listId, brand: { users: { some: { id: userId } } } };

    const list = await prisma.list.findFirst({
        where: whereCondition
    });

    if (!list) throw new Error("Unauthorized");

    await prisma.subscriber.update({
        where: { id },
        data: { status: "unsubscribed" }
    });

    revalidatePath(`/dashboard/lists/${listId}`);
}

export async function addSubscriberAction(formData: FormData) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";
    if (!userId) throw new Error("Unauthorized");

    const listId = formData.get("listId") as string;
    const email = formData.get("email") as string;
    const name = formData.get("name") as string | null;
    const customFieldsJson = formData.get("customFieldsJson") as string;

    if (!listId || !email) {
        throw new Error("List ID and Email are required");
    }

    const whereCondition: any = currentUserRole === 'admin'
        ? { id: listId }
        : { id: listId, brand: { users: { some: { id: userId } } } };

    const list = await prisma.list.findFirst({
        where: whereCondition
    });

    if (!list) throw new Error("List not found or unauthorized");

    const customFieldsData = customFieldsJson ? JSON.parse(customFieldsJson) : {};

    const dbSub = await prisma.subscriber.upsert({
        where: {
            email_listId: {
                email,
                listId,
            }
        },
        update: {
            name: name || undefined,
            status: "subscribed"
        },
        create: {
            email,
            name: name || null,
            listId,
            hasConfirmedGdpr: list.requireGdpr
        }
    });

    // Handle custom fields
    if (Object.keys(customFieldsData).length > 0) {
        const listCustomFields = await prisma.customField.findMany({
            where: { listId }
        });

        for (const [cfId, value] of Object.entries(customFieldsData)) {
            const customFieldDef = listCustomFields.find(cf => cf.id === cfId);

            if (customFieldDef) {
                await prisma.subscriberFieldValue.upsert({
                    where: {
                        subscriberId_customFieldId: {
                            subscriberId: dbSub.id,
                            customFieldId: customFieldDef.id
                        }
                    },
                    update: { value: String(value) },
                    create: {
                        subscriberId: dbSub.id,
                        customFieldId: customFieldDef.id,
                        value: String(value)
                    }
                });
            }
        }
    }

    revalidatePath(`/dashboard/lists/${listId}`);
}

export async function updateSubscriberAction(formData: FormData) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";
    if (!userId) throw new Error("Unauthorized");

    const subscriberId = formData.get("subscriberId") as string;
    const listId = formData.get("listId") as string;
    const email = formData.get("email") as string;
    const name = formData.get("name") as string | null;
    const status = formData.get("status") as string;
    const customFieldsJson = formData.get("customFieldsJson") as string;

    if (!subscriberId || !listId || !email) {
        throw new Error("Subscriber ID, List ID, and Email are required");
    }

    const whereCondition: any = currentUserRole === 'admin'
        ? { id: listId }
        : { id: listId, brand: { users: { some: { id: userId } } } };

    const list = await prisma.list.findFirst({
        where: whereCondition
    });

    if (!list) throw new Error("List not found or unauthorized");

    // Check if another subscriber uses this email in the same list.
    const existing = await prisma.subscriber.findUnique({
        where: { email_listId: { email, listId } }
    });

    if (existing && existing.id !== subscriberId) {
        throw new Error("Another subscriber is already using this email in this list.");
    }

    const customFieldsData = customFieldsJson ? JSON.parse(customFieldsJson) : {};

    await prisma.subscriber.update({
        where: { id: subscriberId },
        data: {
            email,
            name: name || null,
            status,
        }
    });

    // When manually resubscribing, remove brand-scoped suppression so dispatch
    // doesn't skip them. Global suppressions (brandId=null) stay — only admins
    // can remove those via the Deliverability page.
    if (status === "subscribed") {
        await prisma.suppressionList.deleteMany({
            where: { email, brandId: list.brandId },
        });
    }

    // Handle custom fields
    if (Object.keys(customFieldsData).length > 0) {
        const listCustomFields = await prisma.customField.findMany({
            where: { listId }
        });

        for (const [cfId, value] of Object.entries(customFieldsData)) {
            const customFieldDef = listCustomFields.find(cf => cf.id === cfId);

            if (customFieldDef) {
                await prisma.subscriberFieldValue.upsert({
                    where: {
                        subscriberId_customFieldId: {
                            subscriberId,
                            customFieldId: customFieldDef.id
                        }
                    },
                    update: { value: String(value) },
                    create: {
                        subscriberId,
                        customFieldId: customFieldDef.id,
                        value: String(value)
                    }
                });
            }
        }
    }

    revalidatePath(`/dashboard/lists/${listId}`);
}

/**
 * Resubscribe a subscriber: sets status → "subscribed", clears pausedUntil,
 * removes any brand-scoped suppression entry.
 *
 * Returns { globalSuppression: true } if a global suppression still exists
 * for this email — the caller should warn the admin to remove it manually
 * from the Deliverability page before sends will reach this address.
 */
export async function resubscribeSubscriber(subscriberId: string, listId: string) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";
    if (!userId) throw new Error("Unauthorized");

    const whereCondition: any = currentUserRole === "admin"
        ? { id: listId }
        : { id: listId, brand: { users: { some: { id: userId } } } };

    const list = await prisma.list.findFirst({ where: whereCondition });
    if (!list) throw new Error("List not found or unauthorized");

    const subscriber = await prisma.subscriber.findFirst({
        where: { id: subscriberId, listId },
    });
    if (!subscriber) throw new Error("Subscriber not found");

    await prisma.subscriber.update({
        where: { id: subscriberId },
        data: { status: "subscribed", pausedUntil: null },
    });

    // Remove brand-scoped suppression
    await prisma.suppressionList.deleteMany({
        where: { email: subscriber.email, brandId: list.brandId },
    });

    // Check if a global suppression remains (admin-only to remove)
    const globalSuppression = await prisma.suppressionList.findFirst({
        where: { email: subscriber.email, brandId: null },
    });

    revalidatePath(`/dashboard/lists/${listId}`);
    return { globalSuppression: !!globalSuppression };
}
