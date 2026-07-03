import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { Send, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { CampaignsView } from "@/components/campaign/campaigns-view";
import { CampaignStatusTabs } from "@/components/campaign/campaign-status-tabs";
import { Pagination } from "@/components/ui/pagination";

const PAGE_SIZE = 12;
const VALID_STATUSES = new Set(["draft", "scheduled", "sending", "sent", "cancelled", "failed"]);

export default async function CampaignsPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string; page?: string }>;
}) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";

    const sp = await searchParams;
    const status = sp.status && VALID_STATUSES.has(sp.status) ? sp.status : undefined;
    const requestedPage = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

    // Brand-scoping applies to both the counts and the paged query.
    const baseWhere: Prisma.CampaignWhereInput =
        currentUserRole === "admin" ? {} : { brand: { users: { some: { id: userId } } } };
    const where: Prisma.CampaignWhereInput = status ? { ...baseWhere, status } : baseWhere;

    // Per-status counts (for the tab badges) + total for the current filter.
    const [grouped, total] = await Promise.all([
        prisma.campaign.groupBy({
            by: ["status"],
            where: baseWhere,
            _count: { _all: true },
        }),
        prisma.campaign.count({ where }),
    ]);

    const counts = grouped.reduce<Record<string, number>>((acc, g) => {
        acc[g.status] = g._count._all;
        return acc;
    }, {});
    const totalAll = grouped.reduce((sum, g) => sum + g._count._all, 0);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(requestedPage, totalPages);

    const campaigns = await prisma.campaign.findMany({
        where,
        include: { brand: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
    });

    const metaBits: string[] = [];
    if (totalAll) metaBits.push(`${totalAll} total`);
    if (counts.sending) metaBits.push(`${counts.sending} sending`);
    if (counts.scheduled) metaBits.push(`${counts.scheduled} scheduled`);

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

            {totalAll === 0 ? (
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
                <>
                    <CampaignStatusTabs counts={counts} total={totalAll} activeStatus={status} />
                    {campaigns.length === 0 ? (
                        <div className="surface-card p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
                            No campaigns with this status.
                        </div>
                    ) : (
                        <CampaignsView campaigns={campaigns} />
                    )}
                    <Pagination currentPage={page} totalPages={totalPages} />
                </>
            )}
        </div>
    );
}
