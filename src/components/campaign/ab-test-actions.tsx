"use client";

import { Button } from "@/components/ui/button";
import { Trophy, Trash2 } from "lucide-react";
import { deleteAbTestVariant, pickAbTestWinner } from "@/app/actions/ab-test";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface AbTestActionsProps {
    variantId: string;
    isWinner: boolean;
    isDraft: boolean;
    hasSent: boolean;
}

export function AbTestActions({ variantId, isWinner, isDraft, hasSent }: AbTestActionsProps) {
    const router = useRouter();

    const handlePick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await pickAbTestWinner(variantId);
            toast.success("Winner selected! Campaign updated with winning content.");
            router.refresh();
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Delete this variant?")) return;
        try {
            await deleteAbTestVariant(variantId);
            toast.success("Variant deleted");
            router.refresh();
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    return (
        <div className="flex items-center gap-1 flex-shrink-0">
            {hasSent && !isWinner && (
                <Button type="button" variant="ghost" size="sm" onClick={handlePick} className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 gap-1 text-xs">
                    <Trophy className="w-3 h-3" /> Pick Winner
                </Button>
            )}
            {isDraft && (
                <Button type="button" variant="ghost" size="sm" onClick={handleDelete} className="text-zinc-500 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                </Button>
            )}
        </div>
    );
}
