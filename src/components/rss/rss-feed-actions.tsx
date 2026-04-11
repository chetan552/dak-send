"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pause, Play, Trash2, Pencil, Loader2 } from "lucide-react";
import { toggleRssFeed, deleteRssFeed } from "@/app/actions/rss";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { RssFeedEdit } from "./rss-feed-edit";

interface RssFeedActionsProps {
    feed: any;
    lists: any[];
}

export function RssFeedActions({ feed, lists }: RssFeedActionsProps) {
    const [editing, setEditing] = useState(false);
    const [toggling, setToggling] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const router = useRouter();

    const handleToggle = async () => {
        setToggling(true);
        try {
            await toggleRssFeed(feed.id);
            toast.success(feed.isActive ? "Feed paused" : "Feed activated");
            router.refresh();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setToggling(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Delete this RSS feed?")) return;
        setDeleting(true);
        try {
            await deleteRssFeed(feed.id);
            toast.success("Feed deleted");
            router.refresh();
        } catch (e: any) {
            toast.error(e.message);
            setDeleting(false);
        }
    };

    const busy = toggling || deleting;

    return (
        <>
            <div className="flex items-center gap-1 flex-shrink-0">
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => setEditing(!editing)} className="text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400">
                    <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" disabled={busy} onClick={handleToggle} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
                    {toggling ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : feed.isActive ? (
                        <Pause className="w-4 h-4" />
                    ) : (
                        <Play className="w-4 h-4" />
                    )}
                </Button>
                <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={handleDelete} className="text-zinc-500 hover:text-red-600">
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </Button>
            </div>
            {editing && (
                <div className="col-span-full">
                    <RssFeedEdit feed={feed} lists={lists} onClose={() => setEditing(false)} />
                </div>
            )}
        </>
    );
}
