"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, FlaskConical } from "lucide-react";
import { createAbTestVariant } from "@/app/actions/ab-test";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface AbTestFormProps {
    campaignId: string;
    existingVariantCount: number;
}

export function AbTestForm({ campaignId, existingVariantCount }: AbTestFormProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const nextLetter = String.fromCharCode(65 + existingVariantCount); // A, B, C...

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData(e.currentTarget);
            await createAbTestVariant(campaignId, formData);
            toast.success("Variant added!");
            setIsOpen(false);
            router.refresh();
        } catch (e: any) {
            toast.error(e.message || "Failed to add variant");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <Button onClick={() => setIsOpen(true)} variant="outline" className="gap-2 border-zinc-200 dark:border-zinc-700">
                <Plus className="w-4 h-4" /> Add Variant {nextLetter}
            </Button>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 p-5 space-y-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <FlaskConical className="w-4 h-4" /> Variant {nextLetter}
            </h3>

            <Input name="name" defaultValue={`Variant ${nextLetter}`} placeholder="Variant name" required className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" />

            <div className="space-y-2">
                <Label>Subject Line Override (leave empty to use original)</Label>
                <Input name="subject" placeholder="Alternative subject line..." className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" />
            </div>

            <div className="space-y-2">
                <Label>Split Percentage</Label>
                <Input name="splitPercent" type="number" min="1" max="99" defaultValue="50" className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 w-32" />
                <p className="text-xs text-zinc-500">Percentage of recipients who will receive this variant</p>
            </div>

            <div className="space-y-2">
                <Label>HTML Content Override (optional)</Label>
                <textarea
                    name="htmlText"
                    rows={4}
                    placeholder="Leave empty to use the original campaign content..."
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm resize-y"
                />
            </div>

            <div className="flex items-center gap-3">
                <Button type="submit" disabled={loading} className="gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add Variant
                </Button>
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
            </div>
        </form>
    );
}
