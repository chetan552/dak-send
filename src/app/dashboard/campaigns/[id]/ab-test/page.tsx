import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FlaskConical, Trophy, Trash2 } from "lucide-react";
import Link from "next/link";
import { AbTestForm } from "@/components/campaign/ab-test-form";
import { AbTestActions } from "@/components/campaign/ab-test-actions";
import { getAbTestResults } from "@/app/actions/ab-test";

export default async function AbTestPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const currentUserRole = session?.user?.role || "user";
    const whereCondition: any = currentUserRole === "admin"
        ? { id }
        : { id, brand: { users: { some: { id: session?.user?.id } } } };

    const campaign = await prisma.campaign.findFirst({
        where: whereCondition,
        include: { brand: true },
    });

    if (!campaign) notFound();

    const results = await getAbTestResults(id);
    const isDraft = campaign.status === "draft";
    const hasSent = results.some((r: any) => r.totalSent > 0);

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400 mb-2">
                <Link href={`/dashboard/campaigns/${id}`} className="hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Campaign
                </Link>
            </div>

            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-1 flex items-center gap-3">
                    <FlaskConical className="w-7 h-7 text-purple-500" /> A/B Testing
                </h1>
                <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400">
                    Test different subject lines and content for <strong className="text-zinc-700 dark:text-zinc-300">{campaign.name}</strong>
                </p>
            </div>

            {/* Original campaign info */}
            <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 border-l-4 border-l-blue-500">
                <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-sm font-bold text-blue-500">O</div>
                        <div>
                            <p className="text-xs text-zinc-500 font-medium uppercase">Original</p>
                            <p className="font-medium text-zinc-900 dark:text-white">{campaign.subject}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Variant cards */}
            {results.length > 0 && (
                <div className="space-y-4">
                    {results.map((variant: any, i: number) => {
                        const letter = String.fromCharCode(65 + i);
                        const colors = ["purple", "orange", "teal", "pink"];
                        const color = colors[i % colors.length];

                        return (
                            <Card key={variant.id} className={`bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 border-l-4 border-l-${color}-500 ${variant.isWinner ? 'ring-2 ring-yellow-400/50' : ''}`}>
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div className={`w-8 h-8 rounded-full bg-${color}-500/10 flex items-center justify-center text-sm font-bold text-${color}-500 flex-shrink-0`}>
                                                {letter}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-zinc-900 dark:text-white">{variant.name}</p>
                                                    {variant.isWinner && (
                                                        <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 text-xs font-medium flex items-center gap-1">
                                                            <Trophy className="w-3 h-3" /> Winner
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-zinc-500 truncate">
                                                    Subject: {variant.subject || "(using original)"}
                                                </p>
                                                <p className="text-xs text-zinc-400 mt-1">
                                                    Split: {variant.splitPercent}% of recipients
                                                </p>

                                                {hasSent && (
                                                    <div className="flex items-center gap-4 mt-3 text-sm">
                                                        <div className="text-center">
                                                            <p className="text-zinc-500 text-xs">Sent</p>
                                                            <p className="font-bold text-zinc-900 dark:text-white">{variant.totalSent}</p>
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-zinc-500 text-xs">Open Rate</p>
                                                            <p className="font-bold text-blue-600 dark:text-blue-400">{variant.openRate}%</p>
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-zinc-500 text-xs">Click Rate</p>
                                                            <p className="font-bold text-green-600 dark:text-green-400">{variant.clickRate}%</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <AbTestActions variantId={variant.id} isWinner={variant.isWinner} isDraft={isDraft} hasSent={hasSent} />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {isDraft && <AbTestForm campaignId={id} existingVariantCount={results.length} />}

            <Card className="bg-purple-50/50 dark:bg-purple-500/5 border-purple-200/50 dark:border-purple-500/20">
                <CardContent className="p-4 text-sm text-purple-700 dark:text-purple-300">
                    <p className="font-medium mb-1">💡 How A/B Testing works</p>
                    <p className="text-purple-600/80 dark:text-purple-400/80">
                        Add variants with different subject lines or content. When you send the campaign, recipients are randomly
                        split between variants. After sending, check results here and pick a winner to apply to the main campaign for future sends.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
