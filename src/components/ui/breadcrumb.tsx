import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function Breadcrumb({ className, ...props }: React.ComponentProps<"nav">) {
    return (
        <nav aria-label="Breadcrumb" className={cn("text-sm", className)} {...props} />
    );
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
    return (
        <ol
            className={cn(
                "flex flex-wrap items-center gap-1.5 text-zinc-500 dark:text-zinc-400",
                className,
            )}
            {...props}
        />
    );
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
    return (
        <li className={cn("inline-flex items-center gap-1.5", className)} {...props} />
    );
}

function BreadcrumbLink({
    className,
    href,
    ...props
}: React.ComponentProps<typeof Link>) {
    return (
        <Link
            href={href}
            className={cn(
                "hover:text-zinc-900 dark:hover:text-white transition-colors",
                className,
            )}
            {...props}
        />
    );
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
    return (
        <span
            aria-current="page"
            className={cn("font-medium text-zinc-900 dark:text-white", className)}
            {...props}
        />
    );
}

function BreadcrumbSeparator({ className, children, ...props }: React.ComponentProps<"li">) {
    return (
        <li
            role="presentation"
            aria-hidden="true"
            className={cn("text-zinc-400 dark:text-zinc-600", className)}
            {...props}
        >
            {children ?? <ChevronRight className="w-3.5 h-3.5" />}
        </li>
    );
}

export {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator,
};
