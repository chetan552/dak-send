"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function createUser(formData: FormData) {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    if (role !== "admin") {
        throw new Error("Unauthorized: Only admins can create users");
    }

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const newRole = formData.get("role") as string;

    if (!email || !password || !newRole) {
        throw new Error("Missing required fields");
    }

    const existingUser = await prisma.user.findUnique({
        where: { email }
    });

    if (existingUser) {
        throw new Error("A user with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            role: newRole,
        }
    });

    revalidatePath("/dashboard/settings");
    return user;
}

export async function deleteUser(userId: string) {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    const currentUserId = (session?.user as any)?.id;

    if (role !== "admin") throw new Error("Unauthorized");
    if (currentUserId === userId) throw new Error("Cannot delete yourself");

    await prisma.user.delete({
        where: { id: userId }
    });

    revalidatePath("/dashboard/settings");
}

export async function deleteUsers(userIds: string[]) {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    const currentUserId = (session?.user as any)?.id;

    if (role !== "admin") throw new Error("Unauthorized");
    if (!Array.isArray(userIds) || userIds.length === 0) throw new Error("No users selected");
    if (userIds.includes(currentUserId)) throw new Error("Cannot delete yourself");

    await prisma.user.deleteMany({
        where: { id: { in: userIds } }
    });

    revalidatePath("/dashboard/settings");
}

export async function changePassword(currentPassword: string, newPassword: string) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
        throw new Error("Not authenticated");
    }

    if (!currentPassword || !newPassword) {
        throw new Error("Both current and new passwords are required");
    }

    if (newPassword.length < 8) {
        throw new Error("New password must be at least 8 characters");
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true },
    });

    if (!user) {
        throw new Error("User not found");
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
        throw new Error("Current password is incorrect");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
    });

    return { success: true };
}
