"use client";

import { Button } from "@/components/ui/button";
import { unscheduleCampaign } from "@/app/actions/send";
import { Loader2, CalendarX } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function UnscheduleCampaignButton({
    campaignId,
    className,
    showText = false,
}: {
    campaignId: string;
    className?: string;
    showText?: boolean;
}) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleUnschedule = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (confirm("Unschedule this campaign? It will return to draft and you can reschedule or edit it.")) {
            setLoading(true);
            try {
                await unscheduleCampaign(campaignId);
                router.refresh();
            } catch (err: any) {
                alert(err.message || "Failed to unschedule campaign");
                setLoading(false);
            }
        }
    };

    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleUnschedule}
            disabled={loading}
            className={className || "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors h-8 px-2"}
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarX className="w-4 h-4" />}
            {showText && <span className="ml-2">Unschedule</span>}
        </Button>
    );
}
