"use client";

import { useEffect, useMemo, useState } from "react";
import {
    ChevronDown,
    ChevronRight,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Info,
    ShieldCheck,
    Sparkles,
    Loader2,
} from "lucide-react";
import {
    runEmailChecks,
    summarizeChecks,
    type CheckResult,
    type CheckStatus,
} from "@/lib/email-review-checks";
import { reviewCampaignDraft, type CampaignReview } from "@/app/actions/ai";

interface EmailReviewPanelProps {
    html: string;
    subject?: string;
    brandId?: string;
    aiEnabled?: boolean;
    knownCustomFields?: string[];
}

const STATUS_ICON: Record<CheckStatus, React.ComponentType<{ className?: string }>> = {
    pass: CheckCircle2,
    warn: AlertTriangle,
    fail: XCircle,
    info: Info,
};

const STATUS_COLOR: Record<CheckStatus, string> = {
    pass: "text-emerald-600 dark:text-emerald-400",
    warn: "text-amber-600 dark:text-amber-400",
    fail: "text-red-600 dark:text-red-400",
    info: "text-zinc-500 dark:text-zinc-400",
};

export function EmailReviewPanel({
    html,
    subject,
    brandId,
    aiEnabled,
    knownCustomFields,
}: EmailReviewPanelProps) {
    const [open, setOpen] = useState(false);
    const [checks, setChecks] = useState<CheckResult[]>([]);

    // AI review state
    const [aiLoading, setAiLoading] = useState(false);
    const [aiReview, setAiReview] = useState<CampaignReview | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);

    // Debounce deterministic checks — cheap but no need to recompute on every char
    useEffect(() => {
        const t = setTimeout(() => {
            setChecks(runEmailChecks({ html, subject, knownCustomFields }));
        }, 250);
        return () => clearTimeout(t);
    }, [html, subject, knownCustomFields]);

    const summary = useMemo(() => summarizeChecks(checks), [checks]);

    const summaryLabel = useMemo(() => {
        if (checks.length === 0) return "Reviewing…";
        if (summary.fail > 0) return `${summary.fail} issue${summary.fail === 1 ? "" : "s"} to fix`;
        if (summary.warn > 0) return `${summary.warn} warning${summary.warn === 1 ? "" : "s"}`;
        return "Looks good";
    }, [checks, summary]);

    const summaryColor =
        summary.overall === "fail"
            ? "border-red-200 dark:border-red-500/30 bg-red-50/60 dark:bg-red-500/5"
            : summary.overall === "warn"
                ? "border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/5"
                : "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/5";

    const handleAiReview = async () => {
        if (!brandId) {
            setAiError("Select a brand before running the AI review.");
            return;
        }
        setAiLoading(true);
        setAiError(null);
        setAiReview(null);
        try {
            const result = await reviewCampaignDraft({ brandId, subject: subject || "", html });
            setAiReview(result);
        } catch (err) {
            setAiError(err instanceof Error ? err.message : "AI review failed.");
        } finally {
            setAiLoading(false);
        }
    };

    return (
        <div className={`rounded-lg border ${summaryColor} transition-colors`}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
                aria-expanded={open}
            >
                <div className="flex items-center gap-2 min-w-0">
                    {open ? (
                        <ChevronDown className="w-4 h-4 flex-shrink-0 text-zinc-500" />
                    ) : (
                        <ChevronRight className="w-4 h-4 flex-shrink-0 text-zinc-500" />
                    )}
                    <ShieldCheck className={`w-4 h-4 flex-shrink-0 ${STATUS_COLOR[summary.overall]}`} />
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">Pre-send review</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">— {summaryLabel}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 flex-shrink-0">
                    {summary.fail > 0 && (
                        <span className="inline-flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 text-red-500" /> {summary.fail}
                        </span>
                    )}
                    {summary.warn > 0 && (
                        <span className="inline-flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> {summary.warn}
                        </span>
                    )}
                    {summary.pass > 0 && (
                        <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {summary.pass}
                        </span>
                    )}
                </div>
            </button>

            {open && (
                <div className="px-4 pb-4 space-y-3 border-t border-zinc-200/70 dark:border-zinc-800/70">
                    <ul className="space-y-1.5 pt-3">
                        {checks.map(c => {
                            const Icon = STATUS_ICON[c.status];
                            return (
                                <li key={c.id} className="flex items-start gap-2 text-sm">
                                    <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${STATUS_COLOR[c.status]}`} />
                                    <div className="min-w-0">
                                        <span className="text-zinc-900 dark:text-white">{c.label}</span>
                                        {c.detail && (
                                            <span className="text-zinc-500 dark:text-zinc-400"> — {c.detail}</span>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>

                    {aiEnabled && (
                        <div className="pt-3 mt-3 border-t border-zinc-200/70 dark:border-zinc-800/70 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="text-xs text-zinc-500 dark:text-zinc-400 flex-1">
                                    The checks above are deterministic. Run AI review for judgment calls — tone, clarity, off-brand wording, weak CTAs.
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAiReview}
                                    disabled={aiLoading || !html.trim()}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-500/20 text-xs font-medium disabled:opacity-50 flex-shrink-0"
                                >
                                    {aiLoading ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Sparkles className="w-3.5 h-3.5" />
                                    )}
                                    {aiLoading ? "Reviewing…" : aiReview ? "Re-run AI" : "Run AI review"}
                                </button>
                            </div>

                            {aiError && (
                                <div className="text-xs text-red-600 dark:text-red-400">{aiError}</div>
                            )}

                            {aiReview && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/40">
                                        <div
                                            className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${aiReview.score >= 80
                                                ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                                : aiReview.score >= 60
                                                    ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                                    : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300"
                                                }`}
                                        >
                                            {aiReview.score}
                                        </div>
                                        <p className="text-xs text-zinc-700 dark:text-zinc-300">{aiReview.summary}</p>
                                    </div>

                                    {aiReview.warnings.length > 0 && (
                                        <ul className="space-y-1.5">
                                            {aiReview.warnings.map((w, i) => (
                                                <li key={`w-${i}`} className="flex items-start gap-2 text-xs">
                                                    <AlertTriangle
                                                        className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${w.severity === "high"
                                                            ? "text-red-500"
                                                            : w.severity === "medium"
                                                                ? "text-amber-500"
                                                                : "text-zinc-400"
                                                            }`}
                                                    />
                                                    <span className="text-zinc-700 dark:text-zinc-300">{w.message}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    {aiReview.suggestions.length > 0 && (
                                        <ul className="space-y-1.5">
                                            {aiReview.suggestions.map((s, i) => (
                                                <li key={`s-${i}`} className="flex items-start gap-2 text-xs">
                                                    <Sparkles className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-violet-500" />
                                                    <span className="text-zinc-700 dark:text-zinc-300">
                                                        <span className="text-zinc-500 mr-1">[{s.area}]</span>
                                                        {s.message}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
