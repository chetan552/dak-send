"use client";

import { useState, useTransition, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tag, Plus, Trash2, Users, ChevronDown } from "lucide-react";
import { getTagsForBrand, createTag, deleteTag } from "@/app/actions/tags";

interface Brand {
    id: string;
    name: string;
}

interface TagRow {
    id: string;
    name: string;
    brandId: string;
    createdAt: Date;
    _count: { subscribers: number };
}

export function TagsClient({ brands }: { brands: Brand[] }) {
    const [isPending, startTransition] = useTransition();
    const [selectedBrandId, setSelectedBrandId] = useState(brands[0]?.id || "");
    const [tags, setTags] = useState<TagRow[]>([]);
    const [newTagName, setNewTagName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const loadTags = (brandId: string) => {
        if (!brandId) return;
        setLoading(true);
        startTransition(async () => {
            try {
                const result = await getTagsForBrand(brandId);
                setTags(result as TagRow[]);
            } catch (err: any) {
                setError(err.message || "Failed to load tags");
            } finally {
                setLoading(false);
            }
        });
    };

    useEffect(() => {
        loadTags(selectedBrandId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedBrandId]);

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!newTagName.trim()) { setError("Tag name is required"); return; }
        startTransition(async () => {
            try {
                await createTag(selectedBrandId, newTagName.trim());
                setNewTagName("");
                loadTags(selectedBrandId);
            } catch (err: any) {
                setError(err.message || "Failed to create tag");
            }
        });
    };

    const handleDelete = (tagId: string) => {
        if (!confirm("Delete this tag? It will be removed from all subscribers.")) return;
        startTransition(async () => {
            try {
                await deleteTag(tagId);
                setTags((prev) => prev.filter((t) => t.id !== tagId));
            } catch (err: any) {
                setError(err.message || "Failed to delete tag");
            }
        });
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="page-title mb-1 flex items-center gap-3">
                    <Tag className="w-7 h-7 text-violet-500" />
                    Tags
                </h1>
                <p className="page-subtitle">
                    Organize subscribers with tags. Apply tags via the API or automations, then use them in segments.
                </p>
            </div>

            {/* Brand selector */}
            {brands.length > 1 && (
                <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Brand</label>
                    <div className="relative">
                        <select
                            value={selectedBrandId}
                            onChange={(e) => setSelectedBrandId(e.target.value)}
                            className="pl-3 pr-8 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none appearance-none"
                        >
                            {brands.map((b) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-4 h-4 absolute right-2.5 top-2.5 text-zinc-400 pointer-events-none" />
                    </div>
                </div>
            )}

            {/* Create tag form */}
            <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800">
                <CardContent className="p-5">
                    <form onSubmit={handleCreate} className="flex items-center gap-3">
                        <input
                            type="text"
                            value={newTagName}
                            onChange={(e) => setNewTagName(e.target.value)}
                            placeholder="New tag name (e.g. vip, trial-user, churned)"
                            className="flex-1 px-3 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm"
                        />
                        <button
                            type="submit"
                            disabled={isPending || !newTagName.trim()}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-violet-600 text-white font-medium text-sm hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        >
                            <Plus className="w-4 h-4" />
                            Add Tag
                        </button>
                    </form>
                    {error && (
                        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
                    )}
                </CardContent>
            </Card>

            {/* Tag list */}
            {loading ? (
                <div className="text-sm text-zinc-400 text-center py-8">Loading...</div>
            ) : tags.length === 0 ? (
                <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800">
                    <CardContent className="py-14 text-center">
                        <Tag className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">No tags yet</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                            Create tags above, then apply them via the API (<code className="font-mono text-xs">POST /api/v1/subscribers/:email/tags</code>) or automation steps.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {tags.map((tag) => (
                        <Card
                            key={tag.id}
                            className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 hover:shadow-sm transition-shadow"
                        >
                            <CardContent className="p-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                                        <Tag className="w-4 h-4 text-violet-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">{tag.name}</p>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                                            <Users className="w-3 h-3" />
                                            {tag._count.subscribers} subscriber{tag._count.subscribers !== 1 ? "s" : ""}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <code className="text-xs font-mono text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded select-all hidden sm:block">
                                        {tag.id}
                                    </code>
                                    <button
                                        onClick={() => handleDelete(tag.id)}
                                        disabled={isPending}
                                        className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                                        title="Delete tag"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* API reference */}
            <Card className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
                <CardContent className="p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">API Reference</h3>
                    <div className="space-y-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <div>
                            <span className="inline-block font-mono bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded px-1.5 py-0.5 mr-2">POST</span>
                            <code className="font-mono">/api/v1/subscribers/:email/tags</code>
                            <span className="ml-2">— Add a tag to a subscriber</span>
                        </div>
                        <div>
                            <span className="inline-block font-mono bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded px-1.5 py-0.5 mr-2">DELETE</span>
                            <code className="font-mono">/api/v1/subscribers/:email/tags?listId=...&tagId=...</code>
                            <span className="ml-2">— Remove a tag</span>
                        </div>
                        <div>
                            <span className="inline-block font-mono bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded px-1.5 py-0.5 mr-2">GET</span>
                            <code className="font-mono">/api/v1/tags?brandId=...</code>
                            <span className="ml-2">— List all tags</span>
                        </div>
                        <div>
                            <span className="inline-block font-mono bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded px-1.5 py-0.5 mr-2">POST</span>
                            <code className="font-mono">/api/v1/events</code>
                            <span className="ml-2">— Track an event and fire event-triggered automations</span>
                        </div>
                    </div>
                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Use <code className="font-mono">has_tag: "tag-name"</code> in segment queries to filter subscribers by tag.
                            Use <code className="font-mono">event_count: {"{"}"name": "event", "within_days": 30{"}"}</code> to filter by event history.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
