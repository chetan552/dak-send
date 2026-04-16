"use client";

import { useState } from "react";
import { SendButton } from "@/components/campaign/send-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users2, Filter, Clock, CalendarClock, Eye, MousePointerClick } from "lucide-react";
import { scheduleCampaign } from "@/app/actions/send";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function ListSelectionForm({ lists, campaignId }: { lists: any[], campaignId: string }) {
    const [listModes, setListModes] = useState<Record<string, "none" | "include" | "exclude">>({});
    const [segmentModes, setSegmentModes] = useState<Record<string, "none" | "include" | "exclude">>({});
    const [useOptimalTime, setUseOptimalTime] = useState(false);
    const [trackOpens, setTrackOpens] = useState(true);
    const [trackClicks, setTrackClicks] = useState(true);
    const [sendMode, setSendMode] = useState<"now" | "scheduled">("now");
    const [scheduledAt, setScheduledAt] = useState("");
    const [scheduling, setScheduling] = useState(false);
    const router = useRouter();

    const handleListModeChange = (listId: string, mode: "none" | "include" | "exclude") => {
        setListModes(prev => ({ ...prev, [listId]: mode }));
    };

    const handleSegmentModeChange = (segmentId: string, mode: "none" | "include" | "exclude") => {
        setSegmentModes(prev => ({ ...prev, [segmentId]: mode }));
    };

    const payload = {
        includedLists: Object.keys(listModes).filter(k => listModes[k] === "include"),
        excludedLists: Object.keys(listModes).filter(k => listModes[k] === "exclude"),
        includedSegments: Object.keys(segmentModes).filter(k => segmentModes[k] === "include"),
        excludedSegments: Object.keys(segmentModes).filter(k => segmentModes[k] === "exclude"),
        useOptimalTime,
        trackOpens,
        trackClicks,
    };

    const hasSelection = payload.includedLists.length > 0 || payload.includedSegments.length > 0;

    // Min datetime for the picker: 5 minutes from now
    const minDateTime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);

    const handleSchedule = async () => {
        if (!hasSelection) {
            toast.error("Please select at least one list or segment to include.");
            return;
        }
        if (!scheduledAt) {
            toast.error("Please pick a date and time.");
            return;
        }
        setScheduling(true);
        try {
            // Convert the datetime-local string (no timezone) to a UTC ISO string
            // so the server receives the correct moment regardless of server timezone.
            const scheduledAtUtc = new Date(scheduledAt).toISOString();
            await scheduleCampaign(campaignId, { ...payload, scheduledAt: scheduledAtUtc });
            toast.success("Campaign scheduled!");
            router.push("/dashboard/campaigns");
        } catch (err: any) {
            toast.error(err.message || "Failed to schedule campaign");
        } finally {
            setScheduling(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* List / segment selection */}
            <div className="space-y-4">
                {lists.length === 0 && (
                    <div className="p-4 border border-zinc-800 bg-zinc-900/50 rounded-lg text-center text-sm text-zinc-400">
                        No lists found with active subscribers.
                    </div>
                )}
                {lists.map(list => (
                    <div key={list.id} className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900/40">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <h4 className="text-sm font-medium leading-none text-zinc-900 dark:text-white">
                                    {list.name}
                                </h4>
                                <p className="text-sm text-zinc-500 flex items-center gap-1 mt-1">
                                    <Users2 className="w-3 h-3" /> {list._count.subscribers} active subscribers
                                </p>
                            </div>
                            <Select
                                value={listModes[list.id] || "none"}
                                onValueChange={(val: "none" | "include" | "exclude") => handleListModeChange(list.id, val)}
                            >
                                <SelectTrigger className="w-32 bg-white dark:bg-zinc-900">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Don't Send</SelectItem>
                                    <SelectItem value="include" className="text-green-600 font-medium">Include</SelectItem>
                                    <SelectItem value="exclude" className="text-red-600 font-medium">Exclude</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {list.segments?.length > 0 && (
                            <div className="mt-4 pl-4 border-l-2 border-zinc-200 dark:border-zinc-800 space-y-3">
                                {list.segments.map((segment: any) => (
                                    <div key={segment.id} className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <h5 className="text-sm text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                                                <Filter className="w-3 h-3 text-zinc-400" /> {segment.name}
                                            </h5>
                                        </div>
                                        <Select
                                            value={segmentModes[segment.id] || "none"}
                                            onValueChange={(val: "none" | "include" | "exclude") => handleSegmentModeChange(segment.id, val)}
                                        >
                                            <SelectTrigger className="w-28 h-8 text-xs bg-white dark:bg-zinc-900">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Ignore</SelectItem>
                                                <SelectItem value="include" className="text-green-600 font-medium">Include</SelectItem>
                                                <SelectItem value="exclude" className="text-red-600 font-medium">Exclude</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Send-time optimisation */}
            <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 flex items-start gap-4">
                <div className="mt-1">
                    <Clock className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-medium text-zinc-900 dark:text-white">Send Time Optimization</h4>
                            <p className="text-sm text-zinc-500 mt-1">
                                Deliver emails to each subscriber at the exact hour they are most likely to open it, based on their past engagement history.
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-4 flex-shrink-0">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={useOptimalTime}
                                onChange={(e) => setUseOptimalTime(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Tracking toggles */}
            <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 space-y-3">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Tracking (GDPR)</p>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-zinc-400" />
                        <div>
                            <p className="text-sm font-medium text-zinc-900 dark:text-white">Track Opens</p>
                            <p className="text-xs text-zinc-500">Inserts a 1×1 pixel to detect when recipients open the email.</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4 flex-shrink-0">
                        <input type="checkbox" className="sr-only peer" checked={trackOpens} onChange={e => setTrackOpens(e.target.checked)} />
                        <div className="w-11 h-6 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MousePointerClick className="w-4 h-4 text-zinc-400" />
                        <div>
                            <p className="text-sm font-medium text-zinc-900 dark:text-white">Track Clicks</p>
                            <p className="text-xs text-zinc-500">Wraps links with a redirect to measure click-through rates.</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4 flex-shrink-0">
                        <input type="checkbox" className="sr-only peer" checked={trackClicks} onChange={e => setTrackClicks(e.target.checked)} />
                        <div className="w-11 h-6 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                </div>
            </div>

            {/* Send mode toggle */}
            <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <button
                    type="button"
                    onClick={() => setSendMode("now")}
                    className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                        sendMode === "now"
                            ? "bg-indigo-600 text-white"
                            : "bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                >
                    <Clock className="w-4 h-4" /> Send Now
                </button>
                <button
                    type="button"
                    onClick={() => setSendMode("scheduled")}
                    className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 border-l border-zinc-200 dark:border-zinc-800 ${
                        sendMode === "scheduled"
                            ? "bg-indigo-600 text-white"
                            : "bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                >
                    <CalendarClock className="w-4 h-4" /> Schedule for Later
                </button>
            </div>

            {/* Scheduled date/time picker */}
            {sendMode === "scheduled" && (
                <div className="p-4 border border-indigo-200 dark:border-indigo-800/50 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-indigo-800 dark:text-indigo-300">
                        <CalendarClock className="w-4 h-4" />
                        Pick a send date and time
                    </div>
                    <input
                        type="datetime-local"
                        value={scheduledAt}
                        min={minDateTime}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70">
                        Time is interpreted as your browser's local timezone. The "Scheduled Campaigns" cron job must be active (Settings → Cron Jobs) for the campaign to dispatch automatically.
                    </p>
                </div>
            )}

            {/* Action button */}
            {sendMode === "now" ? (
                <SendButton campaignId={campaignId} payload={payload} disabled={!hasSelection} />
            ) : (
                <button
                    type="button"
                    onClick={handleSchedule}
                    disabled={!hasSelection || !scheduledAt || scheduling}
                    className="w-full h-12 mt-2 rounded-lg bg-indigo-600 text-white text-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.3)]"
                >
                    <CalendarClock className="w-5 h-5" />
                    {scheduling ? "Scheduling…" : "Schedule Campaign"}
                </button>
            )}
        </div>
    );
}
