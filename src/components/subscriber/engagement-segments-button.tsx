"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateEngagementSegments } from "@/app/actions/engagement";

export function EngagementSegmentsButton({ listId }: { listId: string }) {
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const result = await generateEngagementSegments(listId);
            toast.success(`Created ${result.segmentsCreated} engagement segments`);
        } catch (e: any) {
            toast.error(e.message || "Failed to generate segments");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={loading}
            className="border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white gap-2"
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Auto-Segment
        </Button>
    );
}
