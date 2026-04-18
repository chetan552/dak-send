import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
    label: string;
    value: React.ReactNode;
    hint?: React.ReactNode;
    icon?: LucideIcon;
    tint?: string;
    delay?: number;
    className?: string;
}

export function StatCard({ label, value, hint, icon: Icon, delay = 0, className }: StatCardProps) {
    return (
        <div
            className={cn(
                "surface-card-elevated surface-card-hover p-4 animate-in fade-in",
                className,
            )}
            style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
        >
            <div className="flex items-center justify-between">
                <span className="stat-label">{label}</span>
                {Icon && (
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/50">
                        <Icon className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                    </span>
                )}
            </div>
            <div className="mt-3 stat-value">{value}</div>
            {hint && <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>}
        </div>
    );
}
