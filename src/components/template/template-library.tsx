"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutTemplate, Plus, Search, Trash2, Copy, Eye, ExternalLink, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
    createdAt: string | null;
    userName: string | null;
    userId?: string;
}

interface TemplateLibraryProps {
    templates: Template[];
    currentUserId: string;
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
        const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
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
        // Store HTML in sessionStorage and redirect to new campaign
        if (typeof window !== "undefined") {
            sessionStorage.setItem("template_html", html);
            router.push("/dashboard/campaigns/new?template=true");
        }
    };

    return (
        <div className="space-y-6">
            {/* Search and filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search templates..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                    />
                </div>
            </div>

            {/* Category pills */}
            <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedCategory === cat
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Template grid */}
            {filtered.length === 0 ? (
                <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800">
                    <CardContent className="py-16 text-center">
                        <LayoutTemplate className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">No templates found</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                            {search ? "Try a different search term." : "Save a campaign as a template to see it here."}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((template, i) => (
                        <Card
                            key={template.id}
                            className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 overflow-hidden group hover:shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
                            style={{ animationDelay: `${i * 30}ms`, animationFillMode: "both" }}
                        >
                            {/* Preview thumbnail */}
                            <div className="relative border-b border-zinc-200 dark:border-zinc-800 overflow-hidden">
                                <TemplatePreview html={template.html} height={180} />
                                {/* Hover overlay */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => setPreviewTemplate(template)}
                                        className="p-2.5 rounded-lg bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-colors"
                                        title="Preview"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleUseInCampaign(template.html)}
                                        className="px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors"
                                    >
                                        Use Template
                                    </button>
                                    {template.isCustom && (template.userId === currentUserId || isAdmin) && (
                                        <>
                                            <Link
                                                href={`/dashboard/templates/${template.id}/edit`}
                                                className="p-2.5 rounded-lg bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-colors"
                                                title="Edit"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={(e) => handleDelete(template.id, e)}
                                                disabled={isPending}
                                                className="p-2.5 rounded-lg bg-white/10 backdrop-blur-sm text-white hover:bg-red-500/50 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Card details */}
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-zinc-900 dark:text-white text-sm truncate">
                                            {template.name}
                                        </h3>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                                            {template.description}
                                        </p>
                                    </div>
                                    <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${template.builtIn
                                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                        }`}>
                                        {template.builtIn ? template.category : "Custom"}
                                    </span>
                                </div>
                                {template.isCustom && template.userName && (
                                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-2">
                                        By {template.userName}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Full preview modal */}
            {previewTemplate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setPreviewTemplate(null)}>
                    <div className="w-full max-w-3xl max-h-[90vh] mx-4 bg-white dark:bg-zinc-950 rounded-xl shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
                            <div>
                                <h3 className="font-semibold text-zinc-900 dark:text-white">{previewTemplate.name}</h3>
                                <p className="text-xs text-zinc-500">{previewTemplate.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        handleUseInCampaign(previewTemplate.html);
                                        setPreviewTemplate(null);
                                    }}
                                    className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors"
                                >
                                    Use in Campaign
                                </button>
                                <button
                                    onClick={() => setPreviewTemplate(null)}
                                    className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto bg-zinc-100 dark:bg-zinc-900 p-4">
                            <div className="mx-auto max-w-[620px] bg-white rounded-lg shadow-sm overflow-hidden">
                                <TemplatePreview html={previewTemplate.html} height={600} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
