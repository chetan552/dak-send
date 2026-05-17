"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, X, ListOrdered, SendHorizonal } from "lucide-react";
import { updateRssFeed } from "@/app/actions/rss";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface RssFeedEditProps {
    feed: any;
    lists: any[];
    onClose: () => void;
}

const ITEM_TAGS = ["[RssTitle]", "[RssLink]", "[RssContent]", "[RssDescription]", "[RssAuthor]", "[RssDate]", "[RssThumbnail]"];
const WRAPPER_TAGS = ["[RssItems]", "[RssDate]", "[RssCount]", "[RssFeedName]", "[Unsubscribe]"];

export function RssFeedEdit({ feed, lists, onClose }: RssFeedEditProps) {
    const [loading, setLoading] = useState(false);
    const [digestMode, setDigestMode] = useState<boolean>(feed.digestMode ?? false);
    const [autoSend, setAutoSend] = useState<boolean>(feed.autoSend ?? false);
    const router = useRouter();

    const brandLists = lists.filter((l: any) => l.brandId === feed.brandId);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData(e.currentTarget);
            const checkedLists = brandLists.filter((_: any, i: number) => {
                const checkbox = e.currentTarget.querySelector(`input[name="list_${i}"]`) as HTMLInputElement;
                return checkbox?.checked;
            });
            formData.set("listIds", checkedLists.map((l: any) => l.id).join(","));
            formData.set("digestMode", digestMode ? "1" : "0");
            formData.set("autoSend", autoSend ? "1" : "0");

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
        <form onSubmit={handleSubmit} className="mt-4 border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
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

            {/* Digest mode toggle */}
            <div className="flex items-start gap-3 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <input
                    type="checkbox"
                    id="digestModeEdit"
                    checked={digestMode}
                    onChange={(e) => setDigestMode(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-300"
                />
                <div>
                    <label htmlFor="digestModeEdit" className="text-sm font-medium text-zinc-900 dark:text-white cursor-pointer flex items-center gap-2">
                        <ListOrdered className="w-4 h-4 text-orange-500" />
                        Daily Digest Mode
                    </label>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Send <strong>one email per run</strong> listing all new items instead of one email per item.
                    </p>
                </div>
            </div>

            {/* Auto-send toggle */}
            <div className="flex items-start gap-3 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <input
                    type="checkbox"
                    id="autoSendEdit"
                    checked={autoSend}
                    onChange={(e) => setAutoSend(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-300"
                />
                <div>
                    <label htmlFor="autoSendEdit" className="text-sm font-medium text-zinc-900 dark:text-white cursor-pointer flex items-center gap-2">
                        <SendHorizonal className="w-4 h-4 text-blue-500" />
                        Auto-Send Campaigns
                    </label>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Automatically dispatch each generated campaign to the selected lists without manual review. Leave off to review drafts first.
                    </p>
                </div>
            </div>

            {/* Templates */}
            {digestMode ? (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Digest Subject Line</Label>
                        <Input
                            name="digestSubject"
                            defaultValue={feed.digestSubject || ""}
                            placeholder="New Sermons Added — [RssDate]"
                            className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                        />
                        <p className="text-xs text-zinc-400">
                            Tags:{" "}
                            {["[RssDate]", "[RssCount]", "[RssFeedName]"].map(tag => (
                                <code key={tag} className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded mr-1">{tag}</code>
                            ))}
                        </p>
                    </div>

                    <details className="border border-zinc-200 dark:border-zinc-800 rounded-lg" open={!!feed.templateHtml}>
                        <summary className="px-4 py-3 cursor-pointer text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors font-medium">
                            Item Block Template <span className="font-normal text-zinc-400">(HTML for each item card)</span>
                        </summary>
                        <div className="px-4 pb-4 space-y-3 pt-2">
                            <div className="flex flex-wrap gap-1.5">
                                {ITEM_TAGS.map(tag => (
                                    <code key={tag} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded text-xs">{tag}</code>
                                ))}
                            </div>
                            <textarea
                                name="templateHtml"
                                rows={8}
                                defaultValue={feed.templateHtml || ""}
                                placeholder="Leave empty to use the default item card"
                                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-mono resize-y"
                            />
                        </div>
                    </details>

                    <details className="border border-zinc-200 dark:border-zinc-800 rounded-lg" open={!!feed.digestWrapperHtml}>
                        <summary className="px-4 py-3 cursor-pointer text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors font-medium">
                            Digest Email Wrapper <span className="font-normal text-zinc-400">(place [RssItems] where cards appear)</span>
                        </summary>
                        <div className="px-4 pb-4 space-y-3 pt-2">
                            <div className="flex flex-wrap gap-1.5">
                                {WRAPPER_TAGS.map(tag => (
                                    <code key={tag} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded text-xs">{tag}</code>
                                ))}
                            </div>
                            <textarea
                                name="digestWrapperHtml"
                                rows={10}
                                defaultValue={feed.digestWrapperHtml || ""}
                                placeholder="Leave empty to use the default digest wrapper"
                                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-mono resize-y"
                            />
                        </div>
                    </details>
                </div>
            ) : (
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        Email Template
                        <span className="text-xs text-zinc-400 font-normal">(optional)</span>
                    </Label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {ITEM_TAGS.map(tag => (
                            <code key={tag} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded text-xs">{tag}</code>
                        ))}
                    </div>
                    <textarea
                        name="templateHtml"
                        rows={6}
                        defaultValue={feed.templateHtml || ""}
                        placeholder="Leave empty to use the default template"
                        className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm font-mono resize-y"
                    />
                </div>
            )}

            <div className="flex items-center gap-3">
                <Button type="submit" disabled={loading} className="gap-2">
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
