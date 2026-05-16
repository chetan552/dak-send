"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toggleBrandAi } from "@/app/actions/ai";

interface BrandAiToggleProps {
    brandId: string;
    initialEnabled: boolean;
    aiAvailableGlobally: boolean;
}

export function BrandAiToggle({ brandId, initialEnabled, aiAvailableGlobally }: BrandAiToggleProps) {
    const [enabled, setEnabled] = useState(initialEnabled);
    const [isPending, startTransition] = useTransition();

    const handleToggle = () => {
        if (!aiAvailableGlobally) return;
        const next = !enabled;
        setEnabled(next);
        startTransition(async () => {
            try {
                await toggleBrandAi(brandId, next);
            } catch (err) {
                setEnabled(!next);
                alert(err instanceof Error ? err.message : "Failed to update AI setting");
            }
        });
    };

    if (!aiAvailableGlobally) {
        return (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
                <Sparkles className="w-3.5 h-3.5" />
                AI off (admin disabled)
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={handleToggle}
            disabled={isPending}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                enabled
                    ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/30 hover:bg-violet-100 dark:hover:bg-violet-500/20"
                    : "bg-zinc-50 dark:bg-zinc-900/40 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
            title={enabled ? "Click to disable AI for this brand" : "Click to enable AI for this brand"}
        >
            {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
                <Sparkles className="w-3.5 h-3.5" />
            )}
            AI {enabled ? "on" : "off"}
        </button>
    );
}
