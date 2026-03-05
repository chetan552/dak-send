"use client";

import Link from "next/link";

interface CampaignRow {
    id: string;
    name: string;
    subject: string;
    brandName: string;
    sentAt: string;
    totalRecipients: number;
    sent: number;
    opened: number;
    clicked: number;
    bounced: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
}

interface CampaignComparisonTableProps {
    campaigns: CampaignRow[];
}

function rateColor(rate: number, type: "open" | "click" | "bounce") {
    if (type === "bounce") {
        if (rate <= 1) return "text-emerald-500";
        if (rate <= 3) return "text-yellow-500";
        return "text-red-500";
    }
    if (type === "open") {
        if (rate >= 30) return "text-emerald-500";
        if (rate >= 15) return "text-yellow-500";
        return "text-red-400";
    }
    // click
    if (rate >= 5) return "text-emerald-500";
    if (rate >= 2) return "text-yellow-500";
    return "text-zinc-400";
}

export function CampaignComparisonTable({ campaigns }: CampaignComparisonTableProps) {
    if (campaigns.length === 0) {
        return (
            <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                No sent campaigns yet. Send your first campaign to see analytics here.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                        <th className="text-left py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400">Campaign</th>
                        <th className="text-left py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400 hidden lg:table-cell">Brand</th>
                        <th className="text-left py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400 hidden md:table-cell">Sent</th>
                        <th className="text-right py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400">Recipients</th>
                        <th className="text-right py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400">Open Rate</th>
                        <th className="text-right py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400">Click Rate</th>
                        <th className="text-right py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">Bounce Rate</th>
                    </tr>
                </thead>
                <tbody>
                    {campaigns.map((c, i) => (
                        <tr
                            key={c.id}
                            className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors animate-in fade-in slide-in-from-bottom-2"
                            style={{ animationDelay: `${i * 30}ms`, animationFillMode: "both" }}
                        >
                            <td className="py-3 px-4">
                                <Link
                                    href={`/dashboard/campaigns/${c.id}/report`}
                                    className="text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
                                >
                                    {c.name}
                                </Link>
                                <p className="text-xs text-zinc-500 dark:text-zinc-500 truncate max-w-[200px]">{c.subject}</p>
                            </td>
                            <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400 hidden lg:table-cell">{c.brandName}</td>
                            <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400 hidden md:table-cell">
                                {new Date(c.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </td>
                            <td className="py-3 px-4 text-right text-zinc-900 dark:text-white font-medium">{c.sent.toLocaleString()}</td>
                            <td className={`py-3 px-4 text-right font-semibold ${rateColor(c.openRate, "open")}`}>
                                {c.openRate}%
                            </td>
                            <td className={`py-3 px-4 text-right font-semibold ${rateColor(c.clickRate, "click")}`}>
                                {c.clickRate}%
                            </td>
                            <td className={`py-3 px-4 text-right font-semibold hidden sm:table-cell ${rateColor(c.bounceRate, "bounce")}`}>
                                {c.bounceRate}%
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
