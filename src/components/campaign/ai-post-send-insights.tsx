"use client";

import { useState } from "react";
import { Sparkles, Loader2, TrendingUp, AlertCircle, ArrowRight, RefreshCw } from "lucide-react";
import { summarizeCampaignResults, type CampaignInsights } from "@/app/actions/ai";

interface AiPostSendInsightsProps {
    campaignId: string;
}

export function AiPostSendInsights({ campaignId }: AiPostSendInsightsProps) {
    const [loading, setLoading] = useState(false);
    const [insights, setInsights] = useState<CampaignInsights | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await summarizeCampaignResults(campaignId);
            setInsights(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to generate insights");
        } finally {
            setLoading(false);
        }
    };

    if (!insights && !loading && !error) {
        return (
            <div className="rounded-2xl border border-violet-200 dark:border-violet-500/30 bg-gradient-to-br from-violet-50 to-blue-50 dark:from-violet-500/5 dark:to-blue-500/5 p-6">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-6 h-6 text-violet-500" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">AI Insights</h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                            Get a plain-English analysis of how this campaign performed and what to try next.
                        </p>
                        <button
                            onClick={handleGenerate}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors"
                        >
                            <Sparkles className="w-4 h-4" /> Analyze this campaign
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-violet-200 dark:border-violet-500/30 bg-gradient-to-br from-violet-50 to-blue-50 dark:from-violet-500/5 dark:to-blue-500/5 p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-violet-500" />
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-white">AI Insights</h3>
                </div>
                {insights && !loading && (
                    <button
                        onClick={handleGenerate}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-500/10 transition-colors"
                        title="Regenerate insights"
                    >
                        <RefreshCw className="w-3 h-3" /> Regenerate
                    </button>
                )}
            </div>

            {loading && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Loader2 className="w-7 h-7 animate-spin text-violet-500 mb-2" />
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Analyzing campaign performance...</p>
                </div>
            )}

            {error && (
                <div className="p-4 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {insights && !loading && (
                <>
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold ${
                            insights.score >= 80
                                ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                : insights.score >= 60
                                ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300"
                        }`}>
                            {insights.score}
                        </div>
                        <div className="flex-1">
                            <h4 className="font-semibold text-zinc-900 dark:text-white text-base">{insights.headline}</h4>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5 leading-relaxed">{insights.summary}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {insights.strengths.length > 0 && (
                            <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-white/60 dark:bg-zinc-950/40 p-4">
                                <h5 className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                                    <TrendingUp className="w-3.5 h-3.5" /> Strengths
                                </h5>
                                <ul className="space-y-1.5">
                                    {insights.strengths.map((s, i) => (
                                        <li key={i} className="text-xs text-zinc-700 dark:text-zinc-300 leading-snug">{s}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {insights.risks.length > 0 && (
                            <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-white/60 dark:bg-zinc-950/40 p-4">
                                <h5 className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                                    <AlertCircle className="w-3.5 h-3.5" /> Risks
                                </h5>
                                <ul className="space-y-1.5">
                                    {insights.risks.map((r, i) => (
                                        <li key={i} className="text-xs text-zinc-700 dark:text-zinc-300 leading-snug">{r}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {insights.nextSteps.length > 0 && (
                            <div className="rounded-xl border border-blue-200 dark:border-blue-500/30 bg-white/60 dark:bg-zinc-950/40 p-4">
                                <h5 className="text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-1.5">
                                    <ArrowRight className="w-3.5 h-3.5" /> Next steps
                                </h5>
                                <ul className="space-y-1.5">
                                    {insights.nextSteps.map((n, i) => (
                                        <li key={i} className="text-xs text-zinc-700 dark:text-zinc-300 leading-snug">{n}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
