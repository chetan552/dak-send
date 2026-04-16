"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";

export async function importSubscribersAction(formData: FormData) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";

    if (!userId) {
        throw new Error("Unauthorized");
    }

    const listId = formData.get("listId") as string;
    const subscribersJsonStr = formData.get("subscribers") as string;

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

    const subscribersArr = JSON.parse(subscribersJsonStr) as { email: string, name?: string, customFields?: Record<string, string> }[];

    let importedCount = 0;

    // Fetch list custom fields to validate against and avoid querying inside the loop
    const listCustomFields = await prisma.customField.findMany({
        where: { listId }
    });

    for (const sub of subscribersArr) {
        if (!sub.email) continue;

        try {
            const dbSub = await prisma.subscriber.upsert({
                where: {
                    email_listId: {
                        email: sub.email,
                        listId,
                    }
                },
                update: {
                    name: sub.name || undefined,
                    status: "subscribed" // refresh status
                },
                create: {
                    email: sub.email,
                    name: sub.name || null,
                    listId,
                    hasConfirmedGdpr: list.requireGdpr
                }
            });

            // Handle custom fields
            if (sub.customFields && Object.keys(sub.customFields).length > 0) {
                for (const [cfId, fieldValue] of Object.entries(sub.customFields)) {
                    // Look up the custom field definition by its ID in our pre-fetched list
                    const customFieldDef = listCustomFields.find((cf: any) => cf.id === cfId);

                    if (customFieldDef) {
                        await prisma.subscriberFieldValue.upsert({
                            where: {
                                subscriberId_customFieldId: {
                                    subscriberId: dbSub.id,
                                    customFieldId: customFieldDef.id
                                }
                            },
                            update: { value: fieldValue },
                            create: {
                                subscriberId: dbSub.id,
                                customFieldId: customFieldDef.id,
                                value: fieldValue
                            }
                        });
                    }
                }
            }

            importedCount++;
        } catch (e) {
            console.warn("Failed inserting subscriber", sub.email, e);
        }
    }

    revalidatePath(`/dashboard/lists/${listId}`);
    return { importedCount };
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
