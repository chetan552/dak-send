"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { createBrand } from "@/app/actions/brand";

export function CreateBrandButton() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData(e.currentTarget);
            await createBrand(formData);
            setOpen(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="w-4 h-4" /> Add Brand
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle className="text-xl">Create New Brand</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Set up a new sender identity for your client or project.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-zinc-300">Brand Name</Label>
                        <Input id="name" name="name" placeholder="Acme Corp" required className="bg-zinc-900 border-zinc-800 text-white" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="fromName" className="text-zinc-300">From Name</Label>
                        <Input id="fromName" name="fromName" placeholder="Acme Newsletter" className="bg-zinc-900 border-zinc-800 text-white" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="fromEmail" className="text-zinc-300">From Email</Label>
                        <Input id="fromEmail" name="fromEmail" type="email" placeholder="newsletter@acme.com" className="bg-zinc-900 border-zinc-800 text-white" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="replyTo" className="text-zinc-300">Reply-To Email</Label>
                        <Input id="replyTo" name="replyTo" type="email" placeholder="support@acme.com" className="bg-zinc-900 border-zinc-800 text-white" />
                    </div>
                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create Brand
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
