"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createAutomation } from "@/app/actions/automation";

interface Brand {
    id: string;
    name: string;
    lists: { id: string; name: string }[];
}

export function NewAutomationForm({ brands }: { brands: Brand[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [name, setName] = useState("");
    const [brandId, setBrandId] = useState(brands[0]?.id || "");
    const [trigger, setTrigger] = useState("subscriber_added");
    const [triggerListId, setTriggerListId] = useState("");
    const [triggerEventName, setTriggerEventName] = useState("");
    const [error, setError] = useState("");

    const selectedBrand = brands.find((b) => b.id === brandId);
    const lists = selectedBrand?.lists || [];

    const requiresListTrigger = trigger === "subscriber_added" || trigger === "subscriber_confirmed";
    const requiresEventName = trigger === "event";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!name.trim()) { setError("Name is required"); return; }
        if (!brandId) { setError("Select a brand"); return; }
        if (requiresListTrigger && !triggerListId) { setError("Select a trigger list"); return; }
        if (requiresEventName && !triggerEventName.trim()) { setError("Event name is required"); return; }

        startTransition(async () => {
            try {
                const automation = await createAutomation({
                    name,
                    brandId,
                    trigger,
                    triggerListId: requiresListTrigger ? triggerListId : undefined,
                    triggerEventName: requiresEventName ? triggerEventName.trim() : undefined,
                });
                router.push(`/dashboard/automations/${automation.id}`);
            } catch (err: any) {
                setError(err.message || "Failed to create automation");
            }
        });
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400 mb-2">
                <Link href="/dashboard/automations" className="hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Automations
                </Link>
            </div>

            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-1 flex items-center gap-3">
                    <Zap className="w-7 h-7 text-yellow-500" />
                    New Automation
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Set up the trigger and target list for your drip campaign.
                </p>
            </div>

            <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800">
                <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                Automation Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Welcome Series, Onboarding Drip"
                                className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                Brand
                            </label>
                            <select
                                value={brandId}
                                onChange={(e) => { setBrandId(e.target.value); setTriggerListId(""); }}
                                className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            >
                                <option value="">Select a brand...</option>
                                {brands.map((b) => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                Trigger
                            </label>
                            <select
                                value={trigger}
                                onChange={(e) => { setTrigger(e.target.value); setTriggerListId(""); setTriggerEventName(""); }}
                                className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            >
                                <option value="subscriber_added">Subscriber joins list (single opt-in)</option>
                                <option value="subscriber_confirmed">Subscriber confirms opt-in (double opt-in)</option>
                                <option value="webhook">Inbound Webhook — external system POSTs to a unique URL</option>
                                <option value="api">API Trigger — enroll via REST API using your API key</option>
                                <option value="event">Event Trigger — fires when a named event is tracked via API</option>
                            </select>
                            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                Choose when this automation should start for each subscriber.
                            </p>
                        </div>

                        {requiresListTrigger && (
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                Trigger List
                            </label>
                            <select
                                value={triggerListId}
                                onChange={(e) => setTriggerListId(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            >
                                <option value="">Select a list...</option>
                                {lists.map((l) => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                            </select>
                            {lists.length === 0 && brandId && (
                                <p className="mt-1.5 text-xs text-yellow-600 dark:text-yellow-400">
                                    No lists found for this brand. Create a list first.
                                </p>
                            )}
                        </div>
                        )}

                        {requiresEventName && (
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                Event Name
                            </label>
                            <input
                                type="text"
                                value={triggerEventName}
                                onChange={(e) => setTriggerEventName(e.target.value)}
                                placeholder="e.g. placed_order, completed_onboarding"
                                className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                This automation fires when an event with this exact name is sent to{" "}
                                <code className="font-mono">POST /api/v1/events</code>.
                            </p>
                        </div>
                        )}

                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full py-2.5 px-4 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isPending ? "Creating..." : "Create Automation"}
                        </button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
