import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Send, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { CampaignCardActions } from "@/components/campaign/campaign-card-actions";
import { PageHeader } from "@/components/ui/page-header";

export default async function CampaignsPage() {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const currentUserRole = session?.user?.role || "user";

    const campaigns = await prisma.campaign.findMany({
        where: currentUserRole === 'admin'
            ? undefined
            : { brand: { users: { some: { id: userId } } } },
        include: {
            brand: true,
        },
        orderBy: { createdAt: 'desc' }
    });

    const sendingCount = campaigns.filter(c => c.status === 'sending').length;
    const scheduledCount = campaigns.filter(c => c.status === 'scheduled').length;

    const metaBits: string[] = [];
    if (campaigns.length) metaBits.push(`${campaigns.length} total`);
    if (sendingCount) metaBits.push(`${sendingCount} sending`);
    if (scheduledCount) metaBits.push(`${scheduledCount} scheduled`);

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader
                title="Campaigns"
                description="Design and dispatch perfect email campaigns."
                meta={metaBits.length > 0 && <span className="chip">{metaBits.join(" · ")}</span>}
                action={
                    <Link href="/dashboard/campaigns/new">
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" /> Create Campaign
                        </Button>
                    </Link>
                }
            />

            {campaigns.length === 0 ? (
                <EmptyState
                    icon={Send}
                    title="No campaigns yet"
                    description="Craft a beautiful email and send it to your audience."
                    action={
                        <Link href="/dashboard/campaigns/new">
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" /> Draft first campaign
                            </Button>
                        </Link>
                    }
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {campaigns.map((campaign, i) => (
                        <article
                            key={campaign.id}
                            className="surface-card p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors group animate-in fade-in slide-in-from-bottom-4"
                            style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
                        >
                            <div className="flex items-start justify-between gap-3 mb-1.5">
                                <Link
                                    href={`/dashboard/campaigns/${campaign.id}`}
                                    className="block min-w-0 flex-1 text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-white group-hover:text-primary transition-colors truncate"
                                    title={campaign.name}
                                >
                                    {campaign.name}
                                </Link>
                                <StatusBadge status={campaign.status} className="shrink-0 mt-0.5" />
                            </div>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate" title={campaign.subject}>
                                {campaign.subject}
                            </p>
                            {campaign.status === 'scheduled' && campaign.scheduledAt && (
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                                    Sends {new Date(campaign.scheduledAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            )}
                            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800/60 flex items-center justify-between gap-2">
                                <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2 min-w-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 block shrink-0" />
                                    <span className="truncate">{campaign.brand.name}</span>
                                </div>
                                <CampaignCardActions
                                    campaignId={campaign.id}
                                    status={campaign.status as "draft" | "scheduled" | "sending" | "sent" | "cancelled" | "failed"}
                                />
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
