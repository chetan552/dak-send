"use client";

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

interface TimelineChartProps {
    data: { label: string; opens: number; clicks: number }[];
}

export function TimelineChart({ data }: TimelineChartProps) {
    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[200px] text-zinc-500 dark:text-zinc-400 text-sm">
                No engagement data to display yet.
            </div>
        );
    }

    // Format labels to show shorter date/time
    const formatted = data.map((d) => {
        const parts = d.label.split(" ");
        return {
            ...d,
            displayLabel: parts.length > 1 ? `${parts[0].slice(5)} ${parts[1]}` : d.label,
        };
    });

    return (
        <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formatted} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="timelineOpenGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="timelineClickGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis
                        dataKey="displayLabel"
                        stroke="#71717a"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        stroke="#71717a"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "#18181b",
                            border: "1px solid #27272a",
                            borderRadius: "8px",
                            color: "#fff",
                            fontSize: "13px",
                        }}
                        labelStyle={{ color: "#a1a1aa" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "13px", color: "#a1a1aa" }} />
                    <Area
                        type="monotone"
                        dataKey="opens"
                        name="Opens"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#timelineOpenGradient)"
                    />
                    <Area
                        type="monotone"
                        dataKey="clicks"
                        name="Clicks"
                        stroke="#22c55e"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#timelineClickGradient)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
