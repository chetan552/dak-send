"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings, Loader2 } from "lucide-react";
import { updateBrandSettings } from "@/app/actions/brand";
import { useRouter } from "next/navigation";

interface BrandSettingsButtonProps {
    brand: {
        id: string;
        name: string;
        fromName: string | null;
        fromEmail: string | null;
        replyTo: string | null;
    };
}

export function BrandSettingsButton({ brand }: BrandSettingsButtonProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData(e.currentTarget);
            await updateBrandSettings(brand.id, formData);
            setOpen(false);
            router.refresh();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 dark:hover:text-white transition-all">
                    <Settings className="w-4 h-4" /> Brand Settings
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle className="text-xl">Brand Settings</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Update the sender identity and basic info for this brand.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-zinc-300">Brand Name</Label>
                        <Input id="name" name="name" defaultValue={brand.name} placeholder="Acme Corp" required className="bg-zinc-900 border-zinc-800 text-white" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="fromName" className="text-zinc-300">From Name</Label>
                        <Input id="fromName" name="fromName" defaultValue={brand.fromName || ""} placeholder="Acme Newsletter" className="bg-zinc-900 border-zinc-800 text-white" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="fromEmail" className="text-zinc-300">From Email</Label>
                        <Input id="fromEmail" name="fromEmail" defaultValue={brand.fromEmail || ""} type="email" placeholder="newsletter@acme.com" className="bg-zinc-900 border-zinc-800 text-white" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="replyTo" className="text-zinc-300">Reply-To Email</Label>
                        <Input id="replyTo" name="replyTo" defaultValue={brand.replyTo || ""} type="email" placeholder="support@acme.com" className="bg-zinc-900 border-zinc-800 text-white" />
                    </div>
                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
