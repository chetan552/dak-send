"use client";

import { useEffect, useState } from "react";
import { Activity, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getProviderStatus, type ProviderStatus } from "@/app/actions/provider-status";

const STYLE: Record<ProviderStatus["level"], { dot: string; text: string; ring: string }> = {
    healthy: {
        dot: "bg-emerald-500",
        text: "text-emerald-700 dark:text-emerald-400",
        ring: "ring-emerald-500/30",
    },
    warning: {
        dot: "bg-amber-500",
        text: "text-amber-700 dark:text-amber-400",
        ring: "ring-amber-500/30",
    },
    critical: {
        dot: "bg-red-500",
        text: "text-red-700 dark:text-red-400",
        ring: "ring-red-500/30",
    },
    unconfigured: {
        dot: "bg-zinc-400",
        text: "text-zinc-500 dark:text-zinc-400",
        ring: "ring-zinc-400/30",
    },
};

const POLL_INTERVAL_MS = 60_000;

export function SidebarProviderStatus() {
    const [status, setStatus] = useState<ProviderStatus | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const s = await getProviderStatus();
                if (!cancelled) setStatus(s);
            } catch {
                // ignore; widget stays in its last good state
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        const id = setInterval(load, POLL_INTERVAL_MS);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, []);

    if (loading && !status) {
        return (
            <div className="px-2.5 py-1.5 mx-3 mt-2 mb-1 rounded-md text-xs flex items-center gap-2 text-zinc-400">
                <Loader2 className="w-3 h-3 animate-spin" /> Checking provider...
            </div>
        );
    }

    if (!status) return null;
    const s = STYLE[status.level];

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className={`mx-3 mt-2 mb-1 px-2.5 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 flex items-center gap-2 cursor-default ring-1 ${s.ring}`}>
                    <span className={`w-2 h-2 rounded-full ${s.dot} ${status.level === "healthy" ? "" : "animate-pulse"}`} />
                    <span className="text-[10px] uppercase tracking-wider font-medium text-zinc-400 dark:text-zinc-500">{status.provider}</span>
                    <span className={`text-xs font-medium ${s.text} ml-auto`}>{status.label}</span>
                    <Activity className="w-3 h-3 text-zinc-400" />
                </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[260px] text-xs">
                {status.detail || `${status.provider.toUpperCase()} provider status`}
            </TooltipContent>
        </Tooltip>
    );
}
