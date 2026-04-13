"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Trash2, Loader2 } from "lucide-react";
import { deleteList } from "@/app/actions/list";

export function DeleteListButton({ listId, listName, brandId }: { listId: string; listName: string; brandId: string }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleDelete = async () => {
        if (confirm !== listName) return;
        setLoading(true);
        setError("");
        try {
            await deleteList(listId);
            router.push(`/dashboard/brands/${brandId}`);
        } catch (err: any) {
            setError(err.message || "Failed to delete list.");
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setConfirm(""); setError(""); } }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 gap-2">
                    <Trash2 className="w-4 h-4" /> Delete List
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[440px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="text-zinc-900 dark:text-white">Delete List</DialogTitle>
                    <DialogDescription className="text-zinc-500 dark:text-zinc-400">
                        This will permanently delete <strong className="text-zinc-700 dark:text-zinc-300">{listName}</strong> and all its subscribers, custom fields, and segments. This cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Type <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{listName}</span> to confirm:
                    </p>
                    <Input
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder={listName}
                        className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white"
                    />
                    {error && <p className="text-sm text-red-500">{error}</p>}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} className="border-zinc-200 dark:border-zinc-700">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDelete}
                        disabled={confirm !== listName || loading}
                        className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Delete List
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
