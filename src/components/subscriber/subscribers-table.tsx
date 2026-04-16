"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { SubscriberActions } from "@/components/subscriber/subscriber-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Loader2 } from "lucide-react";
import { deleteSubscribers } from "@/app/actions/subscriber";
import { toast } from "sonner";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";

type StatusFilter = "all" | "subscribed" | "unsubscribed" | "bounced" | "complained";

interface StatusCounts {
    all: number;
    subscribed: number;
    unsubscribed: number;
    bounced: number;
    complained: number;
}

interface SubscribersTableProps {
    listId: string;
    subscribers: any[];
    customFields: any[];
    currentPage: number;
    totalPages: number;
    statusFilter?: StatusFilter;
    counts?: StatusCounts;
}

const FILTER_TABS: { value: StatusFilter; label: string; activeClass: string; countClass: string }[] = [
    { value: "all",          label: "All",             activeClass: "border-zinc-400 text-white",          countClass: "bg-zinc-600 text-white" },
    { value: "subscribed",   label: "Subscribed",      activeClass: "border-green-500 text-green-400",     countClass: "bg-green-500/20 text-green-400" },
    { value: "unsubscribed", label: "Unsubscribed",    activeClass: "border-red-500 text-red-400",         countClass: "bg-red-500/20 text-red-400" },
    { value: "bounced",      label: "Bounced",         activeClass: "border-amber-500 text-amber-400",     countClass: "bg-amber-500/20 text-amber-400" },
    { value: "complained",   label: "Marked as spam",  activeClass: "border-orange-500 text-orange-400",   countClass: "bg-orange-500/20 text-orange-400" },
];

export function SubscribersTable({ listId, subscribers, customFields, currentPage, totalPages, statusFilter = "all", counts }: SubscribersTableProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const handleStatusFilter = (value: StatusFilter) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === "all") {
            params.delete("status");
        } else {
            params.set("status", value);
        }
        params.delete("page"); // reset to page 1 on filter change
        setSelectedIds([]);
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(subscribers.map(sub => sub.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (checked: boolean, id: string) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(subId => subId !== id));
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;

        setIsDeleting(true);
        try {
            await deleteSubscribers(listId, selectedIds);
            toast.success(`Deleted ${selectedIds.length} subscriber${selectedIds.length !== 1 ? 's' : ''} successfully`);
            setSelectedIds([]); // Clear selection
        } catch (error: any) {
            toast.error(error.message || "Failed to delete subscribers");
        } finally {
            setIsDeleting(false);
        }
    };

    const allSelected = subscribers.length > 0 && selectedIds.length === subscribers.length;
    const someSelected = selectedIds.length > 0 && selectedIds.length < subscribers.length;

    return (
        <div>
            {counts && (
                <div className="flex items-center gap-1 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800/60 overflow-x-auto">
                    {FILTER_TABS.map(tab => {
                        const count = counts[tab.value];
                        const isActive = statusFilter === tab.value;
                        return (
                            <button
                                key={tab.value}
                                onClick={() => handleStatusFilter(tab.value)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                                    isActive
                                        ? `${tab.activeClass} bg-zinc-800/60`
                                        : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40"
                                }`}
                            >
                                {tab.label}
                                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${isActive ? tab.countClass : "bg-zinc-800 text-zinc-400"}`}>
                                    {count.toLocaleString()}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {selectedIds.length > 0 && (
                <div className="sticky top-0 z-20 flex items-center justify-between bg-rose-50/95 dark:bg-rose-950/40 backdrop-blur px-4 py-2.5 border-b border-rose-100 dark:border-rose-900/40">
                    <span className="text-sm font-medium text-rose-800 dark:text-rose-300">
                        {selectedIds.length} subscriber{selectedIds.length !== 1 ? 's' : ''} selected
                    </span>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteSelected}
                        disabled={isDeleting}
                    >
                        {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                        Delete selected
                    </Button>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="sticky top-0 z-10 text-[11px] tracking-[0.08em] text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50/95 dark:bg-zinc-900/80 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
                        <tr>
                            <th className="px-4 py-2.5 w-10 text-center">
                                <Checkbox
                                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                                    onCheckedChange={handleSelectAll}
                                    disabled={subscribers.length === 0 || isDeleting}
                                    aria-label="Select all"
                                />
                            </th>
                            <th className="px-4 py-2.5 font-medium">Email</th>
                            <th className="px-4 py-2.5 font-medium">Name</th>
                            {customFields.map((cf: any) => (
                                <th key={cf.id} className="px-4 py-2.5 font-medium">{cf.name}</th>
                            ))}
                            <th className="px-4 py-2.5 font-medium">Status</th>
                            <th className="px-4 py-2.5 font-medium text-right">Added</th>
                            <th className="px-4 py-2.5 font-medium text-right w-16"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                        {subscribers.map((sub: any) => {
                            const isSelected = selectedIds.includes(sub.id);
                            return (
                                <tr
                                    key={sub.id}
                                    className={`transition-colors ${isSelected ? 'bg-primary/[0.04] dark:bg-primary/[0.08]' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'}`}
                                >
                                    <td className="px-4 py-2.5 w-10 text-center">
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={(checked) => handleSelectOne(checked as boolean, sub.id)}
                                            disabled={isDeleting}
                                            aria-label={`Select ${sub.email}`}
                                        />
                                    </td>
                                    <td className="px-4 py-2.5 font-medium text-zinc-900 dark:text-white">{sub.email}</td>
                                    <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400">{sub.name || '—'}</td>
                                    {customFields.map((cf: any) => {
                                        const subField = (sub as any).customFields?.find((cfv: any) => cfv.customFieldId === cf.id);
                                        return <td key={cf.id} className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400">{subField ? subField.value : '—'}</td>;
                                    })}
                                    <td className="px-4 py-2.5">
                                        <StatusBadge status={sub.status} />
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-400 tabular-nums">
                                        {new Date(sub.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                        <SubscriberActions subscriber={sub} listId={listId} customFields={customFields} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800/60">
                <Pagination currentPage={currentPage} totalPages={totalPages} />
            </div>
        </div>
    );
}
