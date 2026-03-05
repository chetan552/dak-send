"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DEFAULT_FORM_CONFIG } from "@/lib/form-config";
import type { FormConfig } from "@/lib/form-config";

export async function getSignupForms() {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const role = (session?.user as any)?.role || "user";
    if (!userId) throw new Error("Unauthorized");

    const where = role === "admin"
        ? {}
        : { brand: { users: { some: { id: userId } } } };

    return (prisma as any).signupForm.findMany({
        where,
        include: {
            brand: { select: { name: true } },
            list: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
    });
}

export async function createSignupForm(data: {
    name: string;
    slug: string;
    brandId: string;
    listId: string;
}) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) throw new Error("Unauthorized");

    // Check slug uniqueness
    const existing = await (prisma as any).signupForm.findUnique({
        where: { slug: data.slug },
    });
    if (existing) throw new Error("This URL slug is already taken.");

    const form = await (prisma as any).signupForm.create({
        data: {
            name: data.name,
            slug: data.slug,
            brandId: data.brandId,
            listId: data.listId,
            userId,
            config: DEFAULT_FORM_CONFIG,
        },
    });

    revalidatePath("/dashboard/forms");
    return form;
}

export async function updateSignupForm(id: string, config: Partial<FormConfig>) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const role = (session?.user as any)?.role || "user";
    if (!userId) throw new Error("Unauthorized");

    const where: any = role === "admin" ? { id } : { id, brand: { users: { some: { id: userId } } } };
    const form = await (prisma as any).signupForm.findFirst({ where });
    if (!form) throw new Error("Form not found");

    const currentConfig = (form.config || {}) as Record<string, any>;
    const mergedConfig = { ...DEFAULT_FORM_CONFIG, ...currentConfig, ...config };

    await (prisma as any).signupForm.update({
        where: { id },
        data: { config: mergedConfig },
    });

    revalidatePath(`/dashboard/forms/${id}`);
    revalidatePath("/dashboard/forms");
}

export async function updateSignupFormStatus(id: string, status: string) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const role = (session?.user as any)?.role || "user";
    if (!userId) throw new Error("Unauthorized");

    const where: any = role === "admin" ? { id } : { id, brand: { users: { some: { id: userId } } } };
    const form = await (prisma as any).signupForm.findFirst({ where });
    if (!form) throw new Error("Form not found");

    await (prisma as any).signupForm.update({
        where: { id },
        data: { status },
    });

    revalidatePath("/dashboard/forms");
}

export async function deleteSignupForm(id: string) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const role = (session?.user as any)?.role || "user";
    if (!userId) throw new Error("Unauthorized");

    const where: any = role === "admin" ? { id } : { id, brand: { users: { some: { id: userId } } } };
    const form = await (prisma as any).signupForm.findFirst({ where });
    if (!form) throw new Error("Form not found");

    await (prisma as any).signupForm.delete({ where: { id } });
    revalidatePath("/dashboard/forms");
}

export async function getSignupFormById(id: string) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const role = (session?.user as any)?.role || "user";
    if (!userId) throw new Error("Unauthorized");

    const where: any = role === "admin" ? { id } : { id, brand: { users: { some: { id: userId } } } };
    return (prisma as any).signupForm.findFirst({
        where,
        include: {
            brand: { select: { name: true } },
            list: { select: { name: true, customFields: true } },
        },
    });
}

// Public: get form by slug (no auth)
export async function getSignupFormBySlug(slug: string) {
    const form = await (prisma as any).signupForm.findUnique({
        where: { slug },
        include: {
            brand: { select: { name: true } },
            list: { select: { name: true, optIn: true, requireGdpr: true, customFields: true } },
        },
    });
    return form;
}

// Increment stats (no auth — called from public pages)
export async function incrementFormViews(id: string) {
    await (prisma as any).signupForm.update({
        where: { id },
        data: { views: { increment: 1 } },
    });
}

export async function incrementFormSubmissions(id: string) {
    await (prisma as any).signupForm.update({
        where: { id },
        data: { submissions: { increment: 1 } },
    });
}

