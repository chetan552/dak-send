"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { dispatchCampaign } from "@/app/actions/send";
import { useRouter } from "next/navigation";

export function SendButton({ campaignId, payload, disabled }: { campaignId: string, payload: any, disabled: boolean }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSend = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) {
            alert("Please select at least one list or segment to include.");
            return;
        }

        if (confirm("Are you sure you want to send this campaign? This action cannot be undone.")) {
            setLoading(true);
            try {
                await dispatchCampaign(campaignId, payload);
                router.push("/dashboard/campaigns");
            } catch (error: any) {
                console.error(error);
                alert(error.message || "An error occurred");
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <Button
            type="button"
            onClick={handleSend}
            disabled={disabled || loading}
            className="bg-indigo-600 w-full text-white hover:bg-indigo-700 h-12 text-lg gap-2 mt-6 shadow-[0_0_20px_rgba(79,70,229,0.3)]"
        >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {loading ? "Queuing..." : "Send Campaign Now"}
        </Button>
    );
}
