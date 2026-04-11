import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ExternalLink, Users, Send, MailOpen, MousePointerClick, ArrowRight } from "lucide-react";
import Link from "next/link";
import { CreateBrandButton } from "@/components/brand/create-brand-button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";

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

    // If there are no brands, show the empty state / brand creation flow
    if (brands.length === 0) {
        return (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="page-title mb-1">Dashboard</h1>
                        <p className="page-subtitle">Overview of your sending activity.</p>
                    </div>
                    {currentUserRole === 'admin' && <CreateBrandButton />}
                </div>
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

    // KPI queries (run in parallel)
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
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title mb-1">Dashboard</h1>
                    <p className="page-subtitle">Overview of your sending activity across all brands.</p>
                </div>
                {currentUserRole === 'admin' && <CreateBrandButton />}
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((kpi, i) => {
                    const Icon = kpi.icon;
                    return (
                        <Card
                            key={kpi.label}
                            className="bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 shadow-sm animate-in fade-in slide-in-from-bottom-4"
                            style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
                        >
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">{kpi.label}</span>
                                    <Icon className={`w-4 h-4 ${kpi.tint}`} />
                                </div>
                                <div className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white tabular-nums">
                                    {kpi.value}
                                </div>
                                <p className="text-xs text-zinc-500 mt-1">{kpi.hint}</p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Two-column: Recent campaigns + Brands */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Campaigns */}
                <Card className="lg:col-span-2 bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <CardTitle className="section-title">Recent campaigns</CardTitle>
                        <Link href="/dashboard/campaigns">
                            <Button variant="ghost" size="sm" className="gap-1 text-xs">
                                View all <ArrowRight className="w-3 h-3" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {recentCampaigns.length === 0 ? (
                            <div className="text-sm text-zinc-500 py-8 text-center">
                                No campaigns yet.{" "}
                                <Link href="/dashboard/campaigns/new" className="text-primary hover:underline">
                                    Create your first one →
                                </Link>
                            </div>
                        ) : (
                            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800/60">
                                {recentCampaigns.map((campaign) => (
                                    <li key={campaign.id}>
                                        <Link
                                            href={`/dashboard/campaigns/${campaign.id}`}
                                            className="flex items-center justify-between gap-4 py-3 group"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium text-sm text-zinc-900 dark:text-white truncate group-hover:text-primary transition-colors">
                                                    {campaign.name}
                                                </p>
                                                <p className="text-xs text-zinc-500 truncate mt-0.5">
                                                    {campaign.brand.name} · {campaign._count.sends.toLocaleString()} sends
                                                </p>
                                            </div>
                                            <StatusBadge status={campaign.status} />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                {/* Brands picker */}
                <Card className="bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800">
                    <CardHeader className="pb-4">
                        <CardTitle className="section-title">Your brands</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                        {brands.slice(0, 6).map((brand) => (
                            <Link
                                key={brand.id}
                                href={`/dashboard/brands/${brand.id}`}
                                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors group"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-md bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center flex-shrink-0">
                                        <span className="font-bold text-xs text-zinc-900 dark:text-white">{brand.name[0]?.toUpperCase()}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-zinc-900 dark:text-white truncate group-hover:text-primary transition-colors">
                                            {brand.name}
                                        </p>
                                        <p className="text-xs text-zinc-500 truncate">
                                            {brand._count.lists} lists · {brand._count.campaigns} campaigns
                                        </p>
                                    </div>
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                            </Link>
                        ))}
                        {brands.length > 6 && (
                            <p className="text-xs text-zinc-500 text-center pt-2">
                                +{brands.length - 6} more
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
