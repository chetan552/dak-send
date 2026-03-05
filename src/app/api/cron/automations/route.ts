import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emailQueue } from "@/lib/queue";

export async function GET(req: NextRequest) {
    // Verify cron secret
    const secret = req.nextUrl.searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && secret !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const now = new Date();

        // Find all active enrollments that are due for processing
        const dueEnrollments = await (prisma as any).automationEnrollment.findMany({
            where: {
                status: "active",
                nextProcessAt: { lte: now },
            },
            include: {
                automation: {
                    include: {
                        brand: true,
                        steps: { orderBy: { order: "asc" } },
                    },
                },
                currentStep: true,
            },
            take: 100, // Process in batches
        });

        let processed = 0;
        let emailsSent = 0;

        for (const enrollment of dueEnrollments) {
            try {
                const { automation, currentStep } = enrollment;

                // Skip if automation is no longer active
                if (automation.status !== "active") {
                    await (prisma as any).automationEnrollment.update({
                        where: { id: enrollment.id },
                        data: { status: "paused" },
                    });
                    continue;
                }

                if (!currentStep) {
                    // No current step — mark as completed
                    await (prisma as any).automationEnrollment.update({
                        where: { id: enrollment.id },
                        data: { status: "completed", completedAt: now },
                    });
                    processed++;
                    continue;
                }

                const steps = automation.steps;
                const currentIndex = steps.findIndex((s: any) => s.id === currentStep.id);

                if (currentStep.type === "email") {
                    // Queue the email via existing BullMQ worker
                    const subscriber = enrollment.subscriberId
                        ? await prisma.subscriber.findUnique({
                            where: { id: enrollment.subscriberId },
                            select: { id: true, email: true, name: true, listId: true },
                        })
                        : null;

                    const subscriberEmail = enrollment.subscriberEmail;
                    const subscriberName = subscriber?.name || "";
                    const listId = subscriber?.listId || automation.triggerListId;

                    // Create a temporary campaign-like structure for the worker
                    // We use the automation email queue which uses the same worker
                    const trackingBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

                    // Process HTML personalization
                    let processedHtml = (currentStep.emailHtml || "")
                        .replace(/\[Name\]/gi, subscriberName || "Friend")
                        .replace(/\[Email\]/gi, subscriberEmail);

                    // Add unsubscribe link
                    if (subscriber) {
                        const unsubscribeUrl = `${trackingBaseUrl}/api/unsubscribe?i=${encodeURIComponent(subscriber.id)}&l=${encodeURIComponent(listId)}`;
                        processedHtml = processedHtml.replace(/\[Unsubscribe\]/gi, `<a href="${unsubscribeUrl}">Unsubscribe</a>`);
                    }

                    // Queue the email directly (not via campaign worker, but directly to SES)
                    await emailQueue.add("send-automation-email", {
                        automationId: automation.id,
                        enrollmentId: enrollment.id,
                        stepId: currentStep.id,
                        subscriberEmail,
                        subscriberName,
                        subscriberId: subscriber?.id,
                        listId,
                        subject: currentStep.emailSubject || "No Subject",
                        html: processedHtml,
                        brandFromEmail: automation.brand.fromEmail,
                        brandFromName: automation.brand.fromName || automation.brand.name,
                        brandReplyTo: automation.brand.replyTo,
                    });

                    emailsSent++;
                }

                // Advance to next step
                const nextIndex = currentIndex + 1;

                if (nextIndex >= steps.length) {
                    // No more steps — mark as completed
                    await (prisma as any).automationEnrollment.update({
                        where: { id: enrollment.id },
                        data: {
                            status: "completed",
                            completedAt: now,
                            currentStepId: null,
                            nextProcessAt: null,
                        },
                    });
                } else {
                    const nextStep = steps[nextIndex];
                    let nextProcessAt = now;

                    if (nextStep.type === "delay") {
                        nextProcessAt = new Date(now.getTime() + (nextStep.delayMinutes || 0) * 60 * 1000);
                    }

                    await (prisma as any).automationEnrollment.update({
                        where: { id: enrollment.id },
                        data: {
                            currentStepId: nextStep.id,
                            nextProcessAt,
                        },
                    });
                }

                processed++;
            } catch (err) {
                console.error(`Error processing enrollment ${enrollment.id}:`, err);
            }
        }

        return NextResponse.json({
            success: true,
            processed,
            emailsSent,
            total: dueEnrollments.length,
        });
    } catch (error: any) {
        console.error("Automation cron error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
