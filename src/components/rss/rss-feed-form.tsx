"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Rss, ListOrdered } from "lucide-react";
import { createRssFeed } from "@/app/actions/rss";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface RssFeedFormProps {
    brands: any[];
    lists: any[];
}

const ITEM_TAGS = ["[RssTitle]", "[RssLink]", "[RssContent]", "[RssAuthor]", "[RssDate]", "[RssThumbnail]"];
const WRAPPER_TAGS = ["[RssItems]", "[RssDate]", "[RssCount]", "[RssFeedName]", "[Unsubscribe]"];

export function RssFeedForm({ brands, lists }: RssFeedFormProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedBrand, setSelectedBrand] = useState("");
    const [digestMode, setDigestMode] = useState(false);
    const router = useRouter();

    const brandLists = lists.filter((l: any) => l.brandId === selectedBrand);

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
            formData.set("brandId", selectedBrand);
            formData.set("digestMode", digestMode ? "1" : "0");

            await createRssFeed(formData);
            toast.success("RSS feed added!");
            setIsOpen(false);
            router.refresh();
        } catch (e: any) {
            toast.error(e.message || "Failed to add feed");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <Button onClick={() => setIsOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                <Plus className="w-4 h-4" /> Add RSS Feed
            </Button>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 p-6 space-y-5">
            <h3 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <Rss className="w-4 h-4" /> New RSS Feed
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Feed Name</Label>
                    <Input name="name" placeholder="Sermon Digest" required className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" />
                </div>
                <div className="space-y-2">
                    <Label>RSS Feed URL</Label>
                    <Input name="url" type="url" placeholder="https://yoursite.com/rss.xml" required className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Brand</Label>
                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                    <SelectTrigger className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                        <SelectValue placeholder="Select a brand" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                        {brands.map((b: any) => (
                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {selectedBrand && brandLists.length > 0 && (
                <div className="space-y-2">
                    <Label>Target Lists</Label>
                    <div className="space-y-2 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                        {brandLists.map((list: any, i: number) => (
                            <label key={list.id} className="flex items-center gap-2 text-sm">
                                <input type="checkbox" name={`list_${i}`} defaultChecked className="rounded border-zinc-300" />
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
                    id="digestMode"
                    checked={digestMode}
                    onChange={(e) => setDigestMode(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-300"
                />
                <div>
                    <label htmlFor="digestMode" className="text-sm font-medium text-zinc-900 dark:text-white cursor-pointer flex items-center gap-2">
                        <ListOrdered className="w-4 h-4 text-orange-500" />
                        Daily Digest Mode
                    </label>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Send <strong>one email per run</strong> listing all new items, instead of one email per item. Perfect for daily newsletters.
                    </p>
                </div>
            </div>

            {/* Templates */}
            <div className="space-y-4">
                {digestMode ? (
                    <>
                        {/* Digest subject */}
                        <div className="space-y-2">
                            <Label>Digest Subject Line</Label>
                            <Input
                                name="digestSubject"
                                placeholder="New Sermons Added — [RssDate]"
                                className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                            />
                            <p className="text-xs text-zinc-400">
                                Tags: <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">[RssDate]</code>{" "}
                                <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">[RssCount]</code>{" "}
                                <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">[RssFeedName]</code>
                            </p>
                        </div>

                        {/* Per-item block */}
                        <details className="border border-zinc-200 dark:border-zinc-800 rounded-lg">
                            <summary className="px-4 py-3 cursor-pointer text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors font-medium">
                                Item Block Template <span className="font-normal text-zinc-400">(HTML for each sermon in the digest)</span>
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
                                    placeholder="Leave empty to use the default item card template"
                                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-mono resize-y"
                                />
                            </div>
                        </details>

                        {/* Outer wrapper */}
                        <details className="border border-zinc-200 dark:border-zinc-800 rounded-lg">
                            <summary className="px-4 py-3 cursor-pointer text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors font-medium">
                                Digest Email Wrapper <span className="font-normal text-zinc-400">(outer email — place [RssItems] where item cards appear)</span>
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
                                    placeholder="Leave empty to use the default digest wrapper"
                                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-mono resize-y"
                                />
                            </div>
                        </details>
                    </>
                ) : (
                    /* Non-digest: single full-email template */
                    <details className="border border-zinc-200 dark:border-zinc-800 rounded-lg">
                        <summary className="px-4 py-3 cursor-pointer text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                            Custom Email Template <span className="text-zinc-400">(optional — uses default if empty)</span>
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
                                placeholder={`<div style="font-family: system-ui; max-width: 600px; margin: 0 auto; padding: 40px 20px;">\n  <h1>[RssTitle]</h1>\n  <p>By [RssAuthor] — [RssDate]</p>\n  <div>[RssContent]</div>\n  <a href="[RssLink]">Read Full Article →</a>\n</div>`}
                                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm font-mono resize-y"
                            />
                        </div>
                    </details>
                )}
            </div>

            <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={loading || !selectedBrand} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rss className="w-4 h-4" />}
                    Add Feed
                </Button>
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
            </div>
        </form>
    );
}
