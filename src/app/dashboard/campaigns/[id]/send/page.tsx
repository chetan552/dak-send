import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { ListSelectionForm } from "@/components/campaign/list-selection";

export default async function SendCampaignPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const currentUserRole = (session?.user as any)?.role || "user";
    const whereCondition: any = currentUserRole === 'admin'
        ? { id }
        : { id, brand: { users: { some: { id: userId } } } };

    const campaign = await prisma.campaign.findFirst({
        where: whereCondition,
        include: { brand: true }
    });

    if (!campaign) notFound();

    if (campaign.status !== 'draft') {
        redirect(`/dashboard/campaigns/${campaign.id}`);
    }

    // Get all lists for this brand that have active subscribers
    const lists = await (prisma as any).list.findMany({
        where: {
            brandId: campaign.brandId,
        },
        include: {
            segments: true,
            _count: {
                select: {
                    subscribers: { where: { status: 'subscribed' } }
                }
            }
        }
    });

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400 mb-2">
                <Link href={`/dashboard/campaigns/${campaign.id}`} className="hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Campaign
                </Link>
            </div>

            <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-1">Send Campaign</h1>
                <p className="text-zinc-500 dark:text-zinc-400">Select the lists you want to dispatch <span className="text-zinc-900 dark:text-white font-medium">{campaign.name}</span> to.</p>
            </div>

            <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-xl text-zinc-900 dark:text-white flex items-center gap-2">
                        <Send className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Dispatch Details
                    </CardTitle>
                    <CardDescription className="text-zinc-500 dark:text-zinc-400">
                        Emails will be queued and sent via AWS SES in the background. Duplicate emails across selected lists will be automatically ignored.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ListSelectionForm lists={lists} campaignId={campaign.id} />
                </CardContent>
            </Card>

            <div className="text-sm text-zinc-500 dark:text-zinc-500 text-center">
                <p>You are sending as <strong className="text-zinc-900 dark:text-zinc-400">{campaign.brand.fromName}</strong> ({campaign.brand.fromEmail}).</p>
            </div>
        </div>
    );
}
