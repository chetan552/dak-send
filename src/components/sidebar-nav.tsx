"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Send, Settings, Rss, BarChart3, Zap, LayoutTemplate, FileInput, ImageIcon, Tag, ShieldCheck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
    name: string;
    href: string;
    exact: boolean;
    icon: LucideIcon;
};

type NavGroup = {
    label: string;
    items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
    {
        label: "Workspace",
        items: [
            { name: "Brands", href: "/dashboard", exact: true, icon: LayoutDashboard },
        ],
    },
    {
        label: "Content",
        items: [
            { name: "Lists", href: "/dashboard/lists", exact: false, icon: Users },
            { name: "Campaigns", href: "/dashboard/campaigns", exact: false, icon: Send },
            { name: "Automations", href: "/dashboard/automations", exact: false, icon: Zap },
            { name: "Tags", href: "/dashboard/tags", exact: false, icon: Tag },
            { name: "Templates", href: "/dashboard/templates", exact: false, icon: LayoutTemplate },
            { name: "Media", href: "/dashboard/media", exact: false, icon: ImageIcon },
            { name: "Forms", href: "/dashboard/forms", exact: false, icon: FileInput },
        ],
    },
    {
        label: "Insights",
        items: [
            { name: "Analytics", href: "/dashboard/analytics", exact: false, icon: BarChart3 },
            { name: "Deliverability", href: "/dashboard/deliverability", exact: false, icon: ShieldCheck },
            { name: "RSS Feeds", href: "/dashboard/rss", exact: false, icon: Rss },
        ],
    },
    {
        label: "Settings",
        items: [
            { name: "Settings", href: "/dashboard/settings", exact: false, icon: Settings },
        ],
    },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function SidebarNav() {
    const pathname = usePathname();

    return (
        <nav className="flex-1 px-3 pt-3 pb-4">
            {NAV_GROUPS.map((group, idx) => (
                <div key={group.label} className={cn(idx > 0 && "mt-5")}>
                    <p className="nav-section-label">{group.label}</p>
                    <div className="space-y-0.5">
                        {group.items.map((item) => {
                            const isActive = item.exact
                                ? pathname === item.href
                                : pathname.startsWith(item.href);

                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-colors",
                                        isActive
                                            ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800/70 dark:text-white"
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
                    </div>
                </div>
            ))}
        </nav>
    );
}
