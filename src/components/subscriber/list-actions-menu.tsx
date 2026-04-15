"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    MoreHorizontal,
    Download,
    Sparkles,
    Code,
    Loader2,
} from "lucide-react";
import { EmbedForm } from "@/components/campaign/embed-form";
import { generateEngagementSegments } from "@/app/actions/engagement";

interface CustomField {
    id: string;
    name: string;
    type: string;
    required: boolean;
    options: string | null;
}

interface ListActionsMenuProps {
    listId: string;
    requireGdpr: boolean;
    customFields: CustomField[];
}

export function ListActionsMenu({ listId, requireGdpr, customFields }: ListActionsMenuProps) {
    const [embedOpen, setEmbedOpen] = useState(false);
    const [loadingSegments, setLoadingSegments] = useState(false);
    const [exporting, setExporting] = useState(false);

    const handleExport = () => {
        setExporting(true);
        window.open(`/api/export?listId=${listId}`, "_blank");
        setTimeout(() => setExporting(false), 2000);
    };

    const handleGenerateSegments = async () => {
        setLoadingSegments(true);
        try {
            const result = await generateEngagementSegments(listId);
            toast.success(`Created ${result.segmentsCreated} engagement segments`);
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to generate segments";
            toast.error(message);
        } finally {
            setLoadingSegments(false);
        }
    };

    const busy = loadingSegments || exporting;

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 border-zinc-200 dark:border-zinc-700"
                        disabled={busy}
                    >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}
                        More
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onSelect={() => setEmbedOpen(true)}>
                        <Code className="w-4 h-4" />
                        Embed form
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleExport}>
                        <Download className="w-4 h-4" />
                        Export CSV
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleGenerateSegments}>
                        <Sparkles className="w-4 h-4" />
                        Auto-segment
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <EmbedForm
                listId={listId}
                requireGdpr={requireGdpr}
                customFields={customFields}
                open={embedOpen}
                onOpenChange={setEmbedOpen}
                hideTrigger
            />
        </>
    );
}
