"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pause, Play, Trash2, Pencil } from "lucide-react";
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
    const router = useRouter();

    const handleToggle = async () => {
        try {
            await toggleRssFeed(feed.id);
            toast.success(feed.isActive ? "Feed paused" : "Feed activated");
            router.refresh();
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Delete this RSS feed?")) return;
        try {
            await deleteRssFeed(feed.id);
            toast.success("Feed deleted");
            router.refresh();
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    return (
        <>
            <div className="flex items-center gap-1 flex-shrink-0">
                <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)} className="text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400">
                    <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleToggle} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
                    {feed.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={handleDelete} className="text-zinc-500 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
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
