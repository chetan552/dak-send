"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LayoutTemplate, X, Loader2, ArrowRight } from "lucide-react";
import { getAllTemplates } from "@/app/actions/templates";
import { TemplatePreview } from "@/components/template/template-preview";

interface TemplatePickerProps {
    onSelect: (html: string) => void;
}

export function TemplatePicker({ onSelect }: TemplatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (isOpen && templates.length === 0) {
            setLoading(true);
            getAllTemplates().then(t => {
                setTemplates(t);
                setLoading(false);
            });
        }
    }, [isOpen, templates.length]);

    const filtered = templates.filter(t =>
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.category || "").toLowerCase().includes(search.toLowerCase())
    );

    if (!isOpen) {
        return (
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(true)}
                className="border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white gap-2"
            >
                <LayoutTemplate className="w-4 h-4" /> Use Template
            </Button>
        );
    }

    return (
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 overflow-hidden mb-4 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40">
                <h3 className="font-semibold text-zinc-900 dark:text-white text-sm flex items-center gap-2">
                    <LayoutTemplate className="w-4 h-4 text-indigo-500" /> Choose a Template
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="h-7 w-7 p-0">
                    <X className="w-4 h-4" />
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                </div>
            ) : (
                <div className="p-4 space-y-3">
                    {templates.length > 6 && (
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search templates…"
                            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                        />
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-0.5">
                        {filtered.map(template => (
                            <button
                                key={template.id}
                                type="button"
                                onClick={() => {
                                    onSelect(template.html);
                                    setIsOpen(false);
                                }}
                                className="group flex flex-col rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden text-left hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all duration-200"
                            >
                                {/* Browser chrome dots */}
                                <div className="flex items-center gap-1 px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-100 dark:border-zinc-800">
                                    <span className="w-2 h-2 rounded-full bg-red-400/60" />
                                    <span className="w-2 h-2 rounded-full bg-amber-400/60" />
                                    <span className="w-2 h-2 rounded-full bg-emerald-400/60" />
                                </div>
                                {/* Preview */}
                                <div className="relative overflow-hidden">
                                    <TemplatePreview html={template.html} height={120} />
                                    <div className="absolute inset-0 bg-blue-600/80 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center">
                                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white text-blue-700 text-xs font-semibold shadow">
                                            Select <ArrowRight className="w-3 h-3" />
                                        </span>
                                    </div>
                                </div>
                                {/* Label */}
                                <div className="px-2.5 py-2">
                                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {template.name}
                                    </p>
                                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                                        {template.category}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
