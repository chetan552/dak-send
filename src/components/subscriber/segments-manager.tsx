"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSegment, deleteSegment, previewSegment, previewSegmentQuery } from "@/app/actions/segment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, Eye, EyeOff, Loader2, Users2, Info, X } from "lucide-react";

// ── Field & operator definitions ────────────────────────────────────────────

type FieldType = "string" | "enum" | "boolean" | "date" | "tag" | "event";

type FieldOption = {
    value: string;       // "email", "status", "cf:Country", "has_tag", "event_count"
    label: string;
    type: FieldType;
    enumOptions?: string[];
};

const BUILT_IN_FIELDS: FieldOption[] = [
    { value: "email", label: "Email", type: "string" },
    { value: "name", label: "Name", type: "string" },
    { value: "status", label: "Status", type: "enum", enumOptions: ["subscribed", "unsubscribed", "bounced", "complained"] },
    { value: "hasConfirmedGdpr", label: "GDPR consent", type: "boolean" },
    { value: "createdAt", label: "Join date", type: "date" },
    { value: "has_tag", label: "Has tag", type: "tag" },
    { value: "event_count", label: "Triggered event", type: "event" },
];

const OPS_BY_TYPE: Record<FieldType, { value: string; label: string }[]> = {
    string: [
        { value: "equals", label: "is" },
        { value: "not_equals", label: "is not" },
        { value: "contains", label: "contains" },
        { value: "starts_with", label: "starts with" },
        { value: "ends_with", label: "ends with" },
    ],
    enum: [
        { value: "equals", label: "is" },
        { value: "not_equals", label: "is not" },
    ],
    boolean: [
        { value: "is_true", label: "is true" },
        { value: "is_false", label: "is false" },
    ],
    date: [
        { value: "after", label: "on or after" },
        { value: "before", label: "before" },
    ],
    tag: [{ value: "equals", label: "is" }],
    event: [{ value: "equals", label: "triggered" }],
};

// ── Rule shape ──────────────────────────────────────────────────────────────

type Rule = {
    id: string;
    field: string;
    operator: string;
    value: string;
    eventWithinDays?: number;
};

type Combinator = "AND" | "OR";

function newRule(): Rule {
    return { id: Math.random().toString(36).slice(2), field: "email", operator: "contains", value: "" };
}

// ── Serialize a single rule to a JSON fragment ──────────────────────────────

function ruleToFragment(rule: Rule): Record<string, any> | null {
    // Special fields
    if (rule.field === "has_tag") {
        if (!rule.value.trim()) return null;
        return { has_tag: rule.value.trim() };
    }
    if (rule.field === "event_count") {
        if (!rule.value.trim()) return null;
        return {
            event_count: {
                name: rule.value.trim(),
                within_days: rule.eventWithinDays ?? 30,
            },
        };
    }

    const fieldKey = rule.field.startsWith("cf:") ? rule.field.slice(3) : rule.field;

    // Boolean operators don't need a value
    if (rule.operator === "is_true") return { [fieldKey]: true };
    if (rule.operator === "is_false") return { [fieldKey]: false };

    if (!rule.value.trim() && rule.operator !== "is_true" && rule.operator !== "is_false") return null;

    const v = rule.value;
    switch (rule.operator) {
        case "equals":
            return { [fieldKey]: v };
        case "not_equals":
            return { [fieldKey]: { not: v } };
        case "contains":
            return { [fieldKey]: { contains: v } };
        case "starts_with":
            return { [fieldKey]: { startsWith: v } };
        case "ends_with":
            return { [fieldKey]: { endsWith: v } };
        case "after":
            return { [fieldKey]: { gte: new Date(v).toISOString() } };
        case "before":
            return { [fieldKey]: { lt: new Date(v).toISOString() } };
        default:
            return null;
    }
}

function rulesToJson(rules: Rule[], combinator: Combinator): string {
    const fragments = rules.map(ruleToFragment).filter((f): f is Record<string, any> => f !== null);
    if (fragments.length === 0) return "{}";
    if (fragments.length === 1) return JSON.stringify(fragments[0]);
    if (combinator === "OR") return JSON.stringify({ OR: fragments });
    // AND: if all keys are distinct, merge into a flat object; otherwise wrap in AND
    const allKeys = fragments.flatMap(f => Object.keys(f));
    const hasDup = new Set(allKeys).size !== allKeys.length;
    if (hasDup) return JSON.stringify({ AND: fragments });
    return JSON.stringify(Object.assign({}, ...fragments));
}

// ── JSON examples for Advanced tab ──────────────────────────────────────────

