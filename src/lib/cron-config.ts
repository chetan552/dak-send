// Shared types and constants for cron job configuration.
// No "use server" — safe to import anywhere.

export type CronJobKey = "scheduled" | "rss" | "automations";

export interface CronJobConfig {
    enabled: boolean;
    interval: string;
    lastRun: string | null;
}

export interface CronSettings {
    scheduled: CronJobConfig;
    rss: CronJobConfig;
    automations: CronJobConfig;
}

export const CRON_INTERVAL_OPTIONS: { value: string; label: string }[] = [
    { value: "* * * * *",    label: "Every 1 minute" },
    { value: "*/2 * * * *",  label: "Every 2 minutes" },
    { value: "*/5 * * * *",  label: "Every 5 minutes" },
    { value: "*/15 * * * *", label: "Every 15 minutes" },
    { value: "*/30 * * * *", label: "Every 30 minutes" },
    { value: "0 * * * *",    label: "Every hour" },
    { value: "0 */6 * * *",  label: "Every 6 hours" },
    { value: "0 6 * * *",    label: "Daily at 6:00 AM" },
    { value: "0 8 * * *",    label: "Daily at 8:00 AM" },
    { value: "0 0 * * *",    label: "Daily at midnight" },
];
