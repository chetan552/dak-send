"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Send, Settings, Rss, BarChart3, Zap, LayoutTemplate, FileInput, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
    { name: "Brands", href: "/dashboard", exact: true, icon: LayoutDashboard },
    { name: "Lists", href: "/dashboard/lists", exact: false, icon: Users },
    { name: "Campaigns", href: "/dashboard/campaigns", exact: false, icon: Send },
    { name: "Automations", href: "/dashboard/automations", exact: false, icon: Zap },
    { name: "Templates", href: "/dashboard/templates", exact: false, icon: LayoutTemplate },
    { name: "Media", href: "/dashboard/media", exact: false, icon: ImageIcon },
    { name: "Forms", href: "/dashboard/forms", exact: false, icon: FileInput },
    { name: "Analytics", href: "/dashboard/analytics", exact: false, icon: BarChart3 },
    { name: "RSS Feeds", href: "/dashboard/rss", exact: false, icon: Rss },
    { name: "Settings", href: "/dashboard/settings", exact: false, icon: Settings },
];

export function SidebarNav() {
    const pathname = usePathname();

    return (
        <nav className="flex-1 px-4 space-y-2 mt-4">
            {NAV_ITEMS.map((item) => {
                const isActive = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href);

                const Icon = item.icon;

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "relative flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors",
                            isActive
                                ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800/70 dark:text-white before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-primary before:rounded-r-full"
                                : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800/50"
                        )}
                    >
                        <Icon className={cn(
                            "w-4 h-4",
                            isActive ? "text-primary" : "text-zinc-500 dark:text-zinc-400"
                        )} />
                        <span className="text-sm font-medium">{item.name}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
