import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { EmailPreview } from "@/components/campaign/email-preview";
import { ArrowLeft, Eye } from "lucide-react";
import Link from "next/link";

export default async function CampaignPreviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;

    const userId = (session.user as any)?.id;
    const role = (session.user as any)?.role || "user";

    const where: any = role === "admin"
        ? { id }
        : { id, brand: { users: { some: { id: userId } } } };

    const campaign = await prisma.campaign.findFirst({ where });
    if (!campaign) return notFound();

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400">
                <Link href={`/dashboard/campaigns/${id}`} className="hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Campaign
                </Link>
            </div>

            <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-3">
                    <Eye className="w-7 h-7 text-teal-500" />
                    Email Preview
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    Preview how <strong>{campaign.name}</strong> looks across email clients.
                </p>
            </div>

            <EmailPreview html={campaign.htmlText} subject={campaign.subject} />
        </div>
    );
}
