"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BlockEditor } from "@/components/campaign/block-editor";
import { updateCampaignBlocks } from "@/app/actions/campaign";
import type { BlockEmailDocument } from "@/lib/blocks-to-html";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface BuilderClientProps {
    campaignId: string;
    campaignName: string;
    initialDoc: BlockEmailDocument | null;
}

export function BuilderClient({ campaignId, campaignName, initialDoc }: BuilderClientProps) {
    const router = useRouter();

    const handleSave = async (doc: BlockEmailDocument, compiledHtml: string) => {
        try {
            await updateCampaignBlocks(campaignId, doc, compiledHtml);
            toast.success("Campaign saved!");
        } catch (err: any) {
            toast.error(err?.message || "Failed to save");
            throw err;
        }
    };

    return (
        <div className="fixed inset-0 z-40 flex flex-col bg-zinc-50 dark:bg-zinc-950">
            {/* Top bar */}
            <div className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0 z-10">
                <Link
                    href={`/dashboard/campaigns/${campaignId}`}
                    className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Campaign
                </Link>
                <span className="w-px h-5 bg-zinc-200 dark:bg-zinc-700" />
                <h1 className="text-sm font-semibold text-zinc-900 dark:text-white truncate max-w-xs">
                    {campaignName}
                </h1>
                <span className="ml-auto text-xs text-zinc-400 dark:text-zinc-500 hidden sm:block">
                    Block Editor — drag blocks to reorder, click to edit
                </span>
            </div>

            {/* Editor fills remaining height */}
            <div className="flex-1 overflow-hidden">
                <BlockEditor
                    campaignId={campaignId}
                    initialDoc={initialDoc}
                    onSave={handleSave}
                />
            </div>
        </div>
    );
}
