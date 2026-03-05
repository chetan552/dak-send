"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, Loader2, Pause, Play, RotateCcw } from "lucide-react";
import { getWarmupStatus, startWarmup, stopWarmup } from "@/app/actions/warmup";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface WarmupCardProps {
    brandId: string;
    brandName: string;
    domain: string;
}

export function WarmupCard({ brandId, brandName, domain }: WarmupCardProps) {
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        getWarmupStatus(brandId).then(s => {
            setStatus(s);
            setLoading(false);
        });
    }, [brandId]);

    const handleStart = async () => {
        setActionLoading(true);
        try {
            await startWarmup(brandId);
            const s = await getWarmupStatus(brandId);
            setStatus(s);
            toast.success("Warmup started!");
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleStop = async () => {
        setActionLoading(true);
        try {
            await stopWarmup(brandId);
            const s = await getWarmupStatus(brandId);
            setStatus(s);
            toast.success("Warmup paused");
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800">
                <CardContent className="p-5 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                    <span className="text-sm text-zinc-500">Loading warmup status...</span>
                </CardContent>
            </Card>
        );
    }

    if (!status) {
        return (
            <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800">
                <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                <Flame className="w-5 h-5 text-zinc-400" />
                            </div>
                            <div>
                                <h3 className="font-medium text-zinc-900 dark:text-white">{brandName}</h3>
                                <p className="text-xs text-zinc-500">{domain} — No warmup active</p>
                            </div>
                        </div>
                        <Button onClick={handleStart} disabled={actionLoading} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
                            {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Flame className="w-3 h-3" />}
                            Start Warmup
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800">
            <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status.isActive ? 'bg-orange-500/10' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                            <Flame className={`w-5 h-5 ${status.isActive ? 'text-orange-500' : 'text-zinc-400'}`} />
                        </div>
                        <div>
                            <h3 className="font-medium text-zinc-900 dark:text-white">{brandName}</h3>
                            <p className="text-xs text-zinc-500">{status.domain}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {status.isActive ? (
                            <Button onClick={handleStop} disabled={actionLoading} variant="outline" size="sm" className="gap-1 text-xs">
                                {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Pause className="w-3 h-3" />}
                                Pause
                            </Button>
                        ) : (
                            <Button onClick={handleStart} disabled={actionLoading} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white gap-1 text-xs">
                                {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                                Restart
                            </Button>
                        )}
                    </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span>Day {status.currentDay} of {status.totalDays}</span>
                        <span>{Math.round(status.progressPercent)}% complete</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500"
                            style={{ width: `${status.progressPercent}%` }}
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-3">
                        <p className="text-xs text-zinc-500 mb-1">Daily Limit</p>
                        <p className="font-bold text-zinc-900 dark:text-white">
                            {status.dailyLimit >= 999999 ? "∞" : status.dailyLimit.toLocaleString()}
                        </p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-3">
                        <p className="text-xs text-zinc-500 mb-1">Sent Today</p>
                        <p className="font-bold text-zinc-900 dark:text-white">{status.sentToday.toLocaleString()}</p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-3">
                        <p className="text-xs text-zinc-500 mb-1">Remaining</p>
                        <p className="font-bold text-zinc-900 dark:text-white">
                            {status.dailyLimit >= 999999 ? "∞" : status.remainingToday.toLocaleString()}
                        </p>
                    </div>
                </div>

                {status.isComplete && !status.isActive && (
                    <div className="bg-green-50 dark:bg-green-500/5 border border-green-200 dark:border-green-500/20 rounded-lg p-3 text-center">
                        <p className="text-green-700 dark:text-green-400 text-sm font-medium">✅ Warmup complete — no sending limits active</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
