"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { LayoutTemplate, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { saveTemplate, updateTemplate } from "@/app/actions/templates";

interface SaveTemplateFormProps {
    initialData?: {
        id: string;
        name: string;
        category: string;
        description: string;
        html: string;
        isPublic: boolean;
    };
}

export function SaveTemplateForm({ initialData }: SaveTemplateFormProps = {}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [name, setName] = useState(initialData?.name || "");
    const [category, setCategory] = useState(initialData?.category || "Custom");
    const [description, setDescription] = useState(initialData?.description || "");
    const [html, setHtml] = useState(initialData?.html || "");
    const [isPublic, setIsPublic] = useState(initialData?.isPublic || false);
    const [error, setError] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!name.trim()) { setError("Template name is required."); return; }
        if (!html.trim()) { setError("HTML content is required."); return; }

        startTransition(async () => {
            try {
                if (initialData?.id) {
                    await updateTemplate(initialData.id, { name, category, description, html, isPublic });
                } else {
                    await saveTemplate({ name, category, description, html, isPublic });
                }
                router.push("/dashboard/templates");
            } catch (err: any) {
                setError(err.message || "Failed to save template.");
            }
        });
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400 mb-2">
                <Link href="/dashboard/templates" className="hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Templates
                </Link>
            </div>

            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-1 flex items-center gap-3">
                    <LayoutTemplate className="w-7 h-7 text-indigo-500" />
                    {initialData?.id ? "Edit Custom Template" : "Save Custom Template"}
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {initialData?.id ? "Update your template HTML and settings." : "Save your email HTML as a reusable template for future campaigns."}
                </p>
            </div>

            <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800">
                <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                Template Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Monthly Newsletter, Product Update"
                                className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    Category
                                </label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                                >
                                    <option value="Custom">Custom</option>
                                    <option value="Newsletter">Newsletter</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="E-commerce">E-commerce</option>
                                    <option value="Personal">Personal</option>
                                    <option value="Onboarding">Onboarding</option>
                                    <option value="Events">Events</option>
                                    <option value="Engagement">Engagement</option>
                                </select>
                            </div>
                            <div className="flex items-end pb-1">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isPublic}
                                        onChange={(e) => setIsPublic(e.target.checked)}
                                        className="rounded border-zinc-300 dark:border-zinc-600 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-zinc-700 dark:text-zinc-300">Share with team</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                Description (optional)
                            </label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Short description of this template"
                                className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                HTML Content
                            </label>
                            <textarea
                                value={html}
                                onChange={(e) => setHtml(e.target.value)}
                                rows={12}
                                placeholder="Paste your email HTML here..."
                                className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm font-mono"
                            />
                            <p className="text-xs text-zinc-500 mt-1">
                                Supports placeholders: [Name], [Email], [Brand Name], [Subject], [Unsubscribe]
                            </p>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {isPending ? "Saving..." : initialData?.id ? "Update Template" : "Save Template"}
                        </button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
