"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { translateSegmentQuery } from "@/lib/segment-query";


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

export async function getSegments(listId: string) {
    await verifyListAccess(listId);
    return await (prisma as any).segment.findMany({
        where: { listId },
        orderBy: { createdAt: 'desc' }
    });
}

export async function createSegment(data: { listId: string, name: string, description?: string, query: string }) {
    await verifyListAccess(data.listId);

    // Validate JSON
    try {
        JSON.parse(data.query);
    } catch {
        throw new Error("Invalid JSON format");
    }

    await (prisma as any).segment.create({
        data: {
            listId: data.listId,
            name: data.name,
            description: data.description,
            query: data.query
        }
    });

    revalidatePath(`/dashboard/lists/${data.listId}`);
    return { success: true };
}

export async function deleteSegment(id: string, listId: string) {
    await verifyListAccess(listId);

    await (prisma as any).segment.delete({
        where: { id, listId }
    });

    revalidatePath(`/dashboard/lists/${listId}`);
    return { success: true };
}

export async function previewSegment(segmentId: string, listId: string) {
    await verifyListAccess(listId);

    const segment = await (prisma as any).segment.findFirst({
        where: { id: segmentId, listId },
    });
    if (!segment) throw new Error("Segment not found");

    let rawQuery: any = {};
    try {
        rawQuery = JSON.parse(segment.query);
    } catch {
        throw new Error("Invalid segment query");
    }

    const translatedWhere = translateSegmentQuery(rawQuery);

    const [subscribers, total] = await Promise.all([
        prisma.subscriber.findMany({
            where: { ...translatedWhere, listId },
            select: {
                id: true, email: true, name: true, status: true, createdAt: true,
                customFields: { include: { customField: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
        }),
        prisma.subscriber.count({
            where: { ...translatedWhere, listId },
        }),
    ]);

    return {
        subscribers: subscribers.map(s => ({
            id: s.id,
            email: s.email,
            name: s.name,
            status: s.status,
            createdAt: s.createdAt.toISOString(),
            customFields: s.customFields.reduce((acc: Record<string, string>, cf: any) => {
                acc[cf.customField.name] = cf.value;
                return acc;
            }, {}),
        })),
        total,
        showing: Math.min(subscribers.length, 100),
    };
}
