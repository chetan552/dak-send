"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSESQuota } from "@/app/actions/settings";
import { BarChart3, Cloud, Hash, Send, Clock, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export function SESStats() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getSESQuota();
            if (data.error) {
                setError(data.error);
            } else {
                setStats(data);
            }
        } catch (err) {
            setError("Failed to fetch statistics");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    if (loading && !stats) {
        return (
            <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 shadow-sm animate-pulse">
                <CardHeader>
                    <div className="h-6 w-48 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                    <div className="h-4 w-64 bg-zinc-100 dark:bg-zinc-900 rounded mt-2"></div>
                </CardHeader>
                <CardContent className="h-48"></CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-xl text-zinc-900 dark:text-white flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-zinc-500 dark:text-zinc-400" /> Amazon SES Quota
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <AlertCircle className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4" />
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-white">Credentials Required</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">{error}</p>
                        <Button variant="outline" onClick={fetchStats} className="mt-4 gap-2">
                            <RefreshCw className="w-4 h-4" /> Try Again
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const usagePercent = stats ? (stats.sentLast24Hours / stats.dailyQuota) * 100 : 0;

    return (
        <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                    <CardTitle className="text-xl text-zinc-900 dark:text-white flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-zinc-500 dark:text-zinc-400" /> Amazon SES Quota
                    </CardTitle>
                    <CardDescription className="text-zinc-500 dark:text-zinc-400 mt-1">Real-time status of your SES account.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchStats} disabled={loading} className="text-zinc-500 hover:text-zinc-900 transition-colors">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                            <Cloud className="w-4 h-4" />
                            <span className="text-xs font-semibold uppercase tracking-wider">SES Region</span>
                        </div>
                        <p className="text-lg font-bold text-zinc-900 dark:text-white">{stats.region}</p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                            <Hash className="w-4 h-4" />
                            <span className="text-xs font-semibold uppercase tracking-wider">Daily Quota</span>
                        </div>
                        <p className="text-lg font-bold text-zinc-900 dark:text-white">{stats.dailyQuota.toLocaleString()}</p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                            <Send className="w-4 h-4" />
                            <span className="text-xs font-semibold uppercase tracking-wider">Sent Today</span>
                        </div>
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{stats.sentToday.toLocaleString()}</p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs font-semibold uppercase tracking-wider">Send Rate</span>
                        </div>
                        <p className="text-lg font-bold text-zinc-900 dark:text-white">{stats.maxSendRate} / sec</p>
                    </div>
                </div>

                <div className="mt-8 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500 dark:text-zinc-400 font-medium">Daily Limit Usage</span>
                        <span className="text-zinc-900 dark:text-white font-bold">{stats.sentLast24Hours.toLocaleString()} / {stats.dailyQuota.toLocaleString()}</span>
                    </div>
                    <Progress value={usagePercent} className="h-2.5 bg-zinc-100 dark:bg-zinc-900"
                        indicatorClassName={usagePercent > 80 ? "bg-amber-500" : "bg-indigo-600 dark:bg-indigo-500"}
                    />
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                        {stats.sendsLeft.toLocaleString()} sends remaining in this 24-hour window.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
