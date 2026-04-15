import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Building2, ExternalLink, Users, Send, MailOpen, MousePointerClick, ArrowRight } from "lucide-react";
import Link from "next/link";
import { CreateBrandButton } from "@/components/brand/create-brand-button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);
    const currentUserRole = session?.user?.role || "user";
    const userId = session?.user?.id;

    const brandWhere = currentUserRole === 'admin'
        ? undefined
        : { users: { some: { id: userId } } };

    const brands = await prisma.brand.findMany({
        where: brandWhere,
        include: {
            _count: {
                select: { lists: true, campaigns: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    if (brands.length === 0) {
        return (
            <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <PageHeader
                    title="Dashboard"
                    description="Overview of your sending activity."
                    action={currentUserRole === 'admin' ? <CreateBrandButton /> : undefined}
                />
                <EmptyState
                    icon={Building2}
                    title="No brands yet"
                    description="Create your first brand to start managing subscriber lists and sending beautiful campaigns."
                    action={currentUserRole === 'admin' ? <CreateBrandButton /> : undefined}
                />
            </div>
        );
    }

    const brandIds = brands.map(b => b.id);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalSubscribers, sendsStats, recentCampaigns] = await Promise.all([
        prisma.subscriber.count({
            where: {
                status: 'subscribed',
                list: { brandId: { in: brandIds } },
            },
        }),
        prisma.campaignSend.findMany({
            where: {
                campaign: { brandId: { in: brandIds } },
                sentAt: { gte: thirtyDaysAgo },
                status: { in: ['sent', 'bounced', 'complained'] },
            },
            select: { openedAt: true, clickedAt: true },
        }),
        prisma.campaign.findMany({
            where: {
                brandId: { in: brandIds },
                status: { in: ['sent', 'sending', 'scheduled'] },
            },
            include: {
                brand: { select: { name: true } },
                _count: { select: { sends: true } },
            },
            orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }],
            take: 5,
        }),
    ]);

    const totalSends = sendsStats.length;
    const totalOpens = sendsStats.filter(s => s.openedAt).length;
    const totalClicks = sendsStats.filter(s => s.clickedAt).length;
    const openRate = totalSends > 0 ? (totalOpens / totalSends) * 100 : 0;
    const clickRate = totalSends > 0 ? (totalClicks / totalSends) * 100 : 0;

    const kpis = [
        {
            label: "Subscribers",
            value: totalSubscribers.toLocaleString(),
            icon: Users,
            hint: "Active across all lists",
            tint: "text-primary",
        },
        {
            label: "Sends (30d)",
            value: totalSends.toLocaleString(),
            icon: Send,
            hint: "Emails delivered",
            tint: "text-violet-500 dark:text-violet-400",
        },
        {
            label: "Open rate (30d)",
            value: `${openRate.toFixed(1)}%`,
            icon: MailOpen,
            hint: `${totalOpens.toLocaleString()} opens`,
            tint: "text-emerald-500 dark:text-emerald-400",
        },
        {
            label: "Click rate (30d)",
            value: `${clickRate.toFixed(1)}%`,
            icon: MousePointerClick,
            hint: `${totalClicks.toLocaleString()} clicks`,
            tint: "text-amber-500 dark:text-amber-400",
        },
    ];

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader
                title="Dashboard"
                description="Overview of your sending activity across all brands."
                action={currentUserRole === 'admin' ? <CreateBrandButton /> : undefined}
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {kpis.map((kpi, i) => (
                    <StatCard
                        key={kpi.label}
                        label={kpi.label}
                        value={kpi.value}
                        hint={kpi.hint}
                        icon={kpi.icon}
                        tint={kpi.tint}
                        delay={i * 80}
                    />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <section className="surface-card lg:col-span-2 p-5">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="section-title">Recent campaigns</h2>
                        <Link href="/dashboard/campaigns">
                            <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2">
                                View all <ArrowRight className="w-3 h-3" />
                            </Button>
                        </Link>
                    </div>
                    {recentCampaigns.length === 0 ? (
                        <div className="text-sm text-zinc-500 dark:text-zinc-400 py-8 text-center">
                            No campaigns yet.{" "}
                            <Link href="/dashboard/campaigns/new" className="text-primary hover:underline">
                                Create your first one →
                            </Link>
                        </div>
                    ) : (
                        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800/60 -mx-1">
                            {recentCampaigns.map((campaign) => (
                                <li key={campaign.id}>
                                    <Link
                                        href={`/dashboard/campaigns/${campaign.id}`}
                                        className="flex items-center justify-between gap-4 py-3 px-1 group"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-sm text-zinc-900 dark:text-white truncate group-hover:text-primary transition-colors">
                                                {campaign.name}
                                            </p>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                                {campaign.brand.name} · {campaign._count.sends.toLocaleString()} sends
                                            </p>
                                        </div>
                                        <StatusBadge status={campaign.status} />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="surface-card p-5">
                    <h2 className="section-title mb-3">Your brands</h2>
                    <div className="space-y-1">
                        {brands.slice(0, 6).map((brand) => (
                            <Link
                                key={brand.id}
                                href={`/dashboard/brands/${brand.id}`}
                                className="flex items-center justify-between gap-3 px-2 py-2 -mx-1 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center flex-shrink-0">
                                        <span className="font-semibold text-xs text-zinc-700 dark:text-zinc-200">{brand.name[0]?.toUpperCase()}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-zinc-900 dark:text-white truncate group-hover:text-primary transition-colors">
                                            {brand.name}
                                        </p>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                            {brand._count.lists} lists · {brand._count.campaigns} campaigns
                                        </p>
                                    </div>
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                            </Link>
                        ))}
                        {brands.length > 6 && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center pt-2">
                                +{brands.length - 6} more
                            </p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
