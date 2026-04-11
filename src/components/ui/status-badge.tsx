import * as React from "react";
import {
    FileEdit,
    Clock,
    Send,
    XCircle,
    CheckCircle2,
    AlertCircle,
    MailWarning,
    MailCheck,
} from "lucide-react";
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

interface StatusMeta {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    className: string;
    pulse?: boolean;
}

const STATUS_MAP: Record<StatusKind, StatusMeta> = {
    // Campaign statuses
    draft: {
        label: "Draft",
        icon: FileEdit,
        className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    },
    scheduled: {
        label: "Scheduled",
        icon: Clock,
        className: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    },
    sending: {
        label: "Sending",
        icon: Clock,
        className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
        pulse: true,
    },
    sent: {
        label: "Sent",
        icon: Send,
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    },
    cancelled: {
        label: "Cancelled",
        icon: XCircle,
        className: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-500",
    },
    failed: {
        label: "Failed",
        icon: AlertCircle,
        className: "bg-red-500/10 text-red-700 dark:text-red-400",
    },

    // Subscriber statuses
    subscribed: {
        label: "Subscribed",
        icon: CheckCircle2,
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    },
    unsubscribed: {
        label: "Unsubscribed",
        icon: XCircle,
        className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    },
    pending: {
        label: "Pending",
        icon: Clock,
        className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    },
    bounced: {
        label: "Bounced",
        icon: MailWarning,
        className: "bg-red-500/10 text-red-700 dark:text-red-400",
    },
    complained: {
        label: "Complained",
        icon: MailWarning,
        className: "bg-red-500/10 text-red-700 dark:text-red-400",
    },

    // Automation statuses
    active: {
        label: "Active",
        icon: MailCheck,
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    },
    paused: {
        label: "Paused",
        icon: Clock,
        className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    },
};

interface StatusBadgeProps {
    status: string;
    className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const meta = STATUS_MAP[status.toLowerCase() as StatusKind];

    if (!meta) {
        return (
            <span
                className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
                    className,
                )}
            >
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    }

    const Icon = meta.icon;

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                meta.className,
                className,
            )}
        >
            {meta.pulse ? (
                <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
                </span>
            ) : (
                <Icon className="w-3 h-3" />
            )}
            {meta.label}
        </span>
    );
}
