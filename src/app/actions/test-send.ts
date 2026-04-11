"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/aws";
import { renderEmail, buildUnsubscribeHeaders } from "@/lib/email-render";

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

    // Render with test personalization data.
    // tracking is omitted so test sends don't pollute open/click analytics.
    const testUnsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/unsubscribe?test=1`;
    const rendered = renderEmail({
        html: campaign.htmlText,
        plainText: campaign.plainText,
        subject: `[TEST] ${campaign.subject}`,
        personalization: {
            name: "Test User",
            email: testEmail,
            customFields: { Company: "Acme Corp", Website: "https://example.com" },
        },
        unsubscribeUrl: testUnsubscribeUrl,
        // no tracking — test sends should not affect analytics
    });

    const { listUnsubscribe, listUnsubscribePost } = buildUnsubscribeHeaders(
        testUnsubscribeUrl,
        campaign.brand.fromEmail,
    );

    await sendEmail({
        FromEmailAddress: `${campaign.brand.fromName || campaign.brand.name} <${campaign.brand.fromEmail}>`,
        Destination: { ToAddresses: [testEmail] },
        ReplyToAddresses: campaign.brand.replyTo ? [campaign.brand.replyTo] : [],
        Content: {
            Simple: {
                Subject: { Data: `[TEST] ${campaign.subject}` },
                Body: {
                    Html: { Data: rendered.html },
                    Text: { Data: rendered.text },
                },
                Headers: [
                    { Name: "List-Unsubscribe",      Value: listUnsubscribe },
                    { Name: "List-Unsubscribe-Post", Value: listUnsubscribePost },
                    { Name: "Precedence",            Value: "bulk" },
                    { Name: "X-Test-Send",           Value: "true" },
                ],
            },
        },
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
