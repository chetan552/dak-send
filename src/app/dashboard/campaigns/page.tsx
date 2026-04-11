import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Clock, Play, FileEdit, Plus, XCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DeleteCampaignButton } from "@/components/campaign/delete-campaign-button";
import { CancelCampaignButton } from "@/components/campaign/cancel-campaign-button";
import { DuplicateCampaignButton } from "@/components/campaign/duplicate-campaign-button";

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

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-1">Campaigns</h1>
                    <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400">Design and dispatch perfect email campaigns.</p>
                </div>
                <Link href="/dashboard/campaigns/new">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)]">
                        <Plus className="w-4 h-4" /> Create Campaign
                    </Button>
                </Link>
            </div>

            {campaigns.length === 0 ? (
                <Card className="border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30">
                    <CardContent className="flex flex-col items-center justify-center p-16 text-center animate-in fade-in duration-700">
                        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
                            <Send className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">No campaigns yet</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 mb-6 max-w-sm">Craft a beautiful email and send it to your audience.</p>
                        <Link href="/dashboard/campaigns/new">
                            <Button variant="outline" className="border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                Draft First Campaign
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {campaigns.map((campaign, i) => (
                        <Card key={campaign.id} className="bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm hover:shadow-md dark:shadow-none dark:hover:shadow-[0_0_30px_rgba(0,0,0,0.5)] group animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}>
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex flex-row items-center gap-1 ${campaign.status === 'draft' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300' :
                                        campaign.status === 'sending' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500' :
                                            campaign.status === 'cancelled' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                                                'bg-green-500/10 text-green-600 dark:text-green-400'
                                        }`}>
                                        {campaign.status === 'draft' && <FileEdit className="w-3 h-3" />}
                                        {campaign.status === 'sending' && <Clock className="w-3 h-3" />}
                                        {campaign.status === 'cancelled' && <XCircle className="w-3 h-3" />}
                                        {campaign.status === 'sent' && <Send className="w-3 h-3" />}
                                        {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                                    </span>
                                </div>
                                <CardTitle className="text-xl text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors w-full overflow-hidden">
                                    <Link href={`/dashboard/campaigns/${campaign.id}`} className="block truncate w-full">
                                        {campaign.name}
                                    </Link>
                                </CardTitle>
                                <CardDescription className="text-zinc-500 truncate" title={campaign.subject}>
                                    Subject: {campaign.subject}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800/50 flex items-center justify-between">
                                    <div className="text-xs text-zinc-500 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-700 block" /> {campaign.brand.name}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {campaign.status === 'draft' && (
                                            <Link href={`/dashboard/campaigns/${campaign.id}`}>
                                                <Button variant="ghost" size="sm" className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-400/10 h-8 px-2">
                                                    Edit
                                                </Button>
                                            </Link>
                                        )}
                                        {campaign.status === 'sending' && (
                                            <CancelCampaignButton campaignId={campaign.id} />
                                        )}
                                        {campaign.status === 'sent' && (
                                            <Link href={`/dashboard/campaigns/${campaign.id}/report`}>
                                                <Button variant="ghost" size="sm" className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 h-8 px-2">
                                                    Report
                                                </Button>
                                            </Link>
                                        )}
                                        <DuplicateCampaignButton campaignId={campaign.id} />
                                        <DeleteCampaignButton campaignId={campaign.id} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
