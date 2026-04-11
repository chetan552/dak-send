"use client";

import { Button } from "@/components/ui/button";
import { duplicateCampaign } from "@/app/actions/campaign";
import { Loader2, Copy } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function DuplicateCampaignButton({
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

    const handleDuplicate = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        setLoading(true);
        try {
            const newCampaign = await duplicateCampaign(campaignId);
            router.push(`/dashboard/campaigns/${newCampaign.id}`);
        } catch (err: any) {
            alert(err.message || "Failed to duplicate campaign");
            setLoading(false);
        }
    };

    const button = (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDuplicate}
            disabled={loading}
            className={className || "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors h-8 px-2"}
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
            {showText && <span className="ml-2">Duplicate</span>}
        </Button>
    );

    if (showText) return button;

    return (
        <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent side="top">Duplicate campaign</TooltipContent>
        </Tooltip>
    );
}
