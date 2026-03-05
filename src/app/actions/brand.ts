"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createBrand(formData: FormData) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const role = (session?.user as any)?.role;

    if (!userId || role !== 'admin') {
        throw new Error("Unauthorized");
    }

    const name = formData.get("name") as string;
    const fromName = formData.get("fromName") as string;
    const fromEmail = formData.get("fromEmail") as string;
    const replyTo = formData.get("replyTo") as string;

    if (!name) {
        throw new Error("Brand name is required");
    }

    // Verify the user exists in the database (protects against stale JWT sessions)
    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
        throw new Error("Your session appears invalid. Please log out and log back in.");
    }

    const brand = await prisma.brand.create({
        data: {
            name,
            fromName: fromName || null,
            fromEmail: fromEmail || null,
            replyTo: replyTo || null,
            userId, // Owner
            users: {
                connect: { id: userId } // Initial access granted to owner
            }
        },
    });

    revalidatePath("/dashboard");
    return brand;
}

export async function assignUserToBrand(brandId: string, emailToAssign: string) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const role = (session?.user as any)?.role;

    // Only admin or the brand owner can assign
    if (!userId) throw new Error("Unauthorized");

    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand || (role !== 'admin' && brand.userId !== userId)) {
        throw new Error("Unauthorized to manage this brand");
    }

    const userToAssign = await prisma.user.findUnique({ where: { email: emailToAssign } });
    if (!userToAssign) throw new Error("User with that email not found");

    await prisma.brand.update({
        where: { id: brandId },
        data: {
            users: {
                connect: { id: userToAssign.id }
            }
        }
    });

    revalidatePath("/dashboard/settings");
    revalidatePath(`/dashboard/brands/${brandId}`);
}

export async function removeUserFromBrand(brandId: string, userIdToRemove: string) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const role = (session?.user as any)?.role;

    if (!userId) throw new Error("Unauthorized");

    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand || (role !== 'admin' && brand.userId !== userId)) {
        throw new Error("Unauthorized to manage this brand");
    }

    if (brand.userId === userIdToRemove) {
        throw new Error("Cannot remove the owner from the brand");
    }

    await prisma.brand.update({
        where: { id: brandId },
        data: {
            users: {
                disconnect: { id: userIdToRemove }
            }
        }
    });

    revalidatePath("/dashboard/settings");
    revalidatePath(`/dashboard/brands/${brandId}`);
}

export async function updateBrandSettings(brandId: string, formData: FormData) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const role = (session?.user as any)?.role;

    if (!userId) throw new Error("Unauthorized");

    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand || (role !== 'admin' && brand.userId !== userId)) {
        throw new Error("Unauthorized to manage this brand");
    }

    const name = formData.get("name") as string;
    const fromName = formData.get("fromName") as string;
    const fromEmail = formData.get("fromEmail") as string;
    const replyTo = formData.get("replyTo") as string;

    if (!name) {
        throw new Error("Brand name is required");
    }

    await prisma.brand.update({
        where: { id: brandId },
        data: {
            name,
            fromName: fromName || null,
            fromEmail: fromEmail || null,
            replyTo: replyTo || null,
        },
    });

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/brands/${brandId}`);
}
