"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function verifyListAccess(listId: string) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const currentUserRole = (session?.user as any)?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const whereCondition: any = currentUserRole === 'admin'
        ? { id: listId }
        : { id: listId, brand: { users: { some: { id: userId } } } };

    const list = await prisma.list.findFirst({ where: whereCondition });
    if (!list) throw new Error("List not found or unauthorized");

    return list;
}

export async function getCustomFields(listId: string) {
    await verifyListAccess(listId);
    return await (prisma as any).customField.findMany({
        where: { listId },
        orderBy: { createdAt: 'asc' }
    });
}

export async function createCustomField(data: { listId: string, name: string, type: string, required?: boolean, options?: string }) {
    await verifyListAccess(data.listId);

    // Check if name already exists
    const existing = await (prisma as any).customField.findFirst({
        where: { listId: data.listId, name: data.name }
    });
    if (existing) throw new Error("Custom field with this name already exists");

    await (prisma as any).customField.create({
        data: {
            listId: data.listId,
            name: data.name,
            type: data.type,
            required: data.required || false,
            options: data.options || null
        }
    });

    revalidatePath(`/dashboard/lists/${data.listId}`);
    return { success: true };
}

export async function deleteCustomField(id: string, listId: string) {
    await verifyListAccess(listId);

    await (prisma as any).customField.delete({
        where: { id, listId }
    });

    revalidatePath(`/dashboard/lists/${listId}`);
    return { success: true };
}
