"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Clock, Mail, ArrowDown, GripVertical, Play, Pause, Loader2, Copy, Check, Webhook, Code2 } from "lucide-react";
import { addStep, updateStep, deleteStep, updateAutomation, deleteAutomation } from "@/app/actions/automation";

interface Step {
    id: string;
    order: number;
    type: string;
    delayMinutes: number | null;
    emailSubject: string | null;
    emailHtml: string | null;
}

interface AutomationBuilderProps {
    automation: {
        id: string;
        name: string;
        status: string;
        trigger: string;
        triggerListId: string | null;
        webhookSecret: string | null;
        activeCount: number;
        completedCount: number;
        steps: Step[];
        brand: { name: string; id: string; fromEmail: string | null; fromName: string | null };
        _count: { enrollments: number };
    };
    appUrl: string;
}

function formatDelay(minutes: number): string {
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
    if (minutes < 1440) {
        const h = Math.floor(minutes / 60);
        return `${h} hour${h !== 1 ? "s" : ""}`;
    }
    const d = Math.floor(minutes / 1440);
    return `${d} day${d !== 1 ? "s" : ""}`;
}

export function AutomationBuilder({ automation, appUrl }: AutomationBuilderProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [showAddStep, setShowAddStep] = useState(false);
    const [editingStepId, setEditingStepId] = useState<string | null>(null);
    const [newStepType, setNewStepType] = useState<"delay" | "email">("delay");
    const [copiedField, setCopiedField] = useState<string | null>(null);

    // Delay step state
    const [delayValue, setDelayValue] = useState(1);
    const [delayUnit, setDelayUnit] = useState<"minutes" | "hours" | "days">("hours");

    // Email step state
    const [emailSubject, setEmailSubject] = useState("");
    const [emailHtml, setEmailHtml] = useState("");

    // Edit state
    const [editDelayValue, setEditDelayValue] = useState(1);
    const [editDelayUnit, setEditDelayUnit] = useState<"minutes" | "hours" | "days">("hours");
    const [editEmailSubject, setEditEmailSubject] = useState("");
    const [editEmailHtml, setEditEmailHtml] = useState("");

    const triggerLabels: Record<string, string> = {
        subscriber_added: "Subscriber joins list",
        subscriber_confirmed: "Subscriber confirms opt-in",
        webhook: "Inbound Webhook",
        api: "API Trigger",
    };

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const webhookUrl = `${appUrl}/api/automations/${automation.id}/trigger`;
    const apiEnrollUrl = `${appUrl}/api/v1/automations/${automation.id}/enroll`;

    const getMinutes = (value: number, unit: string) => {
        if (unit === "minutes") return value;
        if (unit === "hours") return value * 60;
        return value * 1440;
    };

    const getUnitFromMinutes = (minutes: number): { value: number; unit: "minutes" | "hours" | "days" } => {
        if (minutes >= 1440 && minutes % 1440 === 0) return { value: minutes / 1440, unit: "days" };
        if (minutes >= 60 && minutes % 60 === 0) return { value: minutes / 60, unit: "hours" };
        return { value: minutes, unit: "minutes" };
    };

    const handleAddStep = () => {
        startTransition(async () => {
            if (newStepType === "delay") {
                await addStep(automation.id, { type: "delay", delayMinutes: getMinutes(delayValue, delayUnit) });
            } else {
                await addStep(automation.id, { type: "email", emailSubject, emailHtml: emailHtml || "<p>Your email content here.</p>" });
            }
            setShowAddStep(false);
            setEmailSubject("");
            setEmailHtml("");
            setDelayValue(1);
            router.refresh();
        });
    };

    const handleUpdateStep = (stepId: string) => {
        const step = automation.steps.find((s) => s.id === stepId);
        if (!step) return;

        startTransition(async () => {
            if (step.type === "delay") {
                await updateStep(stepId, { delayMinutes: getMinutes(editDelayValue, editDelayUnit) });
            } else {
                await updateStep(stepId, { emailSubject: editEmailSubject, emailHtml: editEmailHtml });
            }
            setEditingStepId(null);
            router.refresh();
        });
    };

    const handleDeleteStep = (stepId: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Delete this step?")) return;
        startTransition(async () => {
            await deleteStep(stepId);
            router.refresh();
        });
    };

    const handleToggleStatus = () => {
        const newStatus = automation.status === "active" ? "paused" : "active";
        startTransition(async () => {
            await updateAutomation(automation.id, { status: newStatus });
            router.refresh();
        });
    };

    const handleActivate = () => {
        startTransition(async () => {
            await updateAutomation(automation.id, { status: "active" });
            router.refresh();
        });
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Delete this automation and all its steps and enrollments? This cannot be undone.")) return;
        startTransition(async () => {
            await deleteAutomation(automation.id);
            router.push("/dashboard/automations");
        });
    };

    const startEditing = (step: Step) => {
        setEditingStepId(step.id);
        if (step.type === "delay" && step.delayMinutes) {
            const parsed = getUnitFromMinutes(step.delayMinutes);
            setEditDelayValue(parsed.value);
            setEditDelayUnit(parsed.unit);
        }
        if (step.type === "email") {
            setEditEmailSubject(step.emailSubject || "");
            setEditEmailHtml(step.emailHtml || "");
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800">
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-zinc-900 dark:text-white">{automation.steps.length}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">Steps</div>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800">
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{automation.activeCount}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">Active</div>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800">
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{automation.completedCount}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">Completed</div>
                    </CardContent>
                </Card>
            </div>

            {/* Visual Workflow */}
            <div className="relative">
                {/* Trigger node */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    </div>
                    <div className="flex-1 p-4 rounded-lg border-2 border-dashed border-yellow-500/30 bg-yellow-500/5">
                        <div className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">Trigger</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {triggerLabels[automation.trigger]} • {automation.brand.name}
                        </div>
                    </div>
                </div>

                {/* Webhook trigger info */}
                {automation.trigger === "webhook" && automation.webhookSecret && (
                    <div className="flex items-start gap-3 mt-3">
                        <div className="w-10 flex-shrink-0" />
                        <div className="flex-1 p-4 rounded-lg border border-purple-200 dark:border-purple-800/50 bg-purple-50 dark:bg-purple-950/20 space-y-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-purple-800 dark:text-purple-300">
                                <Webhook className="w-4 h-4" />
                                Webhook Endpoint
                            </div>
                            <div>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">POST URL</p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1.5 text-zinc-800 dark:text-zinc-200 truncate">
                                        {webhookUrl}
                                    </code>
                                    <button onClick={() => copyToClipboard(webhookUrl, "url")} className="p-1.5 rounded hover:bg-purple-100 dark:hover:bg-purple-900/30 text-zinc-500 hover:text-purple-700 dark:hover:text-purple-300 flex-shrink-0">
                                        {copiedField === "url" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Bearer Token (Authorization header)</p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1.5 text-zinc-800 dark:text-zinc-200 truncate font-mono">
                                        {automation.webhookSecret}
                                    </code>
                                    <button onClick={() => copyToClipboard(automation.webhookSecret!, "secret")} className="p-1.5 rounded hover:bg-purple-100 dark:hover:bg-purple-900/30 text-zinc-500 hover:text-purple-700 dark:hover:text-purple-300 flex-shrink-0">
                                        {copiedField === "secret" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded p-2 font-mono whitespace-pre-wrap break-all">
                                {[
                                    "# Example request",
                                    "curl -X POST \\",
                                    '  -H "Authorization: Bearer <token>" \\',
                                    '  -H "Content-Type: application/json" \\',
                                    "  -d '{\"email\":\"user@example.com\",\"name\":\"Alice\"}' \\",
                                    "  " + webhookUrl,
                                ].join("\n")}
                            </div>
                        </div>
                    </div>
                )}

                {/* API trigger info */}
                {automation.trigger === "api" && (
                    <div className="flex items-start gap-3 mt-3">
                        <div className="w-10 flex-shrink-0" />
                        <div className="flex-1 p-4 rounded-lg border border-sky-200 dark:border-sky-800/50 bg-sky-50 dark:bg-sky-950/20 space-y-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-sky-800 dark:text-sky-300">
                                <Code2 className="w-4 h-4" />
                                API Enroll Endpoint
                            </div>
                            <div>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">POST URL</p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1.5 text-zinc-800 dark:text-zinc-200 truncate">
                                        {apiEnrollUrl}
                                    </code>
                                    <button onClick={() => copyToClipboard(apiEnrollUrl, "apiUrl")} className="p-1.5 rounded hover:bg-sky-100 dark:hover:bg-sky-900/30 text-zinc-500 hover:text-sky-700 dark:hover:text-sky-300 flex-shrink-0">
                                        {copiedField === "apiUrl" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded p-2 font-mono whitespace-pre-wrap break-all">
                                {[
                                    "# Authenticate with your API key (Settings → API)",
                                    "curl -X POST \\",
                                    '  -H "x-api-key: <your-api-key>" \\',
                                    '  -H "Content-Type: application/json" \\',
                                    "  -d '{\"email\":\"user@example.com\",\"name\":\"Alice\"}' \\",
                                    "  " + apiEnrollUrl,
                                ].join("\n")}
                            </div>
                        </div>
                    </div>
                )}

                {/* Steps */}
                {automation.steps.map((step, i) => (
                    <div key={step.id}>
                        {/* Connector line */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 flex justify-center">
                                <div className="w-0.5 h-8 bg-zinc-300 dark:bg-zinc-700" />
                            </div>
                        </div>

                        {/* Step node */}
                        <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${step.type === "delay"
                                ? "bg-blue-500/10"
                                : "bg-indigo-500/10"
                                }`}>
                                {step.type === "delay" ? (
                                    <Clock className="w-5 h-5 text-blue-500" />
                                ) : (
                                    <Mail className="w-5 h-5 text-indigo-500" />
                                )}
                            </div>
                            <div className="flex-1">
                                {editingStepId === step.id ? (
                                    <Card className="border-blue-500/30 bg-blue-500/5 dark:bg-blue-500/5 border-zinc-200 dark:border-zinc-700">
                                        <CardContent className="p-4 space-y-3">
                                            {step.type === "delay" ? (
                                                <div className="flex items-center gap-3">
                                                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Wait</label>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={editDelayValue}
                                                        onChange={(e) => setEditDelayValue(parseInt(e.target.value) || 1)}
                                                        className="w-20 px-2 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm"
                                                    />
                                                    <select
                                                        value={editDelayUnit}
                                                        onChange={(e) => setEditDelayUnit(e.target.value as any)}
                                                        className="px-2 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm"
                                                    >
                                                        <option value="minutes">Minutes</option>
                                                        <option value="hours">Hours</option>
                                                        <option value="days">Days</option>
                                                    </select>
                                                </div>
                                            ) : (
                                                <>
                                                    <div>
                                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Subject</label>
                                                        <input
                                                            type="text"
                                                            value={editEmailSubject}
                                                            onChange={(e) => setEditEmailSubject(e.target.value)}
                                                            className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">HTML Content</label>
                                                        <textarea
                                                            value={editEmailHtml}
                                                            onChange={(e) => setEditEmailHtml(e.target.value)}
                                                            rows={6}
                                                            className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm font-mono"
                                                        />
                                                    </div>
                                                </>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleUpdateStep(step.id)}
                                                    disabled={isPending}
                                                    className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                                                >
                                                    {isPending ? "Saving..." : "Save"}
                                                </button>
                                                <button
                                                    onClick={() => setEditingStepId(null)}
                                                    className="px-3 py-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-sm"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50 hover:shadow-sm transition-shadow group">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                                                        <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                                                            {i + 1}
                                                        </span>
                                                        {step.type === "delay" ? (
                                                            <>Wait {formatDelay(step.delayMinutes || 0)}</>
                                                        ) : (
                                                            <>Send email: {step.emailSubject || "(no subject)"}</>
                                                        )}
                                                    </div>
                                                    {step.type === "email" && step.emailHtml && (
                                                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate max-w-md">
                                                            {step.emailHtml.replace(/<[^>]*>/g, "").slice(0, 80)}...
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => startEditing(step)}
                                                        className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-xs"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleDeleteStep(step.id, e)}
                                                        className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Add Step */}
                <div className="flex items-center gap-3">
                    <div className="w-10 flex justify-center">
                        <div className="w-0.5 h-8 bg-zinc-300 dark:bg-zinc-700" />
                    </div>
                </div>

                {showAddStep ? (
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-1">
                            <Plus className="w-5 h-5 text-zinc-400" />
                        </div>
                        <Card className="flex-1 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950/50">
                            <CardContent className="p-4 space-y-4">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setNewStepType("delay")}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${newStepType === "delay"
                                            ? "bg-blue-600 text-white"
                                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                                            }`}
                                    >
                                        <Clock className="w-3.5 h-3.5 inline mr-1.5" />
                                        Wait / Delay
                                    </button>
                                    <button
                                        onClick={() => setNewStepType("email")}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${newStepType === "email"
                                            ? "bg-indigo-600 text-white"
                                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                                            }`}
                                    >
                                        <Mail className="w-3.5 h-3.5 inline mr-1.5" />
                                        Send Email
                                    </button>
                                </div>

                                {newStepType === "delay" ? (
                                    <div className="flex items-center gap-3">
                                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Wait</label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={delayValue}
                                            onChange={(e) => setDelayValue(parseInt(e.target.value) || 1)}
                                            className="w-20 px-2 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm"
                                        />
                                        <select
                                            value={delayUnit}
                                            onChange={(e) => setDelayUnit(e.target.value as any)}
                                            className="px-2 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm"
                                        >
                                            <option value="minutes">Minutes</option>
                                            <option value="hours">Hours</option>
                                            <option value="days">Days</option>
                                        </select>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Subject</label>
                                            <input
                                                type="text"
                                                value={emailSubject}
                                                onChange={(e) => setEmailSubject(e.target.value)}
                                                placeholder="Email subject line"
                                                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">HTML Content</label>
                                            <textarea
                                                value={emailHtml}
                                                onChange={(e) => setEmailHtml(e.target.value)}
                                                rows={6}
                                                placeholder="<p>Hi [Name],</p><p>Your email content here...</p>"
                                                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm font-mono"
                                            />
                                            <p className="text-xs text-zinc-500 mt-1">
                                                Supports placeholders: [Name], [Email], [Unsubscribe]
                                            </p>
                                        </div>
                                    </>
                                )}

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleAddStep}
                                        disabled={isPending || (newStepType === "email" && !emailSubject.trim())}
                                        className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isPending ? "Adding..." : "Add Step"}
                                    </button>
                                    <button
                                        onClick={() => setShowAddStep(false)}
                                        className="px-4 py-2 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <div className="w-10 flex justify-center">
                            <button
                                onClick={() => setShowAddStep(true)}
                                className="w-10 h-10 rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center hover:border-blue-500 hover:bg-blue-500/5 transition-colors group"
                            >
                                <Plus className="w-5 h-5 text-zinc-400 group-hover:text-blue-500 transition-colors" />
                            </button>
                        </div>
                        <span className="text-sm text-zinc-400 dark:text-zinc-500">Add a step</span>
                    </div>
                )}

                {/* End node */}
                <div className="flex items-center gap-3 mt-2">
                    <div className="w-10 flex justify-center">
                        <div className="w-0.5 h-6 bg-zinc-300 dark:bg-zinc-700" />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                        <div className="w-3 h-3 rounded-full bg-zinc-400" />
                    </div>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Automation Complete</span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                {automation.status === "draft" && automation.steps.length > 0 && (
                    <button
                        onClick={handleActivate}
                        disabled={isPending}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-medium text-sm disabled:opacity-50"
                    >
                        <Play className="w-4 h-4" /> Activate
                    </button>
                )}
                {automation.status !== "draft" && (
                    <button
                        onClick={handleToggleStatus}
                        disabled={isPending}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 ${automation.status === "active"
                            ? "bg-yellow-600 text-white hover:bg-yellow-700"
                            : "bg-green-600 text-white hover:bg-green-700"
                            }`}
                    >
                        {automation.status === "active" ? (
                            <><Pause className="w-4 h-4" /> Pause</>
                        ) : (
                            <><Play className="w-4 h-4" /> Resume</>
                        )}
                    </button>
                )}
                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isPending}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 font-medium text-sm transition-colors disabled:opacity-50"
                >
                    <Trash2 className="w-4 h-4" /> Delete Automation
                </button>
            </div>
        </div>
    );
}
