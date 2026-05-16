"use client";

import { useState } from "react";
import { Loader2, Download, X, Globe, FileCode } from "lucide-react";
import { importCampaignContent } from "@/app/actions/campaign";

export function CampaignImporter() {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<"html" | "url">("html");
    const [html, setHtml] = useState("");
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleImport = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await importCampaignContent(mode === "html" ? { html } : { url });
            if (!result.html.trim()) throw new Error("Import returned empty content.");
            if (typeof window !== "undefined") {
                sessionStorage.setItem("template_html", result.html);
                window.location.href = "/dashboard/campaigns/new?template=true";
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Import failed");
            setLoading(false);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
                <Download className="w-3.5 h-3.5" /> Import HTML
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={() => !loading && setOpen(false)}
                >
                    <div
                        className="w-full max-w-2xl bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Import Email Content</h2>
                            <button
                                onClick={() => !loading && setOpen(false)}
                                disabled={loading}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 hover:text-zinc-700 disabled:opacity-50"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="px-5 pt-4">
                            <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-900">
                                <button
                                    onClick={() => setMode("html")}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                                        mode === "html"
                                            ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white shadow-sm"
                                            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                                    }`}
                                >
                                    <FileCode className="w-3.5 h-3.5" /> Paste HTML
                                </button>
                                <button
                                    onClick={() => setMode("url")}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                                        mode === "url"
                                            ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white shadow-sm"
                                            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                                    }`}
                                >
                                    <Globe className="w-3.5 h-3.5" /> From URL
                                </button>
                            </div>
                        </div>

                        <div className="p-5 space-y-3">
                            {mode === "html" ? (
                                <>
                                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                        Paste your HTML email
                                    </label>
                                    <textarea
                                        value={html}
                                        onChange={(e) => setHtml(e.target.value)}
                                        placeholder="<html>...</html>"
                                        rows={12}
                                        className="w-full font-mono text-xs px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    />
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Scripts, iframes, and inline event handlers will be stripped on import.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                        Email URL
                                    </label>
                                    <input
                                        type="url"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        placeholder="https://example.com/newsletter/123.html"
                                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                                    />
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Public HTTP/HTTPS URLs only. Max 1.5 MB. Local/private hosts are blocked.
                                    </p>
                                </>
                            )}

                            {error && (
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                            )}
                        </div>

                        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
                            <button
                                onClick={() => setOpen(false)}
                                disabled={loading}
                                className="px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={loading || (mode === "html" ? !html.trim() : !url.trim())}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                {loading ? "Importing..." : "Import & continue"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
