"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    LayoutGrid,
    LayoutList,
    Trash2,
    Loader2,
    CheckSquare,
    Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { CampaignCardActions } from "@/components/campaign/campaign-card-actions";
import { deleteMultipleCampaigns } from "@/app/actions/campaign";

type Status = "draft" | "scheduled" | "sending" | "sent" | "cancelled" | "failed";

interface Campaign {
    id: string;
    name: string;
    subject: string;
    status: string;
    scheduledAt: Date | null;
    createdAt: Date;
    brand: { name: string };
}

interface CampaignsViewProps {
    campaigns: Campaign[];
}

const VIEW_KEY = "campaigns-view-mode";

export function CampaignsView({ campaigns }: CampaignsViewProps) {
    const router = useRouter();
    const [view, setView] = useState<"grid" | "list">("grid");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem(VIEW_KEY);
        if (saved === "list" || saved === "grid") setView(saved);
    }, []);

    const switchView = (v: "grid" | "list") => {
        setView(v);
        localStorage.setItem(VIEW_KEY, v);
        setSelected(new Set());
    };

    const toggle = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selected.size === campaigns.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(campaigns.map(c => c.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selected.size} campaign${selected.size > 1 ? "s" : ""}? This cannot be undone.`)) return;
        setDeleting(true);
        try {
            await deleteMultipleCampaigns(Array.from(selected));
            setSelected(new Set());
            router.refresh();
        } catch (err) {
            alert(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setDeleting(false);
        }
    };

    const allSelected = campaigns.length > 0 && selected.size === campaigns.length;
    const someSelected = selected.size > 0;

    return (
        <div>
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4 gap-3">
                <div className="flex items-center gap-2">
                    {someSelected && (
                        <>
                            <span className="text-sm text-zinc-500 dark:text-zinc-400">
                                {selected.size} selected
                            </span>
                            <Button
                                variant="destructive"
                                size="sm"
                                className="gap-1.5 h-8"
                                onClick={handleBulkDelete}
                                disabled={deleting}
                            >
                                {deleting ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                )}
                                Delete {selected.size}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-zinc-500"
                                onClick={() => setSelected(new Set())}
                                disabled={deleting}
                            >
                                Clear
                            </Button>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded-md p-0.5">
                    <Button
                        variant={view === "grid" ? "secondary" : "ghost"}
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => switchView("grid")}
                        aria-label="Grid view"
                        title="Grid view"
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </Button>
                    <Button
                        variant={view === "list" ? "secondary" : "ghost"}
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => switchView("list")}
                        aria-label="List view"
                        title="List view"
                    >
                        <LayoutList className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Grid view */}
            {view === "grid" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {campaigns.map((campaign, i) => (
                        <article
                            key={campaign.id}
                            className={`surface-card p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors group animate-in fade-in slide-in-from-bottom-4 relative ${selected.has(campaign.id) ? "ring-2 ring-primary border-primary" : ""}`}
                            style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
                        >
                            {/* Checkbox */}
                            <button
                                className="absolute top-3 left-3 text-zinc-400 hover:text-primary transition-colors"
                                onClick={() => toggle(campaign.id)}
                                aria-label={selected.has(campaign.id) ? "Deselect" : "Select"}
                            >
                                {selected.has(campaign.id) ? (
                                    <CheckSquare className="w-4 h-4 text-primary" />
                                ) : (
                                    <Square className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                            </button>

                            <div className="flex items-start justify-between gap-3 mb-1.5 pl-6">
                                <Link
                                    href={`/dashboard/campaigns/${campaign.id}`}
                                    className="block min-w-0 flex-1 text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-white group-hover:text-primary transition-colors truncate"
                                    title={campaign.name}
                                >
                                    {campaign.name}
                                </Link>
                                <StatusBadge status={campaign.status} className="shrink-0 mt-0.5" />
                            </div>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate pl-6" title={campaign.subject}>
                                {campaign.subject}
                            </p>
                            {campaign.status === "scheduled" && campaign.scheduledAt && (
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 pl-6">
                                    Sends{" "}
                                    {new Date(campaign.scheduledAt).toLocaleString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </p>
                            )}
                            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800/60 flex items-center justify-between gap-2">
                                <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2 min-w-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 block shrink-0" />
                                    <span className="truncate">{campaign.brand.name}</span>
                                </div>
                                <CampaignCardActions
                                    campaignId={campaign.id}
                                    status={campaign.status as Status}
                                />
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {/* List view */}
            {view === "list" && (
                <div className="surface-card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-200 dark:border-zinc-800">
                                <th className="w-10 py-3 pl-4 text-left">
                                    <button
                                        onClick={toggleAll}
                                        className="text-zinc-400 hover:text-primary transition-colors"
                                        aria-label={allSelected ? "Deselect all" : "Select all"}
                                    >
                                        {allSelected ? (
                                            <CheckSquare className="w-4 h-4 text-primary" />
                                        ) : (
                                            <Square className="w-4 h-4" />
                                        )}
                                    </button>
                                </th>
                                <th className="py-3 px-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Name</th>
                                <th className="py-3 px-3 text-left font-medium text-zinc-500 dark:text-zinc-400 hidden md:table-cell">Subject</th>
                                <th className="py-3 px-3 text-left font-medium text-zinc-500 dark:text-zinc-400 hidden lg:table-cell">Brand</th>
                                <th className="py-3 px-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                                <th className="py-3 px-3 text-left font-medium text-zinc-500 dark:text-zinc-400 hidden lg:table-cell">Date</th>
                                <th className="py-3 pr-4 text-right font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {campaigns.map((campaign, i) => (
                                <tr
                                    key={campaign.id}
                                    className={`border-b border-zinc-100 dark:border-zinc-800/60 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors ${selected.has(campaign.id) ? "bg-primary/5" : ""}`}
                                >
                                    <td className="py-3 pl-4">
                                        <button
                                            onClick={() => toggle(campaign.id)}
                                            className="text-zinc-400 hover:text-primary transition-colors"
                                            aria-label={selected.has(campaign.id) ? "Deselect" : "Select"}
                                        >
                                            {selected.has(campaign.id) ? (
                                                <CheckSquare className="w-4 h-4 text-primary" />
                                            ) : (
                                                <Square className="w-4 h-4" />
                                            )}
                                        </button>
                                    </td>
                                    <td className="py-3 px-3">
                                        <Link
                                            href={`/dashboard/campaigns/${campaign.id}`}
                                            className="font-medium text-zinc-900 dark:text-white hover:text-primary transition-colors truncate block max-w-[200px]"
                                            title={campaign.name}
                                        >
                                            {campaign.name}
                                        </Link>
                                    </td>
                                    <td className="py-3 px-3 text-zinc-500 dark:text-zinc-400 hidden md:table-cell">
                                        <span className="truncate block max-w-[220px]" title={campaign.subject}>
                                            {campaign.subject}
                                        </span>
                                    </td>
                                    <td className="py-3 px-3 text-zinc-500 dark:text-zinc-400 hidden lg:table-cell truncate max-w-[120px]">
                                        {campaign.brand.name}
                                    </td>
                                    <td className="py-3 px-3">
                                        <StatusBadge status={campaign.status} />
                                    </td>
                                    <td className="py-3 px-3 text-zinc-500 dark:text-zinc-400 text-xs hidden lg:table-cell whitespace-nowrap">
                                        {campaign.status === "scheduled" && campaign.scheduledAt
                                            ? new Date(campaign.scheduledAt).toLocaleString(undefined, {
                                                month: "short",
                                                day: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })
                                            : new Date(campaign.createdAt).toLocaleDateString(undefined, {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                    </td>
                                    <td className="py-3 pr-4 text-right">
                                        <CampaignCardActions
                                            campaignId={campaign.id}
                                            status={campaign.status as Status}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
