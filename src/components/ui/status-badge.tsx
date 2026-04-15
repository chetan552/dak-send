import * as React from "react";
import { cn } from "@/lib/utils";

export type CampaignStatus =
    | "draft"
    | "scheduled"
    | "sending"
    | "sent"
    | "cancelled"
    | "failed";

export type SubscriberStatus =
    | "subscribed"
    | "unsubscribed"
    | "pending"
    | "bounced"
    | "complained";

export type AutomationStatus = "active" | "paused" | "draft";

export type StatusKind = CampaignStatus | SubscriberStatus | AutomationStatus;

type Tone = "neutral" | "blue" | "amber" | "emerald" | "rose";

interface StatusMeta {
    label: string;
    tone: Tone;
    pulse?: boolean;
}

const STATUS_MAP: Record<StatusKind, StatusMeta> = {
    draft: { label: "Draft", tone: "neutral" },
    scheduled: { label: "Scheduled", tone: "blue" },
    sending: { label: "Sending", tone: "amber", pulse: true },
    sent: { label: "Sent", tone: "emerald" },
    cancelled: { label: "Cancelled", tone: "neutral" },
    failed: { label: "Failed", tone: "rose" },

    subscribed: { label: "Subscribed", tone: "emerald" },
    unsubscribed: { label: "Unsubscribed", tone: "neutral" },
    pending: { label: "Pending", tone: "amber" },
    bounced: { label: "Bounced", tone: "rose" },
    complained: { label: "Complained", tone: "rose" },

    active: { label: "Active", tone: "emerald" },
    paused: { label: "Paused", tone: "neutral" },
};

const TONE_STYLES: Record<Tone, { pill: string; dot: string }> = {
    neutral: {
        pill: "text-zinc-600 dark:text-zinc-300 ring-zinc-200 dark:ring-zinc-700/80 bg-white dark:bg-zinc-900/60",
        dot: "bg-zinc-400 dark:bg-zinc-500",
    },
    blue: {
        pill: "text-blue-700 dark:text-blue-300 ring-blue-500/20 dark:ring-blue-400/30 bg-white dark:bg-zinc-900/60",
        dot: "bg-blue-500 dark:bg-blue-400",
    },
    amber: {
        pill: "text-amber-700 dark:text-amber-300 ring-amber-500/25 dark:ring-amber-400/30 bg-white dark:bg-zinc-900/60",
        dot: "bg-amber-500 dark:bg-amber-400",
    },
    emerald: {
        pill: "text-emerald-700 dark:text-emerald-300 ring-emerald-500/20 dark:ring-emerald-400/30 bg-white dark:bg-zinc-900/60",
        dot: "bg-emerald-500 dark:bg-emerald-400",
    },
    rose: {
        pill: "text-rose-700 dark:text-rose-300 ring-rose-500/25 dark:ring-rose-400/30 bg-white dark:bg-zinc-900/60",
        dot: "bg-rose-500 dark:bg-rose-400",
    },
};

interface StatusBadgeProps {
    status: string;
    size?: "sm" | "md";
    className?: string;
}

export function StatusBadge({ status, size = "sm", className }: StatusBadgeProps) {
    const meta = STATUS_MAP[status.toLowerCase() as StatusKind];
    const tone: Tone = meta?.tone ?? "neutral";
    const label = meta?.label ?? status.charAt(0).toUpperCase() + status.slice(1);
    const styles = TONE_STYLES[tone];

    const sizeCls =
        size === "md"
            ? "px-2.5 py-1 text-xs gap-1.5"
            : "px-2 py-0.5 text-[11px] gap-1.5";

    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full font-medium ring-1 ring-inset",
                sizeCls,
                styles.pill,
                className,
            )}
        >
            {meta?.pulse ? (
                <span className="relative flex h-1.5 w-1.5">
                    <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-70", styles.dot)} />
                    <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", styles.dot)} />
                </span>
            ) : (
                <span className={cn("h-1.5 w-1.5 rounded-full", styles.dot)} />
            )}
            {label}
        </span>
    );
}
