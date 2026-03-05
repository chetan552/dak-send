"use client";

import { Button } from "@/components/ui/button";
import { deleteCampaign } from "@/app/actions/campaign";
import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteCampaignButton({
    campaignId,
    className,
    showText = false
}: {
    campaignId: string;
    className?: string;
    showText?: boolean;
}) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (confirm("Are you sure you want to delete this campaign? This action cannot be undone.")) {
            setLoading(true);
            try {
                await deleteCampaign(campaignId);
                router.push("/dashboard/campaigns");
            } catch (err: any) {
                alert(err.message || "Failed to delete campaign");
                setLoading(false);
            }
        }
    };

    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={loading}
            className={className || "text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors h-8 px-2"}
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {showText && <span className="ml-2">Delete</span>}
        </Button>
    );
}
