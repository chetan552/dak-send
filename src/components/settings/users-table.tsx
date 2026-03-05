"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DeleteUserButton } from "@/components/settings/delete-user-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Loader2 } from "lucide-react";
import { deleteUsers } from "@/app/actions/user";
import { toast } from "sonner";

interface UsersTableProps {
    users: any[];
    currentUserId: string;
}

export function UsersTable({ users, currentUserId }: UsersTableProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(users.filter(u => u.id !== currentUserId).map(u => u.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (checked: boolean, id: string) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(userId => userId !== id));
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;

        setIsDeleting(true);
        try {
            await deleteUsers(selectedIds);
            toast.success(`Deleted ${selectedIds.length} users successfully`);
            setSelectedIds([]); // Clear selection
        } catch (error: any) {
            toast.error(error.message || "Failed to delete users");
        } finally {
            setIsDeleting(false);
        }
    };

    const allSelectableUsers = users.filter(u => u.id !== currentUserId);
    const allSelected = allSelectableUsers.length > 0 && selectedIds.length === allSelectableUsers.length;
    const someSelected = selectedIds.length > 0 && selectedIds.length < allSelectableUsers.length;

    return (
        <div className="space-y-4">
            {selectedIds.length > 0 && (
                <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-100 dark:border-red-900/30">
                    <span className="text-sm font-medium text-red-800 dark:text-red-300">
                        {selectedIds.length} user{selectedIds.length !== 1 ? 's' : ''} selected
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

            <div className="rounded-md border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <Table>
                    <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                        <TableRow className="border-zinc-200 dark:border-zinc-800 hover:bg-transparent">
                            <TableHead className="w-12 text-center">
                                <Checkbox
                                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                                    onCheckedChange={handleSelectAll}
                                    disabled={allSelectableUsers.length === 0 || isDeleting}
                                    aria-label="Select all"
                                />
                            </TableHead>
                            <TableHead className="text-zinc-500 dark:text-zinc-400">Name</TableHead>
                            <TableHead className="text-zinc-500 dark:text-zinc-400">Email</TableHead>
                            <TableHead className="text-zinc-500 dark:text-zinc-400">Role</TableHead>
                            <TableHead className="text-zinc-500 dark:text-zinc-400">Joined</TableHead>
                            <TableHead className="text-zinc-500 dark:text-zinc-400 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {users.map(u => {
                            const isCurrentUser = u.id === currentUserId;
                            const isSelected = selectedIds.includes(u.id);

                            return (
                                <TableRow key={u.id} className="border-zinc-200 dark:border-zinc-800 border-none hover:bg-zinc-50 dark:hover:bg-zinc-800/20">
                                    <TableCell className="w-12 text-center">
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={(checked) => handleSelectOne(checked as boolean, u.id)}
                                            disabled={isCurrentUser || isDeleting}
                                            aria-label={`Select ${u.name}`}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium text-zinc-900 dark:text-white">{u.name}</TableCell>
                                    <TableCell className="text-zinc-500 dark:text-zinc-400">{u.email}</TableCell>
                                    <TableCell>
                                        {u.role === 'admin' ? (
                                            <Badge className="bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20">Admin</Badge>
                                        ) : (
                                            <Badge variant="outline" className="border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400">User</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-zinc-500 text-sm">
                                        {new Date(u.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {!isCurrentUser ? (
                                            <DeleteUserButton userId={u.id} />
                                        ) : (
                                            <span className="text-zinc-400 dark:text-zinc-600 text-xs font-medium px-2 block h-8 border border-transparent leading-8">You</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
