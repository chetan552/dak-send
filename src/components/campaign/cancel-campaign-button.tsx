"use client";

import { Button } from "@/components/ui/button";
import { cancelCampaign } from "@/app/actions/send";
import { Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelCampaignButton({
    campaignId,
    className,
}: {
    campaignId: string;
    className?: string;
}) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleCancel = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (confirm("Stop this campaign? Pending queued emails will be cancelled. Already-sent emails will remain in the report.")) {
            setLoading(true);
            try {
                await cancelCampaign(campaignId);
                router.refresh();
            } catch (err: any) {
                alert(err.message || "Failed to cancel campaign");
                setLoading(false);
            }
        }
    };

    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={loading}
            className={className || "text-yellow-600 hover:bg-yellow-500/10 hover:text-yellow-500 transition-colors h-8 px-2 dark:text-yellow-500"}
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            <span className="ml-2">Stop Sending</span>
        </Button>
    );
}
