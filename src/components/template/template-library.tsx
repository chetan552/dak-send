"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutTemplate, Search, Trash2, Eye, Pencil, ArrowRight } from "lucide-react";
import { TemplatePreview } from "@/components/template/template-preview";
import { deleteTemplate } from "@/app/actions/templates";

interface Template {
    id: string;
    name: string;
    category: string;
    description: string;
    html: string;
    builtIn?: boolean;
    isCustom: boolean;
    isPublic?: boolean;
    createdAt: Date | string | null;
    userName: string | null;
    userId?: string;
}

interface TemplateLibraryProps {
    templates: Template[];
    currentUserId: string | undefined;
    isAdmin: boolean;
}

export function TemplateLibrary({ templates, currentUserId, isAdmin }: TemplateLibraryProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

    const categories = ["All", ...Array.from(new Set(templates.map(t => t.category)))];

    const filtered = templates.filter(t => {
        const matchesSearch =
            t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.description.toLowerCase().includes(search.toLowerCase()) ||
            t.category.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory === "All" || t.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Delete this template?")) return;
        startTransition(async () => {
            await deleteTemplate(id);
            router.refresh();
        });
    };

    const handleUseInCampaign = (html: string) => {
        if (typeof window !== "undefined") {
            sessionStorage.setItem("template_html", html);
            router.push("/dashboard/campaigns/new?template=true");
        }
    };

    return (
        <div className="space-y-6">
            {/* Search + count */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search templates…"
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm transition-all"
                    />
                </div>
                <span className="text-sm text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
                    {filtered.length} {filtered.length === 1 ? "template" : "templates"}
                </span>
            </div>

            {/* Category tabs */}
            <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                            selectedCategory === cat
                                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white"
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Template grid */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 flex items-center justify-center mb-4">
                        <LayoutTemplate className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                    </div>
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">No templates found</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {search ? "Try a different search term." : "Save a campaign as a template to see it here."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map((template, i) => (
                        <div
                            key={template.id}
                            className="group flex flex-col rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xl dark:hover:shadow-zinc-950/50 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
                            style={{ animationDelay: `${i * 25}ms`, animationFillMode: "both" }}
                        >
                            {/* Browser chrome bar */}
                            <div className="flex items-center gap-1.5 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
                                <div className="flex-1 mx-2 h-4 rounded-sm bg-zinc-200 dark:bg-zinc-700/60" />
                            </div>

                            {/* Preview thumbnail */}
                            <div className="relative overflow-hidden">
                                <TemplatePreview html={template.html} height={200} />

                                {/* Hover overlay */}
                                <div className="absolute inset-0 bg-zinc-900/70 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-3 px-4">
                                    <button
                                        onClick={() => handleUseInCampaign(template.html)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-zinc-900 font-semibold text-sm hover:bg-zinc-100 transition-colors shadow-lg"
                                    >
                                        Use this template <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setPreviewTemplate(template)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors"
                                        >
                                            <Eye className="w-3.5 h-3.5" /> Preview
                                        </button>
                                        {template.isCustom && (template.userId === currentUserId || isAdmin) && (
                                            <>
                                                <Link
                                                    href={`/dashboard/templates/${template.id}/edit`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" /> Edit
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleDelete(template.id, e)}
                                                    disabled={isPending}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 text-white text-xs font-medium hover:bg-red-500/60 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Card footer */}
                            <div className="px-4 py-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white truncate leading-snug">
                                        {template.name}
                                    </h3>
                                    {template.description && (
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                            {template.description}
                                        </p>
                                    )}
                                </div>
                                <span className={`flex-shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${
                                    template.builtIn
                                        ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                                        : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                }`}>
                                    {template.builtIn ? template.category : "Custom"}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Full preview modal */}
            {previewTemplate && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    onClick={() => setPreviewTemplate(null)}
                >
                    <div
                        className="w-full max-w-2xl mx-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
                            <div>
                                <h3 className="font-semibold text-zinc-900 dark:text-white text-sm">{previewTemplate.name}</h3>
                                {previewTemplate.description && (
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{previewTemplate.description}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        handleUseInCampaign(previewTemplate.html);
                                        setPreviewTemplate(null);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold text-sm hover:bg-zinc-700 dark:hover:bg-zinc-100 transition-colors"
                                >
                                    Use template <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => setPreviewTemplate(null)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors text-lg leading-none"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Modal preview */}
                        <div className="flex-1 overflow-auto bg-zinc-100 dark:bg-zinc-950 p-6">
                            <div className="mx-auto max-w-[600px] bg-white rounded-xl shadow overflow-hidden">
                                {/* Browser chrome in modal */}
                                <div className="flex items-center gap-1.5 px-3 py-2 bg-zinc-50 border-b border-zinc-200">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
                                    <div className="flex-1 mx-2 h-4 rounded-sm bg-zinc-200" />
                                </div>
                                <TemplatePreview html={previewTemplate.html} height={560} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
