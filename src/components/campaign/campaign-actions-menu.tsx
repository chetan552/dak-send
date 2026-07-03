"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Copy, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { duplicateCampaign, deleteCampaign } from "@/app/actions/campaign";

/**
 * Overflow menu for the less-frequent campaign actions (duplicate / delete),
 * keeping them out of the primary action row so the main build CTAs stay clear.
 */
export function CampaignActionsMenu({ campaignId }: { campaignId: string }) {
    const [busy, setBusy] = useState(false);
    const router = useRouter();

    const handleDuplicate = async () => {
        setBusy(true);
        try {
            const next = await duplicateCampaign(campaignId);
            router.push(`/dashboard/campaigns/${next.id}`);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to duplicate campaign");
            setBusy(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this campaign? This action cannot be undone.")) return;
        setBusy(true);
        try {
            await deleteCampaign(campaignId);
            router.push("/dashboard/campaigns");
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to delete campaign");
            setBusy(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={busy}
                    aria-label="More actions"
                    className="border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 h-10 w-10"
                >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={handleDuplicate} disabled={busy}>
                    <Copy className="w-4 h-4" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleDelete} disabled={busy}>
                    <Trash2 className="w-4 h-4" /> Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
