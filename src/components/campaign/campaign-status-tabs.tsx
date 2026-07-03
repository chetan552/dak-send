import Link from "next/link";
import { cn } from "@/lib/utils";

const STATUS_TABS: { key: string; label: string }[] = [
    { key: "draft", label: "Drafts" },
    { key: "scheduled", label: "Scheduled" },
    { key: "sending", label: "Sending" },
    { key: "sent", label: "Sent" },
    { key: "cancelled", label: "Cancelled" },
    { key: "failed", label: "Failed" },
];

/**
 * Status filter tabs for the campaigns list. Each tab is a link that sets the
 * `status` search param (and drops `page`, so filtering restarts at page 1).
 * Only statuses that have at least one campaign are shown, alongside "All".
 */
export function CampaignStatusTabs({
    counts,
    total,
    activeStatus,
}: {
    counts: Record<string, number>;
    total: number;
    activeStatus?: string;
}) {
    const tabs = [
        { key: "all", label: "All", count: total },
        ...STATUS_TABS.filter((t) => (counts[t.key] || 0) > 0).map((t) => ({ ...t, count: counts[t.key] })),
    ];

    return (
        <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
            {tabs.map((tab) => {
                const active = tab.key === "all" ? !activeStatus : activeStatus === tab.key;
                const href = tab.key === "all" ? "/dashboard/campaigns" : `/dashboard/campaigns?status=${tab.key}`;
                return (
                    <Link
                        key={tab.key}
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                            "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                            active
                                ? "bg-primary text-primary-foreground"
                                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                        )}
                    >
                        {tab.label}
                        <span
                            className={cn(
                                "rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                                active
                                    ? "bg-white/20 text-primary-foreground"
                                    : "bg-zinc-200/70 dark:bg-zinc-700/70 text-zinc-600 dark:text-zinc-300",
                            )}
                        >
                            {tab.count}
                        </span>
                    </Link>
                );
            })}
        </div>
    );
}
