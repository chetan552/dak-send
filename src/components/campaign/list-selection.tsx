"use client";

import { useState } from "react";
import { SendButton } from "@/components/campaign/send-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users2, Filter, Clock } from "lucide-react";

export function ListSelectionForm({ lists, campaignId }: { lists: any[], campaignId: string }) {
    const [listModes, setListModes] = useState<Record<string, "none" | "include" | "exclude">>({});
    const [segmentModes, setSegmentModes] = useState<Record<string, "none" | "include" | "exclude">>({});
    const [useOptimalTime, setUseOptimalTime] = useState(false);

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
    };

    const hasSelection = payload.includedLists.length > 0 || payload.includedSegments.length > 0;

    return (
        <div className="space-y-6">
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

            <SendButton campaignId={campaignId} payload={payload} disabled={!hasSelection} />
        </div>
    );
}
