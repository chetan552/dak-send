"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LayoutTemplate, X, Loader2 } from "lucide-react";
import { getAllTemplates } from "@/app/actions/templates";

interface TemplatePickerProps {
    onSelect: (html: string) => void;
}

export function TemplatePicker({ onSelect }: TemplatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && templates.length === 0) {
            setLoading(true);
            getAllTemplates().then(t => {
                setTemplates(t);
                setLoading(false);
            });
        }
    }, [isOpen, templates.length]);

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
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                    <LayoutTemplate className="w-4 h-4" /> Email Templates
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                    <X className="w-4 h-4" />
                </Button>
            </div>
            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {templates.map(template => (
                        <button
                            key={template.id}
                            type="button"
                            onClick={() => {
                                onSelect(template.html);
                                setIsOpen(false);
                            }}
                            className="group relative border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 text-left hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-all"
                        >
                            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                                {template.category}
                            </span>
                            <h4 className="font-medium text-zinc-900 dark:text-white text-sm mt-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {template.name}
                            </h4>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                {template.preview}
                            </p>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
