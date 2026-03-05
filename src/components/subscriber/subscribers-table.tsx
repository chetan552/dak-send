"use client";

import { useState } from "react";
import { SubscriberActions } from "@/components/subscriber/subscriber-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Loader2 } from "lucide-react";
import { deleteSubscribers } from "@/app/actions/subscriber";
import { toast } from "sonner";
import { Pagination } from "@/components/ui/pagination";

interface SubscribersTableProps {
    listId: string;
    subscribers: any[];
    customFields: any[];
    currentPage: number;
    totalPages: number;
}

export function SubscribersTable({ listId, subscribers, customFields, currentPage, totalPages }: SubscribersTableProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);

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
        <div className="space-y-4">
            {selectedIds.length > 0 && (
                <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-100 dark:border-red-900/30">
                    <span className="text-sm font-medium text-red-800 dark:text-red-300">
                        {selectedIds.length} subscriber{selectedIds.length !== 1 ? 's' : ''} selected
                    </span>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteSelected}
                        disabled={isDeleting}
                    >
                        {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                        Delete Selected
                    </Button>
                </div>
            )}

            <div className="overflow-x-auto rounded-md">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                        <tr>
                            <th className="px-6 py-4 w-12 text-center border-r border-zinc-200 dark:border-zinc-800/50">
                                <Checkbox
                                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                                    onCheckedChange={handleSelectAll}
                                    disabled={subscribers.length === 0 || isDeleting}
                                    aria-label="Select all"
                                />
                            </th>
                            <th className="px-6 py-4 font-medium">Email</th>
                            <th className="px-6 py-4 font-medium">Name</th>
                            {customFields.map((cf: any) => (
                                <th key={cf.id} className="px-6 py-4 font-medium">{cf.name}</th>
                            ))}
                            <th className="px-6 py-4 font-medium">Status</th>
                            <th className="px-6 py-4 font-medium text-right">Added</th>
                            <th className="px-6 py-4 font-medium text-right w-16"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                        {subscribers.map((sub: any) => {
                            const isSelected = selectedIds.includes(sub.id);
                            return (
                                <tr key={sub.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                                    <td className="px-6 py-4 w-12 text-center border-r border-zinc-200 dark:border-zinc-800/50">
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={(checked) => handleSelectOne(checked as boolean, sub.id)}
                                            disabled={isDeleting}
                                            aria-label={`Select ${sub.email}`}
                                        />
                                    </td>
                                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">{sub.email}</td>
                                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{sub.name || '-'}</td>
                                    {customFields.map((cf: any) => {
                                        const subField = (sub as any).customFields?.find((cfv: any) => cfv.customFieldId === cf.id);
                                        return <td key={cf.id} className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{subField ? subField.value : '-'}</td>;
                                    })}
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${sub.status === 'subscribed' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                            {sub.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-zinc-500">
                                        {new Date(sub.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <SubscriberActions subscriber={sub} listId={listId} customFields={customFields} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="mt-4">
                <Pagination currentPage={currentPage} totalPages={totalPages} />
            </div>
        </div>
    );
}
