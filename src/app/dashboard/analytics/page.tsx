import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Send, MailOpen, MousePointerClick, AlertTriangle, TrendingUp, ArrowUpRight } from "lucide-react";
import { getOverviewStats, getCampaignPerformanceTable, getActivityOverTime } from "@/app/actions/dashboard-analytics";
import { ActivityChart } from "@/components/campaign/analytics/activity-chart";
import { CampaignComparisonTable } from "@/components/campaign/analytics/campaign-comparison-table";

export default async function AnalyticsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;

    const [overview, campaigns, activity] = await Promise.all([
        getOverviewStats(),
        getCampaignPerformanceTable(),
        getActivityOverTime(30),
    ]);

    const statCards = [
        {
            label: "Total Sent",
            value: overview.totalSent.toLocaleString(),
            sub: `${overview.totalCampaigns} campaigns`,
            icon: Send,
            color: "indigo",
            iconBg: "bg-indigo-500/10",
            iconColor: "text-indigo-500",
            borderColor: "border-t-indigo-500",
        },
        {
            label: "Avg Open Rate",
            value: `${overview.avgOpenRate}%`,
            sub: `${overview.totalOpened.toLocaleString()} total opens`,
            icon: MailOpen,
            color: "blue",
            iconBg: "bg-blue-500/10",
            iconColor: "text-blue-500",
            borderColor: "border-t-blue-500",
        },
        {
            label: "Avg Click Rate",
            value: `${overview.avgClickRate}%`,
            sub: `${overview.totalClicked.toLocaleString()} total clicks`,
            icon: MousePointerClick,
            color: "green",
            iconBg: "bg-emerald-500/10",
            iconColor: "text-emerald-500",
            borderColor: "border-t-emerald-500",
        },
        {
            label: "Avg Bounce Rate",
            value: `${overview.avgBounceRate}%`,
            sub: `${overview.totalBounced.toLocaleString()} bounces · ${overview.totalComplaints.toLocaleString()} complaints`,
            icon: AlertTriangle,
            color: "orange",
            iconBg: "bg-orange-500/10",
            iconColor: "text-orange-500",
            borderColor: "border-t-orange-500",
        },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-1 flex items-center gap-3">
                    <BarChart3 className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                    Analytics
                </h1>
                <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400">
                    Cross-campaign performance overview for the last 30 days.
                </p>
            </div>

            {/* Overview Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card, i) => (
                    <Card
                        key={card.label}
                        className={`bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 border-t-4 ${card.borderColor} hover:shadow-md transition-shadow animate-in fade-in slide-in-from-bottom-4`}
                        style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
                    >
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">{card.label}</p>
                                    <h3 className="text-3xl font-bold text-zinc-900 dark:text-white">{card.value}</h3>
                                </div>
                                <div className={`w-12 h-12 ${card.iconBg} rounded-full flex items-center justify-center`}>
                                    <card.icon className={`w-6 h-6 ${card.iconColor}`} />
                                </div>
                            </div>
                            <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">{card.sub}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Activity Chart */}
            <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 shadow-sm animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: "300ms", animationFillMode: "both" }}>
                <CardHeader>
                    <CardTitle className="text-xl text-zinc-900 dark:text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" /> Sending Activity
                    </CardTitle>
                    <CardDescription className="text-zinc-500 dark:text-zinc-400">
                        Sends, opens, and clicks over the last 30 days
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ActivityChart data={activity} />
                </CardContent>
            </Card>

            {/* Campaign Comparison Table */}
            <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 shadow-sm animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: "400ms", animationFillMode: "both" }}>
                <CardHeader>
                    <CardTitle className="text-xl text-zinc-900 dark:text-white flex items-center gap-2">
                        <ArrowUpRight className="w-5 h-5 text-emerald-500" /> Campaign Performance
                    </CardTitle>
                    <CardDescription className="text-zinc-500 dark:text-zinc-400">
                        Compare metrics across all sent campaigns. Click a campaign name for its full report.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <CampaignComparisonTable campaigns={campaigns} />
                </CardContent>
            </Card>
        </div>
    );
}