const QUERY_EXAMPLES = [
    { label: "All subscribed", query: '{"status": "subscribed"}' },
    { label: "By custom field", query: '{"Country": "India"}' },
    { label: "Multiple fields", query: '{"Country": "India", "City": "Bangalore"}' },
    { label: "By name pattern", query: '{"name": {"contains": "john"}}' },
    { label: "Either-or", query: '{"OR": [{"Country": "India"}, {"Country": "USA"}]}' },
    { label: "Has tag", query: '{"has_tag": "vip"}' },
];

// ────────────────────────────────────────────────────────────────────────────

export function SegmentsManager({
    listId,
    segments,
    customFields = [],
}: {
    listId: string;
    segments: any[];
    customFields?: any[];
}) {
    const fieldOptions: FieldOption[] = useMemo(
        () => [
            ...BUILT_IN_FIELDS,
            ...customFields.map((cf: any) => ({
                value: `cf:${cf.name}`,
                label: `${cf.name} (custom)`,
                type: "string" as const,
            })),
        ],
        [customFields]
    );

    const fieldByValue = useMemo(() => {
        const map = new Map<string, FieldOption>();
        for (const f of fieldOptions) map.set(f.value, f);
        return map;
    }, [fieldOptions]);

    const [activeTab, setActiveTab] = useState<"builder" | "advanced">("builder");
    const [name, setName] = useState("");
    const [combinator, setCombinator] = useState<Combinator>("AND");
    const [rules, setRules] = useState<Rule[]>([newRule()]);
    const [rawQuery, setRawQuery] = useState('{"status": "subscribed"}');
    const [isLoading, setIsLoading] = useState(false);

    // Live preview state
    const [previewCount, setPreviewCount] = useState<number | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const previewSeqRef = useRef(0);

    // Existing-segment preview state
    const [previewData, setPreviewData] = useState<Record<string, any>>({});
    const [loadingPreview, setLoadingPreview] = useState<string | null>(null);

    // The JSON we'd submit, based on active tab
    const currentJson = useMemo(() => {
        if (activeTab === "builder") return rulesToJson(rules, combinator);
        return rawQuery;
    }, [activeTab, rules, combinator, rawQuery]);

    // Debounced live preview
    useEffect(() => {
        const seq = ++previewSeqRef.current;
        setPreviewError(null);

        // Validate JSON before hitting the server
        try {
            const parsed = JSON.parse(currentJson);
            if (!parsed || (typeof parsed === "object" && Object.keys(parsed).length === 0)) {
                setPreviewCount(null);
                setPreviewLoading(false);
                return;
            }
        } catch {
            setPreviewError("Invalid JSON");
            setPreviewCount(null);
            setPreviewLoading(false);
            return;
        }

        setPreviewLoading(true);
        const timer = setTimeout(async () => {
            try {
                const result = await previewSegmentQuery(listId, currentJson);
                if (previewSeqRef.current !== seq) return;
                setPreviewCount(result.total);
                setPreviewError(null);
            } catch (err: any) {
                if (previewSeqRef.current !== seq) return;
                setPreviewError(err?.message || "Preview failed");
                setPreviewCount(null);
            } finally {
                if (previewSeqRef.current === seq) setPreviewLoading(false);
            }
        }, 350);

        return () => clearTimeout(timer);
    }, [currentJson, listId]);

    function updateRule(id: string, patch: Partial<Rule>) {
        setRules(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
    }

    function changeRuleField(id: string, newField: string) {
        const fieldOpt = fieldByValue.get(newField);
        if (!fieldOpt) return;
        // Reset operator + value when field type changes
        const defaultOp = OPS_BY_TYPE[fieldOpt.type][0]?.value || "equals";
        const defaultValue = fieldOpt.type === "enum" && fieldOpt.enumOptions ? fieldOpt.enumOptions[0] : "";
        updateRule(id, { field: newField, operator: defaultOp, value: defaultValue });
    }

    function addRule() {
        setRules(prev => [...prev, newRule()]);
    }

    function removeRule(id: string) {
        setRules(prev => (prev.length === 1 ? prev : prev.filter(r => r.id !== id)));
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) {
            alert("Please give the segment a name.");
            return;
        }

        const queryToSave = currentJson;

        try {
            JSON.parse(queryToSave);
        } catch {
            alert("The query is not valid JSON.");
            return;
        }

        if (queryToSave === "{}") {
            alert("Add at least one condition before creating the segment.");
            return;
        }

        setIsLoading(true);
        try {
            await createSegment({ listId, name, query: queryToSave });
            setName("");
            setRules([newRule()]);
            setCombinator("AND");
            setRawQuery('{"status": "subscribed"}');
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
            <form
                onSubmit={handleCreate}
                className="flex flex-col gap-4 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800"
            >
                <div className="grid gap-2">
                    <label className="text-sm font-medium">Segment Name</label>
                    <Input
                        placeholder="e.g., Indian Subscribers"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                    />
                </div>

                <Tabs value={activeTab} onValueChange={v => setActiveTab(v as "builder" | "advanced")}>
                    <TabsList>
                        <TabsTrigger value="builder">Builder</TabsTrigger>
                        <TabsTrigger value="advanced">Advanced (JSON)</TabsTrigger>
                    </TabsList>

                    <TabsContent value="builder" className="space-y-3 pt-2">
                        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                            <span>Match</span>
                            <Select value={combinator} onValueChange={v => setCombinator(v as Combinator)}>
                                <SelectTrigger size="sm" className="w-24">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="AND">all</SelectItem>
                                    <SelectItem value="OR">any</SelectItem>
                                </SelectContent>
                            </Select>
                            <span>of the following conditions:</span>
                        </div>

                        <div className="space-y-2">
                            {rules.map(rule => {
                                const fieldOpt = fieldByValue.get(rule.field);
                                const fieldType: FieldType = fieldOpt?.type ?? "string";
                                const ops = OPS_BY_TYPE[fieldType];
                                const showValueInput =
                                    rule.operator !== "is_true" && rule.operator !== "is_false";

                                return (
                                    <div
                                        key={rule.id}
                                        className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-md p-2"
                                    >
                                        <Select value={rule.field} onValueChange={v => changeRuleField(rule.id, v)}>
                                            <SelectTrigger size="sm" className="w-full sm:w-48">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {fieldOptions.map(f => (
                                                    <SelectItem key={f.value} value={f.value}>
                                                        {f.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <Select
                                            value={rule.operator}
                                            onValueChange={v => updateRule(rule.id, { operator: v })}
                                        >
                                            <SelectTrigger size="sm" className="w-full sm:w-40">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ops.map(op => (
                                                    <SelectItem key={op.value} value={op.value}>
                                                        {op.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {showValueInput && (
                                            <>
                                                {fieldType === "enum" && fieldOpt?.enumOptions ? (
                                                    <Select
                                                        value={rule.value}
                                                        onValueChange={v => updateRule(rule.id, { value: v })}
                                                    >
                                                        <SelectTrigger size="sm" className="flex-1">
                                                            <SelectValue placeholder="Select…" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {fieldOpt.enumOptions.map(opt => (
                                                                <SelectItem key={opt} value={opt}>
                                                                    {opt}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                ) : fieldType === "date" ? (
                                                    <Input
                                                        type="date"
                                                        value={rule.value}
                                                        onChange={e => updateRule(rule.id, { value: e.target.value })}
                                                        className="h-8 flex-1"
                                                    />
                                                ) : fieldType === "event" ? (
                                                    <div className="flex flex-1 gap-2">
                                                        <Input
                                                            placeholder="event name"
                                                            value={rule.value}
                                                            onChange={e => updateRule(rule.id, { value: e.target.value })}
                                                            className="h-8 flex-1"
                                                        />
                                                        <div className="flex items-center gap-1 text-xs text-zinc-500 whitespace-nowrap">
                                                            in last
                                                            <Input
                                                                type="number"
                                                                min={1}
                                                                value={rule.eventWithinDays ?? 30}
                                                                onChange={e =>
                                                                    updateRule(rule.id, {
                                                                        eventWithinDays: Number(e.target.value) || 30,
                                                                    })
                                                                }
                                                                className="h-8 w-16"
                                                            />
                                                            days
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <Input
                                                        placeholder={fieldType === "tag" ? "tag name" : "value"}
                                                        value={rule.value}
                                                        onChange={e => updateRule(rule.id, { value: e.target.value })}
                                                        className="h-8 flex-1"
                                                    />
                                                )}
                                            </>
                                        )}

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeRule(rule.id)}
                                            disabled={rules.length === 1}
                                            className="text-zinc-400 hover:text-red-500 shrink-0"
                                            aria-label="Remove condition"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>

                        <Button type="button" variant="outline" size="sm" onClick={addRule}>
                            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add condition
                        </Button>
                    </TabsContent>

                    <TabsContent value="advanced" className="space-y-3 pt-2">
                        <div className="grid gap-2">
                            <label className="text-xs text-zinc-500">
                                Edit the raw Prisma-flavored JSON. Supports <code>AND</code>, <code>OR</code>,{" "}
                                <code>NOT</code>, custom field names, <code>has_tag</code>, and{" "}
                                <code>event_count</code>.
                            </label>
                            <Input
                                value={rawQuery}
                                onChange={e => setRawQuery(e.target.value)}
                                className="font-mono text-sm"
                                placeholder='{"status": "subscribed"}'
                            />
                        </div>

                        <details className="border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950/50">
                            <summary className="px-4 py-3 cursor-pointer text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2">
                                <Info className="w-4 h-4" /> Available fields & examples
                            </summary>
                            <div className="px-4 pb-4 space-y-4">
                                <div>
                                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                                        Built-in subscriber fields:
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                                        {[
                                            { field: "email", desc: "Email address" },
                                            { field: "name", desc: "Subscriber name" },
                                            { field: "status", desc: "subscribed / unsubscribed / bounced" },
                                            { field: "hasConfirmedGdpr", desc: "GDPR consent (true/false)" },
                                            { field: "createdAt", desc: "Join date" },
                                        ].map(f => (
                                            <div key={f.field} className="flex items-start gap-1.5">
                                                <code className="bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">
                                                    {f.field}
                                                </code>
                                                <span className="text-zinc-500">{f.desc}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {customFields.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                                            Your custom fields (auto-detected):
                                        </p>
                                        <div className="flex flex-wrap gap-1.5 text-xs">
                                            {customFields.map((cf: any) => (
                                                <code
                                                    key={cf.id}
                                                    className="bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded"
                                                >
                                                    {cf.name}
                                                </code>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                                        Example queries (click to use):
                                    </p>
                                    <div className="grid gap-1.5">
                                        {QUERY_EXAMPLES.map((ex, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => setRawQuery(ex.query)}
                                                className="flex items-center gap-3 text-xs text-left px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
                                            >
                                                <span className="text-zinc-500 w-28 shrink-0">{ex.label}</span>
                                                <code className="text-zinc-700 dark:text-zinc-300 font-mono">
                                                    {ex.query}
                                                </code>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </details>
                    </TabsContent>
                </Tabs>

                {/* Live preview */}
                <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-md bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800">
                    <Users2 className="w-4 h-4 text-blue-500" />
                    {previewError ? (
                        <span className="text-red-500">{previewError}</span>
                    ) : previewLoading ? (
                        <span className="text-zinc-500 inline-flex items-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> calculating…
                        </span>
                    ) : previewCount !== null ? (
                        <span className="text-zinc-700 dark:text-zinc-300">
                            <strong>{previewCount.toLocaleString()}</strong> subscriber
                            {previewCount === 1 ? "" : "s"} match{previewCount === 1 ? "es" : ""} this query
                        </span>
                    ) : (
                        <span className="text-zinc-400">Add a condition to see the match count</span>
                    )}
                </div>

                <Button type="submit" disabled={isLoading} className="w-full sm:w-auto self-start">
                    <Plus className="w-4 h-4 mr-2" /> Create Segment
                </Button>
            </form>

            <div className="space-y-3">
                {segments.length === 0 ? (
                    <div className="text-center text-zinc-500 py-8 border border-zinc-200 dark:border-zinc-800 rounded-md">
                        No segments created yet.
                    </div>
                ) : (
                    segments.map(segment => (
                        <div
                            key={segment.id}
                            className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-950/50">
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-medium text-zinc-900 dark:text-white">{segment.name}</h4>
                                    <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400 truncate mt-1">
                                        {segment.query}
                                    </p>
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
                                                {previewData[segment.id].total} subscriber
                                                {previewData[segment.id].total !== 1 ? "s" : ""} match
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
                                                        <th className="text-left px-4 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                                                            Email
                                                        </th>
                                                        <th className="text-left px-4 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                                                            Name
                                                        </th>
                                                        <th className="text-left px-4 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                                                            Status
                                                        </th>
                                                        {customFields.length > 0 &&
                                                            customFields.map((cf: any) => (
                                                                <th
                                                                    key={cf.id}
                                                                    className="text-left px-4 py-2 font-medium text-zinc-600 dark:text-zinc-400"
                                                                >
                                                                    {cf.name}
                                                                </th>
                                                            ))}
                                                        <th className="text-left px-4 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                                                            Joined
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                                    {previewData[segment.id].subscribers.map((sub: any) => (
                                                        <tr
                                                            key={sub.id}
                                                            className="hover:bg-white dark:hover:bg-zinc-900/50"
                                                        >
                                                            <td className="px-4 py-2 text-zinc-900 dark:text-white">
                                                                {sub.email}
                                                            </td>
                                                            <td className="px-4 py-2 text-zinc-500">
                                                                {sub.name || "—"}
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                <span
                                                                    className={`px-1.5 py-0.5 rounded text-xs font-medium ${sub.status === "subscribed"
                                                                            ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                                                                            : sub.status === "unsubscribed"
                                                                                ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
                                                                                : "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                                                                        }`}
                                                                >
                                                                    {sub.status}
                                                                </span>
                                                            </td>
                                                            {customFields.length > 0 &&
                                                                customFields.map((cf: any) => (
                                                                    <td
                                                                        key={cf.id}
                                                                        className="px-4 py-2 text-zinc-500 text-xs"
                                                                    >
                                                                        {sub.customFields?.[cf.name] || "—"}
                                                                    </td>
                                                                ))}
                                                            <td className="px-4 py-2 text-zinc-400 text-xs">
                                                                {new Date(sub.createdAt).toLocaleDateString()}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
