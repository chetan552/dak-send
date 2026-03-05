"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Rss } from "lucide-react";
import { createRssFeed } from "@/app/actions/rss";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface RssFeedFormProps {
    brands: any[];
    lists: any[];
}

export function RssFeedForm({ brands, lists }: RssFeedFormProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedBrand, setSelectedBrand] = useState("");
    const router = useRouter();

    const brandLists = lists.filter((l: any) => l.brandId === selectedBrand);

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
            formData.set("brandId", selectedBrand);

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
        <form onSubmit={handleSubmit} className="border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 p-6 space-y-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <Rss className="w-4 h-4" /> New RSS Feed
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Feed Name</Label>
                    <Input name="name" placeholder="My Blog" required className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" />
                </div>
                <div className="space-y-2">
                    <Label>RSS Feed URL</Label>
                    <Input name="url" type="url" placeholder="https://blog.example.com/rss" required className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" />
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

            {/* Custom Template */}
            <div className="space-y-2">
                <Label className="flex items-center gap-2">
                    Custom Email Template
                    <span className="text-xs text-zinc-400 font-normal">(optional)</span>
                </Label>
                <details className="border border-zinc-200 dark:border-zinc-800 rounded-lg">
                    <summary className="px-4 py-3 cursor-pointer text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                        Click to set a custom HTML template (uses default if empty)
                    </summary>
                    <div className="px-4 pb-4 space-y-3">
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-md p-3 text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
                            <p className="font-medium text-zinc-700 dark:text-zinc-300">Available merge tags:</p>
                            <div className="grid grid-cols-2 gap-1">
                                <code className="bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded">[RssTitle]</code>
                                <span>Article title</span>
                                <code className="bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded">[RssContent]</code>
                                <span>Article body text</span>
                                <code className="bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded">[RssLink]</code>
                                <span>Article URL</span>
                                <code className="bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded">[RssAuthor]</code>
                                <span>Author name</span>
                                <code className="bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded">[RssDate]</code>
                                <span>Publish date</span>
                            </div>
                        </div>
                        <textarea
                            name="templateHtml"
                            rows={8}
                            placeholder={`<div style="font-family: system-ui; max-width: 600px; margin: 0 auto; padding: 40px 20px;">\n  <h1>[RssTitle]</h1>\n  <p>By [RssAuthor] — [RssDate]</p>\n  <div>[RssContent]</div>\n  <a href="[RssLink]">Read Full Article →</a>\n</div>`}
                            className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm font-mono resize-y"
                        />
                    </div>
                </details>
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
