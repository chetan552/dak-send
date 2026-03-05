"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function deleteBrand(id: string) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const role = (session?.user as any)?.role;

    if (!userId || role !== 'admin') {
        throw new Error("Only admins can delete brands");
    }

    await prisma.brand.delete({
        where: { id }
    });

    revalidatePath("/dashboard");
}
