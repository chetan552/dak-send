"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Loader2 } from "lucide-react";
import { deleteBrand } from "@/app/actions/brand-delete";
import { useRouter } from "next/navigation";

interface DeleteBrandButtonProps {
    brandId: string;
    brandName: string;
}

export function DeleteBrandButton({ brandId, brandName }: DeleteBrandButtonProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        setLoading(true);
        try {
            await deleteBrand(brandId);
            router.push("/dashboard");
        } catch (error) {
            console.error(error);
            alert("Failed to delete brand. Only admins can perform this action.");
        } finally {
            setLoading(false);
            setOpen(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-red-300 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-400 dark:hover:border-red-800 transition-all">
                    <Trash2 className="w-4 h-4" /> Delete Brand
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle className="text-xl text-red-400">Delete Brand</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Are you sure you want to delete <strong className="text-white">{brandName}</strong>? This will permanently delete all associated lists, subscribers, campaigns, and settings. This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800">
                        Cancel
                    </Button>
                    <Button onClick={handleDelete} disabled={loading} className="bg-red-600 text-white hover:bg-red-700">
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Delete Forever
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
