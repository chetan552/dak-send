"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function signUp(name: string, email: string, password: string) {
    // Check if any users already exist
    const userCount = await prisma.user.count();

    if (userCount > 0) {
        throw new Error("Registration is closed. Contact your administrator.");
    }

    // Validate inputs
    if (!name.trim()) throw new Error("Name is required.");
    if (!email.trim()) throw new Error("Email is required.");
    if (password.length < 8) throw new Error("Password must be at least 8 characters.");

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error("An account with this email already exists.");

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.create({
        data: {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: hashedPassword,
            role: "admin", // First user is always admin
        },
    });

    return { success: true };
}

export async function hasUsers(): Promise<boolean> {
    const count = await prisma.user.count();
    return count > 0;
}
