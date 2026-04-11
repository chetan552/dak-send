"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/aws";

export async function sendTestEmail(campaignId: string, testEmail: string) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const whereCondition: any = currentUserRole === 'admin'
        ? { id: campaignId }
        : { id: campaignId, brand: { users: { some: { id: userId } } } };

    const campaign = await prisma.campaign.findFirst({
        where: whereCondition,
        include: { brand: true }
    });

    if (!campaign) throw new Error("Campaign not found or unauthorized");

    if (!campaign.brand.fromEmail) {
        throw new Error("Brand sender email is not configured");
    }

    // Process merge tags with test data
    let processedHtml = campaign.htmlText
        .replace(/\[Name\]/gi, "Test User")
        .replace(/\[Email\]/gi, testEmail)
        .replace(/\[Unsubscribe\]/gi, `<a href="#">Unsubscribe (test)</a>`)
        .replace(/\[CustomField:[^\]]+\]/gi, "[Test Value]");

    await sendEmail({
        FromEmailAddress: `${campaign.brand.fromName || campaign.brand.name} <${campaign.brand.fromEmail}>`,
        Destination: { ToAddresses: [testEmail] },
        ReplyToAddresses: campaign.brand.replyTo ? [campaign.brand.replyTo] : [],
        Content: {
            Simple: {
                Subject: { Data: `[TEST] ${campaign.subject}` },
                Body: { Html: { Data: processedHtml } }
            }
        }
    });

    return { success: true, message: `Test email sent to ${testEmail}` };
}

export async function scheduleCampaign(campaignId: string, scheduledAt: string, data: {
    includedLists: string[];
    excludedLists: string[];
    includedSegments: string[];
    excludedSegments: string[];
}) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";

    if (!userId) throw new Error("Unauthorized");

    const whereCondition: any = currentUserRole === 'admin'
        ? { id: campaignId }
        : { id: campaignId, brand: { users: { some: { id: userId } } } };

    const campaign = await prisma.campaign.findFirst({
        where: whereCondition
    });

    if (!campaign || campaign.status !== 'draft') {
        throw new Error("Invalid campaign");
    }

    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate <= new Date()) {
        throw new Error("Scheduled time must be in the future");
    }

    await prisma.campaign.update({
        where: { id: campaignId },
        data: {
            status: "scheduled",
            scheduledAt: scheduledDate,
            includedLists: { set: data.includedLists.map((id: string) => ({ id })) },
            excludedLists: { set: data.excludedLists.map((id: string) => ({ id })) },
            includedSegments: { set: data.includedSegments.map((id: string) => ({ id })) },
            excludedSegments: { set: data.excludedSegments.map((id: string) => ({ id })) },
        }
    });

    return { success: true };
}
