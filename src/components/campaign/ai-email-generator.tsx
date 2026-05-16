"use client";

import { useState } from "react";
import { Sparkles, Loader2, X, ArrowRight, RefreshCw } from "lucide-react";
import { generateEmailFromPrompt } from "@/app/actions/ai";

interface AiEmailGeneratorProps {
    brands: Array<{ id: string; name: string }>;
    aiEnabledByBrand: Record<string, boolean>;
}

export function AiEmailGenerator({ brands, aiEnabledByBrand }: AiEmailGeneratorProps) {
    const eligibleBrands = brands.filter((b) => aiEnabledByBrand[b.id]);
    const [open, setOpen] = useState(false);
    const [brandId, setBrandId] = useState<string>(eligibleBrands[0]?.id || "");
    const [prompt, setPrompt] = useState("");
    const [tone, setTone] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ html: string; suggestedSubject?: string } | null>(null);

    if (eligibleBrands.length === 0) return null;

    const handleGenerate = async () => {
        if (!brandId || !prompt.trim()) return;
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const out = await generateEmailFromPrompt({ brandId, prompt, tone: tone.trim() || undefined });
            setResult({ html: out.html, suggestedSubject: out.suggestedSubject });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Generation failed");
        } finally {
            setLoading(false);
        }
    };

    const handleUse = () => {
        if (!result || typeof window === "undefined") return;
        sessionStorage.setItem("template_html", result.html);
        if (result.suggestedSubject) {
            sessionStorage.setItem("template_subject", result.suggestedSubject);
        }
        sessionStorage.setItem("template_brand", brandId);
        window.location.href = "/dashboard/campaigns/new?template=true";
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white transition-colors shadow-[0_0_20px_rgba(124,58,237,0.25)]"
            >
                <Sparkles className="w-3.5 h-3.5" /> Generate with AI
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={() => !loading && setOpen(false)}
                >
                    <div
                        className="w-full max-w-3xl bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden max-h-[90vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-violet-500" /> Generate Email with AI
                            </h2>
                            <button
                                onClick={() => !loading && setOpen(false)}
                                disabled={loading}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 hover:text-zinc-700 disabled:opacity-50"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            {!result && (
                                <>
                                    {eligibleBrands.length > 1 && (
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Brand</label>
                                            <select
                                                value={brandId}
                                                onChange={(e) => setBrandId(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                                            >
                                                {eligibleBrands.map((b) => (
                                                    <option key={b.id} value={b.id}>{b.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">What is this email about?</label>
                                        <textarea
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            placeholder="Example: A welcome email for new subscribers to my weekly newsletter about indie tech tools. Friendly, brief, with a CTA to read the latest issue."
                                            rows={5}
                                            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-sm focus:ring-2 focus:ring-violet-500 outline-none resize-y"
                                        />
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{prompt.length} / 2000 characters</p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tone (optional)</label>
                                        <input
                                            type="text"
                                            value={tone}
                                            onChange={(e) => setTone(e.target.value)}
                                            placeholder="Friendly, professional, urgent, witty..."
                                            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                                        />
                                    </div>
                                </>
                            )}

                            {loading && (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-violet-500 mb-3" />
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">DeepSeek is drafting your email...</p>
                                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Usually 15-40 seconds.</p>
                                </div>
                            )}

                            {error && (
                                <div className="p-3 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-sm text-red-700 dark:text-red-300">
                                    {error}
                                </div>
                            )}

                            {result && !loading && (
                                <div className="space-y-3">
                                    {result.suggestedSubject && (
                                        <div className="p-3 rounded-lg border border-violet-200 dark:border-violet-500/30 bg-violet-50/60 dark:bg-violet-500/5">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300 mb-1">Suggested subject</p>
                                            <p className="text-sm text-zinc-900 dark:text-white font-medium">{result.suggestedSubject}</p>
                                        </div>
                                    )}
                                    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                                        <div className="flex items-center gap-1.5 px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                                            <span className="w-2 h-2 rounded-full bg-red-400/70" />
                                            <span className="w-2 h-2 rounded-full bg-amber-400/70" />
                                            <span className="w-2 h-2 rounded-full bg-emerald-400/70" />
                                            <span className="ml-2 text-[10px] text-zinc-500">Preview</span>
                                        </div>
                                        <iframe
                                            srcDoc={result.html}
                                            title="AI email preview"
                                            className="w-full h-[400px] bg-white"
                                            sandbox=""
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-between gap-2">
                            {result && !loading ? (
                                <>
                                    <button
                                        onClick={() => {
                                            setResult(null);
                                        }}
                                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" /> Try a different prompt
                                    </button>
                                    <button
                                        onClick={handleUse}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium"
                                    >
                                        Use this email <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setOpen(false)}
                                        disabled={loading}
                                        className="px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleGenerate}
                                        disabled={loading || !prompt.trim() || !brandId}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                        {loading ? "Generating..." : "Generate"}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
