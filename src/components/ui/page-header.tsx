import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
    title: React.ReactNode;
    description?: React.ReactNode;
    action?: React.ReactNode;
    breadcrumb?: React.ReactNode;
    meta?: React.ReactNode;
    className?: string;
}

export function PageHeader({ title, description, action, breadcrumb, meta, className }: PageHeaderProps) {
    return (
        <div className={cn("page-header-divider", className)}>
            {breadcrumb && (
                <div className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">{breadcrumb}</div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="page-title break-words">{title}</h1>
                        {meta}
                    </div>
                    {description && <p className="page-subtitle mt-1.5">{description}</p>}
                </div>
                {action && <div className="flex flex-wrap items-center gap-2 shrink-0">{action}</div>}
            </div>
        </div>
    );
}
