import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { EmailPreview } from "@/components/campaign/email-preview";
import { ArrowLeft, Eye } from "lucide-react";
import Link from "next/link";
import { CampaignSteps } from "@/components/campaign/campaign-steps";

export default async function CampaignPreviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;

    const userId = session.user?.id;
    const role = session.user?.role || "user";

    const where: any = role === "admin"
        ? { id }
        : { id, brand: { users: { some: { id: userId } } } };

    const campaign = await prisma.campaign.findFirst({ where });
    if (!campaign) return notFound();

    // Apply merge tag substitution with preview placeholders so the preview
    // accurately reflects what a real recipient will see.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const previewUnsubscribeUrl = `${appUrl}/api/unsubscribe?i=preview&l=preview`;

    const previewHtml = campaign.htmlText
        .replace(/\[Name\]/gi, 'John')
        .replace(/\[Email\]/gi, 'john@example.com')
        .replace(/\[UnsubscribeUrl\]/gi, previewUnsubscribeUrl)
        .replace(/\[Unsubscribe\]/gi, `<a href="${previewUnsubscribeUrl}">Unsubscribe</a>`)
        .replace(/\[CustomField:[^\]]+\]/gi, '(custom field)');

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400">
                <Link href={`/dashboard/campaigns/${id}`} className="hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Campaign
                </Link>
            </div>

            {campaign.status === "draft" && <CampaignSteps campaignId={id} current="preview" />}

            <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-3">
                    <Eye className="w-7 h-7 text-teal-500" />
                    Email Preview
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    Preview how <strong>{campaign.name}</strong> looks across email clients. Merge tags are shown with sample values.
                </p>
            </div>

            <EmailPreview html={previewHtml} subject={campaign.subject} />
        </div>
    );
}
