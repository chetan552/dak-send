"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";

interface TopLinksChartProps {
    data: { url: string; totalClicks: number; uniqueClicks: number }[];
}

export function TopLinksChart({ data }: TopLinksChartProps) {
    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[200px] text-zinc-500 dark:text-zinc-400 text-sm">
                No link clicks recorded yet.
            </div>
        );
    }

    // Truncate long URLs for display
    const formatted = data.slice(0, 10).map((d) => {
        let displayUrl = d.url;
        try {
            const parsed = new URL(d.url);
            displayUrl = parsed.hostname + (parsed.pathname.length > 30 ? parsed.pathname.slice(0, 30) + "…" : parsed.pathname);
        } catch {
            displayUrl = d.url.length > 40 ? d.url.slice(0, 40) + "…" : d.url;
        }
        return { ...d, displayUrl };
    });

    const colors = ["#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe", "#e0e7ff", "#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe", "#e0e7ff"];

    return (
        <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formatted} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                    <XAxis
                        type="number"
                        stroke="#71717a"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                    />
                    <YAxis
                        dataKey="displayUrl"
                        type="category"
                        width={200}
                        stroke="#71717a"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
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
                    <Bar dataKey="totalClicks" name="Total Clicks" radius={[0, 4, 4, 0]}>
                        {formatted.map((_, i) => (
                            <Cell key={i} fill={colors[i % colors.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
