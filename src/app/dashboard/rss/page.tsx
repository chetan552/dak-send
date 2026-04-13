import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Rss, ExternalLink, Pause, Play, Trash2 } from "lucide-react";
import { RssFeedForm } from "@/components/rss/rss-feed-form";
import { RssFeedActions } from "@/components/rss/rss-feed-actions";

export default async function RssPage() {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";

    const brandsWhere: any = currentUserRole === "admin"
        ? undefined
        : { users: { some: { id: userId } } };

    const brands = await prisma.brand.findMany({ where: brandsWhere });
    const lists = await prisma.list.findMany({
        where: { brand: brandsWhere || {} },
        select: { id: true, name: true, brandId: true },
    });

    const feedsWhere: any = currentUserRole === "admin"
        ? {}
        : { brand: { users: { some: { id: userId } } } };

    const feeds = await prisma.rssFeed.findMany({
        where: feedsWhere,
        include: { brand: true },
        orderBy: { createdAt: "desc" },
    });

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title mb-1">RSS Feeds</h1>
                    <p className="page-subtitle">Automatically create campaigns from blog posts and RSS feeds.</p>
                </div>
            </div>

            <RssFeedForm brands={brands} lists={lists} />

            {feeds.length === 0 ? (
                <Card className="border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
                            <Rss className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">No RSS feeds yet</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm">
                            Add an RSS feed URL to automatically generate campaign drafts from new posts.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {feeds.map((feed: any) => (
                        <Card key={feed.id} className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-shadow">
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4 min-w-0">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${feed.isActive ? 'bg-orange-500/10' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                                            <Rss className={`w-5 h-5 ${feed.isActive ? 'text-orange-500' : 'text-zinc-400'}`} />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-zinc-900 dark:text-white truncate">{feed.name}</h3>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{feed.url}</p>
                                            <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
                                                <span className="text-zinc-500 dark:text-zinc-400">Brand: <strong className="text-zinc-700 dark:text-zinc-300">{feed.brand.name}</strong></span>
                                                <span className={`px-2 py-0.5 rounded-full font-medium ${feed.isActive ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500'}`}>
                                                    {feed.isActive ? "Active" : "Paused"}
                                                </span>
                                                {feed.digestMode && (
                                                    <span className="px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400">
                                                        Daily Digest
                                                    </span>
                                                )}
                                                {!feed.digestMode && feed.templateHtml && (
                                                    <span className="px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                                                        Custom Template
                                                    </span>
                                                )}
                                                {feed.lastCheckedAt && (
                                                    <span className="text-zinc-400">Last checked: {new Date(feed.lastCheckedAt).toLocaleString()}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <RssFeedActions feed={JSON.parse(JSON.stringify(feed))} lists={JSON.parse(JSON.stringify(lists))} />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Card className="bg-blue-50/50 dark:bg-blue-500/5 border-blue-200/50 dark:border-blue-500/20">
                <CardContent className="p-4 text-sm text-blue-700 dark:text-blue-300 space-y-2">
                    <p className="font-medium">How RSS-to-Email works</p>
                    <p className="text-blue-600/80 dark:text-blue-400/80">
                        Set up a cron job to call <code className="bg-blue-100 dark:bg-blue-500/10 px-1 py-0.5 rounded">/api/cron/rss?secret=YOUR_CRON_SECRET</code> periodically.
                        When new items appear in your feed, a campaign draft is automatically created and ready to send.
                    </p>
                    <p className="text-blue-600/80 dark:text-blue-400/80">
                        <strong>Daily Digest Mode:</strong> Instead of one email per item, all new items found in a single cron run are batched into one digest email. Schedule the cron to run once per day for a true daily digest.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
