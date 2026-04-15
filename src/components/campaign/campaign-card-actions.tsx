"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Copy,
    Trash2,
    MoreHorizontal,
    Loader2,
    CalendarX,
    XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { duplicateCampaign, deleteCampaign } from "@/app/actions/campaign";
import { cancelCampaign, unscheduleCampaign } from "@/app/actions/send";

type Status = "draft" | "scheduled" | "sending" | "sent" | "cancelled" | "failed";

interface CampaignCardActionsProps {
    campaignId: string;
    status: Status;
}

export function CampaignCardActions({ campaignId, status }: CampaignCardActionsProps) {
    const router = useRouter();
    const [pending, setPending] = useState<null | "duplicate" | "delete" | "cancel" | "unschedule">(null);

    const guard = async (action: typeof pending, run: () => Promise<unknown>, confirmMsg?: string) => {
        if (confirmMsg && !confirm(confirmMsg)) return;
        setPending(action);
        try {
            await run();
            router.refresh();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Something went wrong";
            alert(message);
            setPending(null);
        }
    };

    const onDuplicate = () =>
        guard("duplicate", async () => {
            const c = await duplicateCampaign(campaignId);
            router.push(`/dashboard/campaigns/${c.id}`);
        });

    const onDelete = () =>
        guard(
            "delete",
            async () => {
                await deleteCampaign(campaignId);
            },
            "Delete this campaign? This action cannot be undone.",
        );

    const onCancel = () =>
        guard(
            "cancel",
            async () => {
                await cancelCampaign(campaignId);
            },
            "Stop sending this campaign? Any pending emails in the queue will be cancelled.",
        );

    const onUnschedule = () =>
        guard(
            "unschedule",
            async () => {
                await unscheduleCampaign(campaignId);
            },
            "Unschedule this campaign? It will return to draft.",
        );

    const primary = (() => {
        if (status === "draft") {
            return (
                <Link href={`/dashboard/campaigns/${campaignId}`}>
                    <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs">
                        Edit
                    </Button>
                </Link>
            );
        }
        if (status === "sent") {
            return (
                <Link href={`/dashboard/campaigns/${campaignId}/report`}>
                    <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs">
                        Report
                    </Button>
                </Link>
            );
        }
        if (status === "sending") {
            return (
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs text-amber-700 dark:text-amber-300"
                    onClick={onCancel}
                    disabled={pending !== null}
                >
                    {pending === "cancel" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span className="ml-1">Stop</span>
                </Button>
            );
        }
        if (status === "scheduled") {
            return (
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={onUnschedule}
                    disabled={pending !== null}
                >
                    {pending === "unschedule" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarX className="w-3.5 h-3.5" />}
                    <span className="ml-1">Unschedule</span>
                </Button>
            );
        }
        return null;
    })();

    return (
        <div className="flex items-center gap-1">
            {primary}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-zinc-500 dark:text-zinc-400"
                        aria-label="More actions"
                        disabled={pending !== null}
                    >
                        {pending === "duplicate" || pending === "delete" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <MoreHorizontal className="w-4 h-4" />
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onSelect={onDuplicate}>
                        <Copy className="w-4 h-4" />
                        Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                        <Trash2 className="w-4 h-4" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
