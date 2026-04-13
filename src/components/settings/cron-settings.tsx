"use client";

import { useState, useTransition } from "react";
import { updateCronJob, runCronJobNow } from "@/app/actions/cron-settings";
import { CRON_INTERVAL_OPTIONS } from "@/lib/cron-config";
import type { CronSettings, CronJobKey } from "@/lib/cron-config";
import { toast } from "sonner";
import { Play, Clock, RefreshCw, Copy, Check } from "lucide-react";

interface CronSettingsProps {
    settings: CronSettings;
    appUrl: string;
    cronSecret: string;
}

const JOB_META: Record<CronJobKey, { label: string; description: string; defaultInterval: string }> = {
    scheduled: {
        label: "Scheduled Campaigns",
        description: "Dispatches campaigns whose send time has arrived.",
        defaultInterval: "* * * * *",
    },
    rss: {
        label: "RSS Feeds",
        description: "Polls RSS feeds and creates digest / per-item campaign drafts.",
        defaultInterval: "*/30 * * * *",
    },
    automations: {
        label: "Automations",
        description: "Advances enrolled subscribers through drip automation steps.",
        defaultInterval: "*/2 * * * *",
    },
};

function CronRow({
    jobKey,
    config,
    appUrl,
    cronSecret,
}: {
    jobKey: CronJobKey;
    config: CronSettings[CronJobKey];
    appUrl: string;
    cronSecret: string;
}) {
    const meta = JOB_META[jobKey];
    const [enabled, setEnabled] = useState(config.enabled);
    const [interval, setInterval] = useState(config.interval || meta.defaultInterval);
    const [isPending, startTransition] = useTransition();
    const [isRunning, setIsRunning] = useState(false);
    const [copied, setCopied] = useState(false);

    const endpointUrl = `${appUrl}/api/cron/${jobKey}?secret=${cronSecret}`;

    const copyUrl = () => {
        navigator.clipboard.writeText(endpointUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleToggle = (newEnabled: boolean) => {
        setEnabled(newEnabled);
        startTransition(async () => {
            try {
                await updateCronJob(jobKey, { enabled: newEnabled, interval });
                toast.success(`${meta.label} ${newEnabled ? "enabled" : "disabled"}`);
            } catch (err: any) {
                toast.error(err.message || "Failed to update");
                setEnabled(!newEnabled);
            }
        });
    };

    const handleIntervalChange = (newInterval: string) => {
        setInterval(newInterval);
        startTransition(async () => {
            try {
                await updateCronJob(jobKey, { enabled, interval: newInterval });
                toast.success("Schedule updated");
            } catch (err: any) {
                toast.error(err.message || "Failed to update");
            }
        });
    };

    const handleRunNow = async () => {
        setIsRunning(true);
        try {
            const result = await runCronJobNow(jobKey);
            if (result.success) {
                toast.success(`${meta.label} ran successfully`);
            } else {
                toast.error(`Failed: ${result.message}`);
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to run");
        } finally {
            setIsRunning(false);
        }
    };

    const lastRunDate = config.lastRun ? new Date(config.lastRun) : null;
    const lastRunLabel = lastRunDate
        ? lastRunDate.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
        : "Never";

    return (
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4 bg-white dark:bg-zinc-950/50">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${enabled ? "bg-blue-500/10" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                        <Clock className={`w-4 h-4 ${enabled ? "text-blue-500" : "text-zinc-400"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-zinc-900 dark:text-white text-sm">{meta.label}</span>
                            {enabled ? (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 font-medium">Active</span>
                            ) : (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500 font-medium">Inactive</span>
                            )}
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{meta.description}</p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1">
                            Last run: <span className={lastRunDate ? "text-zinc-500 dark:text-zinc-400" : ""}>{lastRunLabel}</span>
                        </p>
                    </div>
                </div>

                {/* Toggle */}
                <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    disabled={isPending}
                    onClick={() => handleToggle(!enabled)}
                    className={`relative flex-shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${enabled ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-700"}`}
                >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
            </div>

            {/* Schedule row */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 whitespace-nowrap">Schedule:</label>
                    <select
                        value={interval}
                        onChange={(e) => handleIntervalChange(e.target.value)}
                        disabled={isPending}
                        className="flex-1 min-w-0 text-xs px-2 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white disabled:opacity-50"
                    >
                        {CRON_INTERVAL_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                <button
                    type="button"
                    onClick={handleRunNow}
                    disabled={isRunning}
                    className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-medium transition-colors disabled:opacity-50"
                >
                    {isRunning
                        ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        : <Play className="w-3.5 h-3.5" />}
                    Run Now
                </button>
            </div>

            {/* Endpoint URL */}
            <div className="space-y-1">
                <p className="text-xs text-zinc-400 dark:text-zinc-600 font-medium">HTTP endpoint (for external schedulers):</p>
                <div className="flex items-center gap-2">
                    <code className="flex-1 min-w-0 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-2.5 py-1.5 text-zinc-600 dark:text-zinc-400 truncate">
                        {endpointUrl}
                    </code>
                    <button
                        type="button"
                        onClick={copyUrl}
                        className="flex-shrink-0 p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function CronSettings({ settings, appUrl, cronSecret }: CronSettingsProps) {
    const jobs: CronJobKey[] = ["scheduled", "automations", "rss"];

    return (
        <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 dark:bg-blue-500/5 border border-blue-200/60 dark:border-blue-500/20 p-3 text-xs text-blue-700 dark:text-blue-300">
                <strong>Built-in scheduler:</strong> When enabled, the worker process runs these jobs on schedule automatically — no external cron service needed. Changes take effect within 5 minutes as the worker re-reads settings. The HTTP endpoint URLs are also provided if you prefer an external scheduler (cron-job.org, Vercel, crontab).
            </div>

            {jobs.map(key => (
                <CronRow
                    key={key}
                    jobKey={key}
                    config={settings[key]}
                    appUrl={appUrl}
                    cronSecret={cronSecret}
                />
            ))}
        </div>
    );
}
