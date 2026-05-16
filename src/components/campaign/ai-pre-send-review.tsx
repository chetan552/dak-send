"use client";

import { useState } from "react";
import { Sparkles, Loader2, ShieldCheck, AlertTriangle, Lightbulb, X } from "lucide-react";
import { reviewCampaign, type CampaignReview } from "@/app/actions/ai";

interface AiPreSendReviewProps {
    campaignId: string;
}

const SEVERITY_STYLES: Record<string, string> = {
    high: "text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30",
    medium: "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30",
    low: "text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-700",
};

export function AiPreSendReview({ campaignId }: AiPreSendReviewProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [review, setReview] = useState<CampaignReview | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleReview = async () => {
        setOpen(true);
        setLoading(true);
        setError(null);
        setReview(null);
        try {
            const result = await reviewCampaign(campaignId);
            setReview(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Review failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={handleReview}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-violet-200 dark:border-violet-500/30 bg-violet-50/50 dark:bg-violet-500/5 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-500/10 transition-colors font-medium text-sm"
            >
                <Sparkles className="w-4 h-4" /> Review with AI before sending
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={() => setOpen(false)}
                >
                    <div
                        className="w-full max-w-2xl bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden max-h-[85vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-violet-500" /> AI Pre-Send Review
                            </h2>
                            <button
                                onClick={() => setOpen(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-5">
                            {loading && (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-violet-500 mb-3" />
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">DeepSeek is reviewing your campaign...</p>
                                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">This usually takes 10-30 seconds.</p>
                                </div>
                            )}

                            {error && (
                                <div className="p-4 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 text-sm">
                                    {error}
                                </div>
                            )}

                            {review && !loading && (
                                <>
                                    <div className="flex items-center gap-4 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40">
                                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                                            review.score >= 80
                                                ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                                : review.score >= 60
                                                ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                                : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300"
                                        }`}>
                                            {review.score}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Overall Score</p>
                                            <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1">{review.summary}</p>
                                        </div>
                                    </div>

                                    {review.warnings.length > 0 && (
                                        <div className="space-y-2">
                                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4 text-amber-500" /> Warnings
                                            </h3>
                                            <div className="space-y-2">
                                                {review.warnings.map((w, i) => (
                                                    <div
                                                        key={i}
                                                        className={`p-3 rounded-lg border text-sm ${SEVERITY_STYLES[w.severity] || SEVERITY_STYLES.low}`}
                                                    >
                                                        <span className="text-[10px] font-bold uppercase tracking-wider mr-2 opacity-75">
                                                            {w.severity}
                                                        </span>
                                                        {w.message}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {review.suggestions.length > 0 && (
                                        <div className="space-y-2">
                                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                                                <Lightbulb className="w-4 h-4 text-blue-500" /> Suggestions
                                            </h3>
                                            <div className="space-y-2">
                                                {review.suggestions.map((s, i) => (
                                                    <div
                                                        key={i}
                                                        className="p-3 rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-sm text-blue-900 dark:text-blue-200"
                                                    >
                                                        <span className="text-[10px] font-bold uppercase tracking-wider mr-2 opacity-75">
                                                            {s.area}
                                                        </span>
                                                        {s.message}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {review.warnings.length === 0 && review.suggestions.length === 0 && (
                                        <div className="flex items-center gap-3 p-4 rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-sm text-emerald-700 dark:text-emerald-300">
                                            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                                            <span>No issues found. This campaign looks ready to send.</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
                            <button
                                onClick={() => setOpen(false)}
                                className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
