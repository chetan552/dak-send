import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clock, FileEdit, Send, RefreshCw, XCircle, FlaskConical, Eye, CalendarClock, Blocks } from "lucide-react";
import Link from "next/link";
import { CampaignForm } from "@/components/campaign/campaign-form";
import { Button } from "@/components/ui/button";
import { DeleteCampaignButton } from "@/components/campaign/delete-campaign-button";
import { CancelCampaignButton } from "@/components/campaign/cancel-campaign-button";
import { DuplicateCampaignButton } from "@/components/campaign/duplicate-campaign-button";
import { UnscheduleCampaignButton } from "@/components/campaign/unschedule-campaign-button";
import { TestSendButton } from "@/components/campaign/test-send-button";
import { isAiEnabledForBrand } from "@/lib/ai/config";

export default async function CampaignDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const currentUserRole = session?.user?.role || "user";
    const whereCondition: any = currentUserRole === 'admin'
        ? { id }
        : { id, brand: { users: { some: { id: session?.user?.id } } } };

    const campaign = await prisma.campaign.findFirst({
        where: whereCondition,
        include: { brand: true }
    });

    if (!campaign) notFound();

    const brandsQuery: any = currentUserRole !== 'admin' ? { users: { some: { id: session?.user?.id } } } : undefined;
    const brands = await prisma.brand.findMany({
        where: brandsQuery,
    });

    const aiEntries = await Promise.all(
        brands.map(async (b) => [b.id, await isAiEnabledForBrand(b.id)] as const),
    );
    const aiEnabledByBrand = Object.fromEntries(aiEntries);

    const isDraft = campaign.status === 'draft';
    const isScheduled = campaign.status === 'scheduled';
    const isEditable = isDraft || isScheduled;
    const isFullHtmlDocument = campaign.htmlText.trim().toLowerCase().startsWith('<!doctype html') ||
        campaign.htmlText.trim().toLowerCase().startsWith('<html');

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-2">
                <Link href="/dashboard/campaigns" className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Campaigns
                </Link>
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 border ${isDraft ? 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300' :
                    campaign.status === 'sending' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-500' :
                    campaign.status === 'scheduled' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400' :
                        campaign.status === 'cancelled' ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400' :
                            'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400'
                    }`}>
                    {isDraft && <FileEdit className="w-4 h-4" />}
                    {campaign.status === 'sending' && <RefreshCw className="w-4 h-4 animate-spin" />}
                    {campaign.status === 'cancelled' && <XCircle className="w-4 h-4" />}
                    {campaign.status === 'sent' && <Send className="w-4 h-4" />}
                    {isScheduled && <CalendarClock className="w-4 h-4" />}
                    {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                    {isScheduled && campaign.scheduledAt && (
                        <span className="font-normal opacity-80">
                            · {new Date(campaign.scheduledAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                </span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-1 break-words">{campaign.name}</h1>
                    <p className="text-zinc-500 dark:text-zinc-400">Manage your campaign details.</p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    {isDraft && (
                        <>
                            <Link href={`/dashboard/campaigns/${campaign.id}/builder`}>
                                <Button variant="outline" className="border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 gap-2">
                                    <Blocks className="w-4 h-4" /> Block Builder
                                </Button>
                            </Link>
                            <Link href={`/dashboard/campaigns/${campaign.id}/ab-test`}>
                                <Button variant="outline" className="border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 gap-2">
                                    <FlaskConical className="w-4 h-4" /> A/B Test
                                </Button>
                            </Link>
                            <Link href={`/dashboard/campaigns/${campaign.id}/preview`}>
                                <Button variant="outline" className="border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 gap-2">
                                    <Eye className="w-4 h-4" /> Preview
                                </Button>
                            </Link>
                            <TestSendButton campaignId={campaign.id} />
                            <Link href={`/dashboard/campaigns/${campaign.id}/send`}>
                                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]">
                                    <Send className="w-4 h-4" /> Finalize & Send
                                </Button>
                            </Link>
                        </>
                    )}
                    {isScheduled && (
                        <>
                            <Link href={`/dashboard/campaigns/${campaign.id}/preview`}>
                                <Button variant="outline" className="border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 gap-2">
                                    <Eye className="w-4 h-4" /> Preview
                                </Button>
                            </Link>
                            <TestSendButton campaignId={campaign.id} />
                        </>
                    )}
                    {campaign.status === 'sending' && (
                        <CancelCampaignButton
                            campaignId={campaign.id}
                            className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 h-10 px-4 transition-colors font-medium border border-yellow-500/20 rounded-md flex items-center justify-center pointer-events-auto"
                        />
                    )}
                    {isScheduled && (
                        <UnscheduleCampaignButton
                            campaignId={campaign.id}
                            showText={true}
                            className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 h-10 px-4 transition-colors font-medium border border-zinc-200 dark:border-zinc-700 rounded-md flex items-center justify-center gap-2 pointer-events-auto"
                        />
                    )}
                    <DuplicateCampaignButton
                        campaignId={campaign.id}
                        className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 h-10 px-4 transition-colors font-medium border border-zinc-200 dark:border-zinc-700 rounded-md flex items-center justify-center pointer-events-auto"
                        showText={true}
                    />
                    <DeleteCampaignButton
                        campaignId={campaign.id}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-500 h-10 px-4 transition-colors font-medium border border-red-500/20 rounded-md flex items-center justify-center pointer-events-auto"
                        showText={true}
                    />
                </div>
            </div>

            <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-xl text-zinc-900 dark:text-white">Campaign Details</CardTitle>
                    <CardDescription className="text-zinc-500 dark:text-zinc-400">Basic information about your email campaign.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isEditable ? (
                        <CampaignForm brands={brands} initialData={campaign} aiEnabledByBrand={aiEnabledByBrand} />
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-500 mb-1">Subject</h4>
                                    <p className="text-zinc-900 dark:text-white text-lg">{campaign.subject}</p>
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-500 mb-1">Brand</h4>
                                    <p className="text-zinc-900 dark:text-white text-lg">{campaign.brand.name}</p>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-zinc-500 mb-2">HTML Content Preview</h4>
                                {isFullHtmlDocument ? (
                                    <div className="bg-zinc-100 dark:bg-zinc-950 p-4 rounded-lg flex justify-center border border-zinc-200 dark:border-zinc-800">
                                        <iframe
                                            srcDoc={campaign.htmlText}
                                            title="Email Preview"
                                            className="w-full max-w-[600px] min-h-[600px] bg-white shadow-sm border border-zinc-200 rounded-md"
                                            sandbox="allow-same-origin"
                                        />
                                    </div>
                                ) : (
                                    <iframe
                                        className="w-full min-h-[400px] border-none rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                                        srcDoc={campaign.htmlText}
                                        sandbox=""
                                        title="Email Preview"
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
