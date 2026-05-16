"use client";

import { useState } from "react";
import { Sparkles, Loader2, Check } from "lucide-react";
import { generateSubjectLines } from "@/app/actions/ai";

interface AiSubjectGeneratorProps {
    brandId: string | undefined;
    getBodyHtml: () => string;
    currentSubject: string;
    onPick: (subject: string) => void;
}

export function AiSubjectGenerator({ brandId, getBodyHtml, currentSubject, onPick }: AiSubjectGeneratorProps) {
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [picked, setPicked] = useState<string | null>(null);

    if (!brandId) return null;

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        setSuggestions([]);
        setPicked(null);
        try {
            const html = getBodyHtml();
            const result = await generateSubjectLines({
                brandId,
                bodyHtml: html,
                currentSubject,
            });
            setSuggestions(result.suggestions);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to generate subject lines");
        } finally {
            setLoading(false);
        }
    };

    const handlePick = (s: string) => {
        onPick(s);
        setPicked(s);
        setTimeout(() => setPicked(null), 1200);
    };

    return (
        <div className="space-y-2">
            <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 dark:text-violet-300 hover:text-violet-900 dark:hover:text-violet-100 disabled:opacity-60"
            >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {loading ? "Generating..." : suggestions.length > 0 ? "Regenerate" : "Suggest with AI"}
            </button>
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
            {suggestions.length > 0 && (
                <div className="space-y-1.5 rounded-lg border border-violet-200 dark:border-violet-500/30 bg-violet-50/40 dark:bg-violet-500/5 p-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-violet-700 dark:text-violet-300 mb-1.5">
                        Click to use
                    </p>
                    {suggestions.map((s, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => handlePick(s)}
                            className="w-full text-left text-sm px-2.5 py-1.5 rounded-md bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 hover:border-violet-400 dark:hover:border-violet-500/60 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors text-zinc-800 dark:text-zinc-200 flex items-center justify-between gap-2"
                        >
                            <span className="truncate">{s}</span>
                            {picked === s && <Check className="w-3.5 h-3.5 flex-shrink-0 text-emerald-500" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
