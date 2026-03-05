"use client";

import { useState } from "react";
import { createSegment, deleteSegment, previewSegment } from "@/app/actions/segment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, Eye, EyeOff, Loader2, Users2, Info } from "lucide-react";

const QUERY_EXAMPLES = [
    { label: "All subscribed", query: '{"status": "subscribed"}' },
    { label: "By custom field", query: '{"Country": "India"}' },
    { label: "Multiple fields", query: '{"Country": "India", "City": "Bangalore"}' },
    { label: "By name pattern", query: '{"name": {"contains": "john"}}' },
    { label: "No GDPR consent", query: '{"hasConfirmedGdpr": false}' },
    { label: "Joined after date", query: '{"createdAt": {"gte": "2026-01-01"}}' },
];

export function SegmentsManager({ listId, segments, customFields = [] }: { listId: string, segments: any[], customFields?: any[] }) {
    const [name, setName] = useState("");
    const [query, setQuery] = useState('{"status": "subscribed"}');
    const [isLoading, setIsLoading] = useState(false);
    const [previewData, setPreviewData] = useState<Record<string, any>>({});
    const [loadingPreview, setLoadingPreview] = useState<string | null>(null);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!name || !query) return;

        try {
            JSON.parse(query);
        } catch {
            alert("Invalid JSON Query Format");
            return;
        }

        setIsLoading(true);
        try {
            await createSegment({ listId, name, query });
            setName("");
            setQuery('{"status": "subscribed"}');
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsLoading(false);
        }
    }

    async function handlePreview(segmentId: string) {
        if (previewData[segmentId]) {
            setPreviewData(prev => {
                const next = { ...prev };
                delete next[segmentId];
                return next;
            });
            return;
        }

        setLoadingPreview(segmentId);
        try {
            const result = await previewSegment(segmentId, listId);
            setPreviewData(prev => ({ ...prev, [segmentId]: result }));
        } catch (error: any) {
            alert(error.message || "Failed to preview segment");
        } finally {
            setLoadingPreview(null);
        }
    }

    return (
        <div className="space-y-6">
            <form onSubmit={handleCreate} className="flex flex-col gap-4 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="grid gap-2 flex-1">
                    <label className="text-sm font-medium">Segment Name</label>
                    <Input placeholder="e.g., Indian Subscribers" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="grid gap-2 flex-1">
                    <label className="text-sm font-medium">Query (JSON)</label>
                    <Input
                        placeholder='{"Country": "India"}'
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        required
                        className="font-mono text-sm"
                    />
                </div>

                {/* Available fields reference */}
                <details className="border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950/50">
                    <summary className="px-4 py-3 cursor-pointer text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2">
                        <Info className="w-4 h-4" /> Available fields & examples
                    </summary>
                    <div className="px-4 pb-4 space-y-4">
                        {/* Built-in fields */}
                        <div>
                            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Built-in subscriber fields:</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                                {[
                                    { field: "email", desc: "Email address" },
                                    { field: "name", desc: "Subscriber name" },
                                    { field: "status", desc: "subscribed / unsubscribed / bounced" },
                                    { field: "hasConfirmedGdpr", desc: "GDPR consent (true/false)" },
                                    { field: "createdAt", desc: "Join date" },
                                ].map(f => (
                                    <div key={f.field} className="flex items-start gap-1.5">
                                        <code className="bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">{f.field}</code>
                                        <span className="text-zinc-500">{f.desc}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Custom fields */}
                        {customFields.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Your custom fields (auto-detected):</p>
                                <div className="flex flex-wrap gap-1.5 text-xs">
                                    {customFields.map((cf: any) => (
                                        <code key={cf.id} className="bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded">{cf.name}</code>
                                    ))}
                                </div>
                                <p className="text-xs text-zinc-400 mt-1.5">
                                    Use custom field names directly — they're auto-translated to the correct query format.
                                </p>
                            </div>
                        )}

                        {/* Query examples */}
                        <div>
                            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Example queries (click to use):</p>
                            <div className="grid gap-1.5">
                                {QUERY_EXAMPLES.map((ex, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setQuery(ex.query)}
                                        className="flex items-center gap-3 text-xs text-left px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
                                    >
                                        <span className="text-zinc-500 w-28 shrink-0">{ex.label}</span>
                                        <code className="text-zinc-700 dark:text-zinc-300 font-mono">{ex.query}</code>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </details>

                <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto self-start mt-2">
                    <Plus className="w-4 h-4 mr-2" /> Create Segment
                </Button>
            </form>

            <div className="space-y-3">
                {segments.length === 0 ? (
                    <div className="text-center text-zinc-500 py-8 border border-zinc-200 dark:border-zinc-800 rounded-md">
                        No segments created yet.
                    </div>
                ) : segments.map((segment) => (
                    <div key={segment.id} className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-950/50">
                            <div className="min-w-0 flex-1">
                                <h4 className="font-medium text-zinc-900 dark:text-white">{segment.name}</h4>
                                <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400 truncate mt-1">{segment.query}</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 ml-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePreview(segment.id)}
                                    disabled={loadingPreview === segment.id}
                                    className="text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 gap-1.5"
                                >
                                    {loadingPreview === segment.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : previewData[segment.id] ? (
                                        <EyeOff className="w-4 h-4" />
                                    ) : (
                                        <Eye className="w-4 h-4" />
                                    )}
                                    <span className="hidden sm:inline text-xs">
                                        {previewData[segment.id] ? "Hide" : "Preview"}
                                    </span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteSegment(segment.id, listId)}
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {previewData[segment.id] && (
                            <div className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="px-4 py-3 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Users2 className="w-4 h-4 text-blue-500" />
                                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                            {previewData[segment.id].total} subscriber{previewData[segment.id].total !== 1 ? "s" : ""} match
                                        </span>
                                        {previewData[segment.id].total > 100 && (
                                            <span className="text-zinc-400 text-xs">(showing first 100)</span>
                                        )}
                                    </div>
                                </div>

                                {previewData[segment.id].subscribers.length === 0 ? (
                                    <div className="px-4 py-6 text-center text-sm text-zinc-500">
                                        No subscribers match this segment.
                                    </div>
                                ) : (
                                    <div className="max-h-80 overflow-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-zinc-100 dark:bg-zinc-800/50 sticky top-0">
                                                <tr>
                                                    <th className="text-left px-4 py-2 font-medium text-zinc-600 dark:text-zinc-400">Email</th>
                                                    <th className="text-left px-4 py-2 font-medium text-zinc-600 dark:text-zinc-400">Name</th>
                                                    <th className="text-left px-4 py-2 font-medium text-zinc-600 dark:text-zinc-400">Status</th>
                                                    {customFields.length > 0 && customFields.map((cf: any) => (
                                                        <th key={cf.id} className="text-left px-4 py-2 font-medium text-zinc-600 dark:text-zinc-400">{cf.name}</th>
                                                    ))}
                                                    <th className="text-left px-4 py-2 font-medium text-zinc-600 dark:text-zinc-400">Joined</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                                {previewData[segment.id].subscribers.map((sub: any) => (
                                                    <tr key={sub.id} className="hover:bg-white dark:hover:bg-zinc-900/50">
                                                        <td className="px-4 py-2 text-zinc-900 dark:text-white">{sub.email}</td>
                                                        <td className="px-4 py-2 text-zinc-500">{sub.name || "—"}</td>
                                                        <td className="px-4 py-2">
                                                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${sub.status === "subscribed" ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400" :
                                                                    sub.status === "unsubscribed" ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500" :
                                                                        "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                                                                }`}>{sub.status}</span>
                                                        </td>
                                                        {customFields.length > 0 && customFields.map((cf: any) => (
                                                            <td key={cf.id} className="px-4 py-2 text-zinc-500 text-xs">{sub.customFields?.[cf.name] || "—"}</td>
                                                        ))}
                                                        <td className="px-4 py-2 text-zinc-400 text-xs">{new Date(sub.createdAt).toLocaleDateString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
