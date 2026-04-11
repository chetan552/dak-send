"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createList(formData: FormData) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";

    if (!userId) {
        throw new Error("Unauthorized");
    }

    const name = formData.get("name") as string;
    const brandId = formData.get("brandId") as string;

    if (!name || !brandId) {
        throw new Error("Name and Brand ID are required");
    }

    const whereCondition: any = currentUserRole === 'admin'
        ? { id: brandId }
        : { id: brandId, users: { some: { id: userId } } };

    const brand = await prisma.brand.findFirst({
        where: whereCondition
    });

    if (!brand) {
        throw new Error("Brand not found or unauthorized");
    }

    const list = await prisma.list.create({
        data: {
            name,
            brandId,
        },
    });

    revalidatePath(`/dashboard/brands/${brandId}`);
    revalidatePath("/dashboard/lists");

    return list;
}

export async function updateListSettings(listId: string, data: {
    name?: string;
    optIn?: string;
    requireGdpr?: boolean;
    optInConfirmationUrl?: string;
    unsubscribeConfirmationUrl?: string;
    welcomeEmailHtml?: string;
    goodbyeEmailHtml?: string;
}) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const whereCondition: any = currentUserRole === 'admin'
        ? { id: listId }
        : { id: listId, brand: { users: { some: { id: userId } } } };

    const list = await prisma.list.findFirst({ where: whereCondition });
    if (!list) throw new Error("List not found or unauthorized");

    await prisma.list.update({
        where: { id: listId },
        data
    });

    revalidatePath(`/dashboard/lists/${listId}`);
    return { success: true };
}
