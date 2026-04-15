import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
    return (
        <div
            className={cn(
                "surface-card relative overflow-hidden",
                className,
            )}
        >
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.5] dark:opacity-[0.35] [background-image:linear-gradient(to_right,rgb(228_228_231)_1px,transparent_1px),linear-gradient(to_bottom,rgb(228_228_231)_1px,transparent_1px)] dark:[background-image:linear-gradient(to_right,rgb(39_39_42)_1px,transparent_1px),linear-gradient(to_bottom,rgb(39_39_42)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_75%)]"
            />
            <div className="relative flex flex-col items-center justify-center p-10 text-center animate-in fade-in duration-500">
                <div className="w-10 h-10 rounded-md bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                </div>
                <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-white mb-1.5">{title}</h3>
                {description && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 max-w-sm">{description}</p>
                )}
                {action}
            </div>
        </div>
    );
}
