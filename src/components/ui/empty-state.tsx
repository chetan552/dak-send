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
                "surface-card",
                className,
            )}
        >
            <div className="flex flex-col items-center justify-center py-12 px-8 text-center animate-in fade-in duration-500">
                <div className="w-11 h-11 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-primary" />
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
