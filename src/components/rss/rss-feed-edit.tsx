"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, X } from "lucide-react";
import { updateRssFeed } from "@/app/actions/rss";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface RssFeedEditProps {
    feed: any;
    lists: any[];
    onClose: () => void;
}

export function RssFeedEdit({ feed, lists, onClose }: RssFeedEditProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const brandLists = lists.filter((l: any) => l.brandId === feed.brandId);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData(e.currentTarget);
            // Collect checked list IDs
            const checkedLists = brandLists.filter((_: any, i: number) => {
                const checkbox = e.currentTarget.querySelector(`input[name="list_${i}"]`) as HTMLInputElement;
                return checkbox?.checked;
            });
            formData.set("listIds", checkedLists.map((l: any) => l.id).join(","));

            await updateRssFeed(feed.id, formData);
            toast.success("Feed updated!");
            onClose();
            router.refresh();
        } catch (e: any) {
            toast.error(e.message || "Failed to update feed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-4 border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Feed Name</Label>
                    <Input name="name" defaultValue={feed.name} required className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" />
                </div>
                <div className="space-y-2">
                    <Label>RSS Feed URL</Label>
                    <Input name="url" type="url" defaultValue={feed.url} required className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" />
                </div>
            </div>

            {brandLists.length > 0 && (
                <div className="space-y-2">
                    <Label>Target Lists</Label>
                    <div className="space-y-2 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                        {brandLists.map((list: any, i: number) => (
                            <label key={list.id} className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    name={`list_${i}`}
                                    defaultChecked={feed.listIds?.includes(list.id)}
                                    className="rounded border-zinc-300"
                                />
                                <span className="text-zinc-900 dark:text-white">{list.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <Label className="flex items-center gap-2">
                    Email Template
                    <span className="text-xs text-zinc-400 font-normal">(optional)</span>
                </Label>
                <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-md p-3 text-xs text-zinc-500 dark:text-zinc-400 space-y-1 mb-2">
                    <p className="font-medium text-zinc-700 dark:text-zinc-300">Merge tags:</p>
                    <div className="flex flex-wrap gap-2">
                        {["[RssTitle]", "[RssContent]", "[RssLink]", "[RssAuthor]", "[RssDate]"].map(tag => (
                            <code key={tag} className="bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{tag}</code>
                        ))}
                    </div>
                </div>
                <textarea
                    name="templateHtml"
                    rows={6}
                    defaultValue={feed.templateHtml || ""}
                    placeholder="Leave empty to use the default template"
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm font-mono resize-y"
                />
            </div>

            <div className="flex items-center gap-3">
                <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                </Button>
                <Button type="button" variant="ghost" onClick={onClose} className="gap-2">
                    <X className="w-4 h-4" /> Cancel
                </Button>
            </div>
        </form>
    );
}
