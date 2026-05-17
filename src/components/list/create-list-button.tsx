"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Copy } from "lucide-react";
import { createList } from "@/app/actions/list";

interface ExistingList {
    id: string;
    name: string;
    _count?: { customFields?: number };
}

export function CreateListButton({ brandId, existingLists = [] }: { brandId: string; existingLists?: ExistingList[] }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [copyFromListId, setCopyFromListId] = useState("none");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData(e.currentTarget);
            formData.append("brandId", brandId);
            if (copyFromListId && copyFromListId !== "none") {
                formData.append("copyFromListId", copyFromListId);
            }
            await createList(formData);
            setOpen(false);
            setCopyFromListId("none");
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const listsWithFields = existingLists.filter(l => (l._count?.customFields ?? 0) > 0);

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setCopyFromListId("none"); }}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="w-4 h-4" /> Add List
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle className="text-xl">Create New List</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Create a new mailing list to store subscribers.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-zinc-300">List Name</Label>
                        <Input id="name" name="name" placeholder="Newsletter Subscribers" required className="bg-zinc-900 border-zinc-800 text-white" />
                    </div>

                    {listsWithFields.length > 0 && (
                        <div className="space-y-2">
                            <Label className="text-zinc-300 flex items-center gap-1.5">
                                <Copy className="w-3.5 h-3.5" /> Copy Custom Fields From
                            </Label>
                            <Select value={copyFromListId} onValueChange={setCopyFromListId}>
                                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white">
                                    <SelectValue placeholder="None — start fresh" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                    <SelectItem value="none" className="text-zinc-400">None — start fresh</SelectItem>
                                    {listsWithFields.map(list => (
                                        <SelectItem key={list.id} value={list.id}>
                                            {list.name}
                                            {list._count?.customFields ? (
                                                <span className="ml-1 text-zinc-500">
                                                    ({list._count.customFields} field{list._count.customFields !== 1 ? "s" : ""})
                                                </span>
                                            ) : null}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {copyFromListId && copyFromListId !== "none" && (
                                <p className="text-xs text-blue-400">
                                    Custom fields will be copied into the new list automatically.
                                </p>
                            )}
                        </div>
                    )}

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create List
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
