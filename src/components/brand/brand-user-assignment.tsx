"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { assignUserToBrand, removeUserFromBrand } from "@/app/actions/brand";
import { Loader2, UserPlus, X } from "lucide-react";

type UserBasic = {
    id: string;
    email: string;
    name: string | null;
};

export function BrandUserAssignment({
    brandId,
    assignedUsers,
    ownerId
}: {
    brandId: string;
    assignedUsers: UserBasic[];
    ownerId: string;
}) {
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        try {
            await assignUserToBrand(brandId, email);
            setEmail("");
        } catch (error: any) {
            alert(error.message || "Failed to assign user");
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (userId: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Are you sure you want to remove this user from the brand?")) return;

        setRemovingId(userId);
        try {
            await removeUserFromBrand(brandId, userId);
        } catch (error: any) {
            alert(error.message || "Failed to remove user");
        } finally {
            setRemovingId(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-zinc-600 dark:text-zinc-400">
                    <UserPlus className="w-4 h-4" /> Manage Access
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="text-zinc-900 dark:text-white">Manage Brand Access</DialogTitle>
                    <DialogDescription className="text-zinc-500 dark:text-zinc-400">
                        Assign users who can view and manage this brand's lists and campaigns.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <form onSubmit={handleAssign} className="flex gap-2">
                        <Input
                            placeholder="User Email Address"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-indigo-500 text-zinc-900 dark:text-white"
                        />
                        <Button type="submit" disabled={loading} className="min-w-[80px]">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assign"}
                        </Button>
                    </form>

                    <div className="space-y-3 mt-4">
                        <h4 className="text-sm font-medium text-zinc-900 dark:text-white">Current Users</h4>
                        {assignedUsers.map((user) => (
                            <div key={user.id} className="flex items-center justify-between p-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                                <div>
                                    <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                        {user.name || "Unknown"}
                                        {user.id === ownerId && (
                                            <Badge variant="secondary" className="ml-2 text-[10px] h-4">Owner</Badge>
                                        )}
                                    </p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
                                </div>
                                {user.id !== ownerId && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        disabled={removingId === user.id}
                                        onClick={(e) => handleRemove(user.id, e)}
                                        className="text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 h-8 w-8 p-0"
                                    >
                                        {removingId === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
