"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

// List all automations the user can access
export async function getAutomations() {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const role = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const where: any = role === "admin"
        ? {}
        : { brand: { users: { some: { id: userId } } } };

    return prisma.automation.findMany({
        where,
        include: {
            brand: { select: { name: true } },
            steps: { select: { id: true }, orderBy: { order: "asc" } },
            _count: { select: { enrollments: true } },
        },
        orderBy: { createdAt: "desc" },
    });
}

// Get a single automation with all steps and enrollment stats
export async function getAutomation(id: string) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const role = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const where: any = role === "admin"
        ? { id }
        : { id, brand: { users: { some: { id: userId } } } };

    const automation = await prisma.automation.findFirst({
        where,
        include: {
            brand: { select: { name: true, id: true, fromEmail: true, fromName: true } },
            steps: { orderBy: { order: "asc" } },
            _count: { select: { enrollments: true } },
        },
    });

    if (!automation) throw new Error("Automation not found");

    // Get enrollment stats
    const activeCount = await prisma.automationEnrollment.count({
        where: { automationId: id, status: "active" },
    });
    const completedCount = await prisma.automationEnrollment.count({
        where: { automationId: id, status: "completed" },
    });

    return { ...automation, activeCount, completedCount };
}

// Create a new automation
export async function createAutomation(data: {
    name: string;
    brandId: string;
    trigger: string;
    triggerListId?: string;
}) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const role = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    // Verify brand access
    const brandWhere: any = role === "admin"
        ? { id: data.brandId }
        : { id: data.brandId, users: { some: { id: userId } } };

    const brand = await prisma.brand.findFirst({ where: brandWhere });
    if (!brand) throw new Error("Brand not found or access denied");

    const isWebhookTrigger = data.trigger === "webhook";
    const webhookSecret = isWebhookTrigger
        ? crypto.randomBytes(32).toString("hex")
        : null;

    const automation = await prisma.automation.create({
        data: {
            name: data.name,
            brandId: data.brandId,
            trigger: data.trigger,
            triggerListId: data.triggerListId || null,
            webhookSecret,
            status: "draft",
        },
    });

    revalidatePath("/dashboard/automations");
    return automation;
}

// Update automation metadata
export async function updateAutomation(id: string, data: {
    name?: string;
    trigger?: string;
    triggerListId?: string;
    status?: string;
}) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const role = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const where: any = role === "admin"
        ? { id }
        : { id, brand: { users: { some: { id: userId } } } };

    const automation = await prisma.automation.findFirst({ where });
    if (!automation) throw new Error("Automation not found");

    const updated = await prisma.automation.update({
        where: { id },
        data,
    });

    revalidatePath("/dashboard/automations");
    revalidatePath(`/dashboard/automations/${id}`);
    return updated;
}

// Delete an automation
export async function deleteAutomation(id: string) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const role = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const where: any = role === "admin"
        ? { id }
        : { id, brand: { users: { some: { id: userId } } } };

    const automation = await prisma.automation.findFirst({ where });
    if (!automation) throw new Error("Automation not found");

    await prisma.automation.delete({ where: { id } });

    revalidatePath("/dashboard/automations");
}

// Add a step to an automation
export async function addStep(automationId: string, data: {
    type: string;
    delayMinutes?: number;
    emailSubject?: string;
    emailHtml?: string;
}) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const role = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const automationWhere: any = role === "admin"
        ? { id: automationId }
        : { id: automationId, brand: { users: { some: { id: userId } } } };

    const automation = await prisma.automation.findFirst({ where: automationWhere });
    if (!automation) throw new Error("Automation not found");

    // Get the highest order number
    const lastStep = await prisma.automationStep.findFirst({
        where: { automationId },
        orderBy: { order: "desc" },
    });

    const order = lastStep ? lastStep.order + 1 : 0;

    const step = await prisma.automationStep.create({
        data: {
            automationId,
            order,
            type: data.type,
            delayMinutes: data.delayMinutes || null,
            emailSubject: data.emailSubject || null,
            emailHtml: data.emailHtml || null,
        },
    });

    revalidatePath(`/dashboard/automations/${automationId}`);
    return step;
}

// Update a step
export async function updateStep(stepId: string, data: {
    type?: string;
    delayMinutes?: number;
    emailSubject?: string;
    emailHtml?: string;
}) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    const step = await prisma.automationStep.findUnique({
        where: { id: stepId },
        include: { automation: true },
    });
    if (!step) throw new Error("Step not found");

    const updated = await prisma.automationStep.update({
        where: { id: stepId },
        data: {
            type: data.type ?? step.type,
            delayMinutes: data.delayMinutes !== undefined ? data.delayMinutes : step.delayMinutes,
            emailSubject: data.emailSubject !== undefined ? data.emailSubject : step.emailSubject,
            emailHtml: data.emailHtml !== undefined ? data.emailHtml : step.emailHtml,
        },
    });

    revalidatePath(`/dashboard/automations/${step.automationId}`);
    return updated;
}

// Delete a step
export async function deleteStep(stepId: string) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    const step = await prisma.automationStep.findUnique({
        where: { id: stepId },
    });
    if (!step) throw new Error("Step not found");

    await prisma.automationStep.delete({ where: { id: stepId } });

    // Re-order remaining steps
    const remainingSteps = await prisma.automationStep.findMany({
        where: { automationId: step.automationId },
        orderBy: { order: "asc" },
    });

    for (let i = 0; i < remainingSteps.length; i++) {
        await prisma.automationStep.update({
            where: { id: remainingSteps[i].id },
            data: { order: i },
        });
    }

    revalidatePath(`/dashboard/automations/${step.automationId}`);
}

// Enroll a subscriber into an automation (called by trigger hooks)
export async function enrollSubscriber(automationId: string, subscriberEmail: string, subscriberId?: string) {
    // Check if already enrolled
    const existing = await prisma.automationEnrollment.findUnique({
        where: {
            automationId_subscriberEmail: {
                automationId,
                subscriberEmail,
            },
        },
    });

    if (existing) return existing; // Already enrolled, skip

    // Get the first step
    const firstStep = await prisma.automationStep.findFirst({
        where: { automationId },
        orderBy: { order: "asc" },
    });

    if (!firstStep) return null; // No steps, nothing to do

    // Calculate initial nextProcessAt
    let nextProcessAt = new Date();
    if (firstStep.type === "delay") {
        nextProcessAt = new Date(Date.now() + (firstStep.delayMinutes || 0) * 60 * 1000);
    }

    const enrollment = await prisma.automationEnrollment.create({
        data: {
            automationId,
            subscriberEmail,
            subscriberId: subscriberId || null,
            currentStepId: firstStep.id,
            status: "active",
            nextProcessAt,
        },
    });

    return enrollment;
}
