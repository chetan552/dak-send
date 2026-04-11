import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BarChart3, MailCheck, MailWarning, MousePointerClick, Send, TrendingUp, Link2 } from "lucide-react";
import Link from "next/link";
import { getCampaignStats } from "@/app/actions/analytics";
import { getCampaignTimeline, getTopLinks } from "@/app/actions/dashboard-analytics";
import { TimelineChart } from "@/components/campaign/analytics/timeline-chart";
import { TopLinksChart } from "@/components/campaign/analytics/top-links-chart";

export default async function CampaignReportPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const currentUserRole = session?.user?.role || "user";
    const whereCondition: any = currentUserRole === 'admin'
        ? { id, status: { not: "draft" } }
        : { id, brand: { users: { some: { id: session?.user?.id } } }, status: { not: "draft" } };

    const campaign = await prisma.campaign.findFirst({
        where: whereCondition,
        include: { brand: true }
    });

    if (!campaign) notFound();

    const [stats, timeline, topLinks] = await Promise.all([
        getCampaignStats(id),
        getCampaignTimeline(id),
        getTopLinks(id),
    ]);

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400 mb-2">
                <Link href="/dashboard/campaigns" className="hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Campaigns
                </Link>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-1">Campaign Report: {campaign.name}</h1>
                    <p className="text-zinc-500 dark:text-zinc-400">
                        {campaign.sentAt ? `Sent on: ${new Date(campaign.sentAt).toLocaleDateString()}` : `Updated: ${new Date(campaign.updatedAt).toLocaleDateString()}`}
                        &middot; Subject: {campaign.subject}
                    </p>
                </div>
                <div className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium border ${campaign.status === 'sending'
                    ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-500'
                    : campaign.status === 'cancelled'
                        ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                        : 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400'
                    }`}>
                    <BarChart3 className="w-5 h-5" />
                    {campaign.status === 'sending' ? 'Sending...' : campaign.status === 'cancelled' ? 'Cancelled' : 'Sent'}
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 border-t-4 border-t-indigo-500 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Delivered</p>
                                <h3 className="text-3xl font-bold text-zinc-900 dark:text-white">{stats.totalSent}</h3>
                            </div>
                            <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center">
                                <Send className="w-6 h-6 text-indigo-500" />
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-zinc-500">of {stats.total} total recipients</div>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 border-t-4 border-t-blue-500 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Opens</p>
                                <h3 className="text-3xl font-bold text-zinc-900 dark:text-white">{stats.openRate}%</h3>
                            </div>
                            <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                                <MailCheck className="w-6 h-6 text-blue-500" />
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-zinc-500">{stats.totalOpened} unique opens</div>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 border-t-4 border-t-green-500 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Clicks</p>
                                <h3 className="text-3xl font-bold text-zinc-900 dark:text-white">{stats.clickRate}%</h3>
                            </div>
                            <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                                <MousePointerClick className="w-6 h-6 text-green-500" />
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-zinc-500">{stats.totalClicked} unique clicks</div>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 border-t-4 border-t-orange-500 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Bounced</p>
                                <h3 className="text-3xl font-bold text-zinc-900 dark:text-white">{stats.bounceRate}%</h3>
                            </div>
                            <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center">
                                <MailWarning className="w-6 h-6 text-orange-500" />
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-zinc-500">{stats.totalBounced} bounces</div>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 border-t-4 border-t-red-500 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Complaints</p>
                                <h3 className="text-3xl font-bold text-zinc-900 dark:text-white">{stats.complaintRate}%</h3>
                            </div>
                            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
                                <MailWarning className="w-6 h-6 text-red-500" />
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-zinc-500">{stats.totalComplained} complaints</div>
                    </CardContent>
                </Card>
            </div>

            {stats.totalQueued > 0 && (
                <Card className="bg-yellow-500/5 dark:bg-yellow-500/5 border-yellow-500/20">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
                        <span className="text-yellow-600 dark:text-yellow-500 text-sm font-medium">
                            {stats.totalQueued} emails still queued for delivery...
                        </span>
                    </CardContent>
                </Card>
            )}

            {/* Engagement Timeline */}
            <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-xl text-zinc-900 dark:text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" /> Engagement Timeline
                    </CardTitle>
                    <CardDescription className="text-zinc-500 dark:text-zinc-400">
                        Opens and clicks over time since this campaign was sent.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <TimelineChart data={timeline} />
                </CardContent>
            </Card>

            {/* Top Clicked Links */}
            <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-xl text-zinc-900 dark:text-white flex items-center gap-2">
                        <Link2 className="w-5 h-5 text-indigo-500" /> Top Clicked Links
                    </CardTitle>
                    <CardDescription className="text-zinc-500 dark:text-zinc-400">
                        Which links in your email got the most engagement.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <TopLinksChart data={topLinks} />
                    {topLinks.length > 0 && (
                        <div className="mt-6 border-t border-zinc-200 dark:border-zinc-800 pt-4">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                                        <th className="text-left py-2 px-3 font-medium text-zinc-500 dark:text-zinc-400">URL</th>
                                        <th className="text-right py-2 px-3 font-medium text-zinc-500 dark:text-zinc-400">Total Clicks</th>
                                        <th className="text-right py-2 px-3 font-medium text-zinc-500 dark:text-zinc-400">Unique Clickers</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topLinks.map((link, i) => (
                                        <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800/50">
                                            <td className="py-2 px-3 text-blue-600 dark:text-blue-400 truncate max-w-[400px]">
                                                <a href={link.url} target="_blank" rel="noopener noreferrer" title={link.url}>
                                                    {link.url.length > 60 ? link.url.slice(0, 60) + "…" : link.url}
                                                </a>
                                            </td>
                                            <td className="py-2 px-3 text-right text-zinc-900 dark:text-white font-medium">{link.totalClicks}</td>
                                            <td className="py-2 px-3 text-right text-zinc-500 dark:text-zinc-400">{link.uniqueClicks}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Summary Table */}
            <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-xl text-zinc-900 dark:text-white">Campaign Summary</CardTitle>
                    <CardDescription className="text-zinc-500 dark:text-zinc-400">Detailed breakdown of sending results.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between py-3 border-b border-zinc-200 dark:border-zinc-800">
                            <span className="text-zinc-500 dark:text-zinc-400">Total Recipients</span>
                            <span className="font-semibold text-zinc-900 dark:text-white">{stats.total}</span>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-zinc-200 dark:border-zinc-800">
                            <span className="text-zinc-500 dark:text-zinc-400">Successfully Delivered</span>
                            <span className="font-semibold text-green-600 dark:text-green-400">{stats.totalSent}</span>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-zinc-200 dark:border-zinc-800">
                            <span className="text-zinc-500 dark:text-zinc-400">Failed</span>
                            <span className="font-semibold text-red-600 dark:text-red-400">{stats.totalFailed}</span>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-zinc-200 dark:border-zinc-800">
                            <span className="text-zinc-500 dark:text-zinc-400">Unique Opens</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">{stats.totalOpened}</span>
                        </div>
                        <div className="flex items-center justify-between py-3">
                            <span className="text-zinc-500 dark:text-zinc-400">Unique Clicks</span>
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">{stats.totalClicked}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
