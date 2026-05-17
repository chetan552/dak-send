"use client";

import { useState, useTransition } from "react";
import { createWebhook, toggleWebhook, deleteWebhook, testWebhook } from "@/app/actions/webhook";
import { Webhook, Plus, Trash2, Zap, ZapOff, Send, CheckCircle, XCircle, Globe, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const EVENTS = [
    { value: "subscribe", label: "Subscribe" },
    { value: "unsubscribe", label: "Unsubscribe" },
    { value: "open", label: "Email Open" },
    { value: "click", label: "Link Click" },
    { value: "bounce", label: "Bounce" },
    { value: "complaint", label: "Complaint" },
];

interface WebhooksManagerProps {
    webhooks: any[];
    brands: { id: string; name: string }[];
}

export function WebhooksManager({ webhooks: initialWebhooks, brands }: WebhooksManagerProps) {
    const [isPending, startTransition] = useTransition();
    const [showForm, setShowForm] = useState(false);
    const [testResult, setTestResult] = useState<Record<string, { ok: boolean; status: number } | null>>({});
    const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});

    // Form fields
    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    const [brandId, setBrandId] = useState(brands.length === 1 ? brands[0].id : "");
    const [selectedEvents, setSelectedEvents] = useState<string[]>(["subscribe"]);
    const [error, setError] = useState("");

    const toggleEvent = (ev: string) => {
        setSelectedEvents(prev =>
            prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]
        );
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!name || !url || !brandId || selectedEvents.length === 0) {
            setError("All fields are required, select at least one event.");
            return;
        }

        startTransition(async () => {
            try {
                await createWebhook({ name, url, events: selectedEvents, brandId });
                setShowForm(false);
                setName(""); setUrl(""); setSelectedEvents(["subscribe"]);
            } catch (err: any) {
                setError(err.message);
            }
        });
    };

    const handleTest = (id: string) => {
        startTransition(async () => {
            try {
                const result = await testWebhook(id);
                setTestResult(prev => ({ ...prev, [id]: result }));
                setTimeout(() => setTestResult(prev => ({ ...prev, [id]: null })), 5000);
            } catch {
                setTestResult(prev => ({ ...prev, [id]: { ok: false, status: 0 } }));
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <Globe className="w-5 h-5 text-zinc-500 dark:text-zinc-400" /> Outgoing Webhooks
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        Send HTTP callbacks to external services like Zapier, n8n, or Make.
                    </p>
                </div>
                <Button onClick={() => setShowForm(!showForm)} className="gap-2">
                    <Plus className="w-4 h-4" /> Add Webhook
                </Button>
            </div>

            {showForm && (
                <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 animate-in fade-in slide-in-from-top-2 duration-200">
                    <CardContent className="p-5">
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Name</label>
                                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Zapier — New Subscriber" className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-transparent outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Brand</label>
                                    <select value={brandId} onChange={e => setBrandId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-transparent outline-none">
                                        <option value="">Select brand...</option>
                                        {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Endpoint URL</label>
                                <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://hooks.zapier.com/..." className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-primary/20 focus:border-transparent outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">Events</label>
                                <div className="flex flex-wrap gap-2">
                                    {EVENTS.map(ev => (
                                        <button key={ev.value} type="button" onClick={() => toggleEvent(ev.value)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedEvents.includes(ev.value) ? "bg-primary text-primary-foreground" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"}`}>
                                            {ev.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {error && <div className="p-2 rounded-lg bg-red-500/10 text-red-600 text-sm">{error}</div>}
                            <div className="flex gap-2">
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? "Creating..." : "Create Webhook"}
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {initialWebhooks.length === 0 && !showForm ? (
                <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800">
                    <CardContent className="py-12 text-center">
                        <Webhook className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">No webhooks configured yet.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {initialWebhooks.map((wh: any, i: number) => (
                        <Card key={wh.id} className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${i * 30}ms`, animationFillMode: "both" }}>
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-sm text-zinc-900 dark:text-white truncate">{wh.name}</h3>
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${wh.active ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-zinc-500/10 text-zinc-500"}`}>
                                                {wh.active ? "Active" : "Paused"}
                                            </span>
                                        </div>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono truncate mb-2">{wh.url}</p>
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            {wh.events.map((ev: string) => (
                                                <span key={ev} className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-medium text-zinc-600 dark:text-zinc-400">{ev}</span>
                                            ))}
                                        </div>
                                        {wh.secret && (
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-zinc-400 font-medium">Secret:</span>
                                                <code className="text-[10px] text-zinc-500 font-mono">{showSecret[wh.id] ? wh.secret : "••••••••••••"}</code>
                                                <button onClick={() => setShowSecret(prev => ({ ...prev, [wh.id]: !prev[wh.id] }))} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                                                    {showSecret[wh.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        {testResult[wh.id] && (
                                            <span className={`text-xs font-medium ${testResult[wh.id]!.ok ? "text-emerald-500" : "text-red-500"}`}>
                                                {testResult[wh.id]!.ok ? <CheckCircle className="w-4 h-4 inline" /> : <XCircle className="w-4 h-4 inline" />}
                                            </span>
                                        )}
                                        <button onClick={() => handleTest(wh.id)} disabled={isPending} title="Test" className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50">
                                            <Send className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => startTransition(() => toggleWebhook(wh.id))} disabled={isPending} title={wh.active ? "Pause" : "Activate"} className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50">
                                            {wh.active ? <ZapOff className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                                        </button>
                                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (confirm("Delete this webhook?")) startTransition(() => deleteWebhook(wh.id)); }} disabled={isPending} title="Delete" className="p-1.5 rounded-md border border-red-200 dark:border-red-800/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
