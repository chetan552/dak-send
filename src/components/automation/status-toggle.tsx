"use client";

import { useState, useTransition } from "react";
import { updateAutomation } from "@/app/actions/automation";
import { Play, Pause } from "lucide-react";
import { useRouter } from "next/navigation";

interface AutomationStatusToggleProps {
    automationId: string;
    currentStatus: string;
}

export function AutomationStatusToggle({ automationId, currentStatus }: AutomationStatusToggleProps) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const toggleStatus = () => {
        const newStatus = currentStatus === "active" ? "paused" : "active";
        startTransition(async () => {
            await updateAutomation(automationId, { status: newStatus });
            router.refresh();
        });
    };

    return (
        <button
            onClick={toggleStatus}
            disabled={isPending}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
            title={currentStatus === "active" ? "Pause automation" : "Activate automation"}
        >
            {currentStatus === "active" ? (
                <Pause className="w-4 h-4 text-yellow-500" />
            ) : (
                <Play className="w-4 h-4 text-green-500" />
            )}
        </button>
    );
}
