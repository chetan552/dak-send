"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { updateSystemSettings } from "@/app/actions/settings";
import type { LlmProviderId } from "@/lib/ai/providers";
import { LLM_PROVIDER_OPTIONS } from "@/lib/ai/providers";

interface AIConfigFormProps {
    initialSettings: Record<string, string>;
}

interface FieldDef {
    key: string;
    label: string;
    placeholder?: string;
    type?: "text" | "password";
    help?: string;
}

const FIELDS_BY_PROVIDER: Record<LlmProviderId, FieldDef[]> = {
    openai: [
        { key: "OPENAI_API_KEY", label: "OpenAI API key", type: "password", placeholder: "sk-..." },
        { key: "OPENAI_MODEL", label: "Default model", placeholder: "gpt-4o-mini", help: "Used for all AI features except pre-send review." },
        { key: "OPENAI_REASONER_MODEL", label: "Reasoning model (optional)", placeholder: "o4-mini", help: "Used for pre-send deliverability review. Leave blank to use the default model." },
    ],
    openrouter: [
        { key: "OPENROUTER_API_KEY", label: "OpenRouter API key", type: "password", placeholder: "sk-or-..." },
        { key: "OPENROUTER_MODEL", label: "Default model", placeholder: "openai/gpt-4o-mini", help: "Use the OpenRouter format vendor/model. Browse models at openrouter.ai/models." },
        { key: "OPENROUTER_REASONER_MODEL", label: "Reasoning model (optional)", placeholder: "anthropic/claude-3.5-sonnet", help: "Used for pre-send review when set." },
    ],
    groq: [
        { key: "GROQ_API_KEY", label: "Groq API key", type: "password", placeholder: "gsk_..." },
        { key: "GROQ_MODEL", label: "Default model", placeholder: "llama-3.1-70b-versatile", help: "Browse models at console.groq.com/docs/models." },
    ],
    deepseek: [
        { key: "DEEPSEEK_API_KEY", label: "DeepSeek API key", type: "password", placeholder: "sk-..." },
        { key: "DEEPSEEK_MODEL", label: "Default model", placeholder: "deepseek-chat" },
        { key: "DEEPSEEK_REASONER_MODEL", label: "Reasoning model", placeholder: "deepseek-reasoner", help: "Used for pre-send review. Leave blank to default to deepseek-reasoner." },
    ],
    custom: [
        { key: "AI_CUSTOM_BASE_URL", label: "Base URL", placeholder: "https://your-proxy.example.com/v1", help: "Any OpenAI-compatible /chat/completions endpoint. Trailing slash is stripped." },
        { key: "AI_CUSTOM_API_KEY", label: "API key", type: "password", help: "Sent as 'Authorization: Bearer ...'. Use any non-empty value if your endpoint doesn't need auth." },
        { key: "AI_CUSTOM_MODEL", label: "Model name", placeholder: "your-model" },
    ],
};

function resolveInitialProvider(settings: Record<string, string>): LlmProviderId {
    const raw = settings.LLM_PROVIDER as LlmProviderId;
    if (raw && LLM_PROVIDER_OPTIONS.some((o) => o.id === raw)) return raw;
    if (settings.DEEPSEEK_API_KEY) return "deepseek";
    return "openai";
}

export function AIConfigForm({ initialSettings }: AIConfigFormProps) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [enabled, setEnabled] = useState(initialSettings.AI_ENABLED === "true");
    const [provider, setProvider] = useState<LlmProviderId>(resolveInitialProvider(initialSettings));
    const [settings, setSettings] = useState<Record<string, string>>(initialSettings);

    const fields = FIELDS_BY_PROVIDER[provider];
    const providerMeta = LLM_PROVIDER_OPTIONS.find((p) => p.id === provider);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(false);
        try {
            const payload: Record<string, string> = {
                AI_ENABLED: enabled ? "true" : "false",
                LLM_PROVIDER: provider,
            };
            for (const f of fields) {
                payload[f.key] = settings[f.key] || "";
            }
            await updateSystemSettings(payload);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error(error);
            alert("Failed to update AI settings");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 shadow-sm">
            <CardHeader>
                <CardTitle className="text-xl text-zinc-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" /> AI Assistant
                </CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400">
                    Pick any OpenAI-compatible provider. Enables subject line generation, AI email drafts,
                    pre-send review, and post-send insights. Per-brand opt-out is available on each brand page.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSave} className="space-y-5">
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
                        <input
                            id="ai-enabled"
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => setEnabled(e.target.checked)}
                            className="w-4 h-4 accent-violet-600"
                        />
                        <div className="flex-1">
                            <Label htmlFor="ai-enabled" className="text-zinc-700 dark:text-zinc-300 cursor-pointer">
                                Enable AI features platform-wide
                            </Label>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                When off, all AI buttons are hidden regardless of brand setting.
                            </p>
                        </div>
                    </div>

                    <div>
                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">LLM provider</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {LLM_PROVIDER_OPTIONS.map((opt) => (
                                <button
                                    type="button"
                                    key={opt.id}
                                    onClick={() => setProvider(opt.id)}
                                    className={`text-left p-3 rounded-lg border-2 transition-all ${
                                        provider === opt.id
                                            ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                                            : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                                    }`}
                                >
                                    <p className={`text-sm font-semibold ${
                                        provider === opt.id
                                            ? "text-violet-700 dark:text-violet-300"
                                            : "text-zinc-700 dark:text-zinc-300"
                                    }`}>{opt.label}</p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{opt.tagline}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {providerMeta?.privacyNote && (
                        <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>{providerMeta.privacyNote}</span>
                        </div>
                    )}

                    <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {fields.map((f) => (
                            <div key={f.key} className="space-y-2">
                                <Label htmlFor={f.key} className="text-zinc-700 dark:text-zinc-300">{f.label}</Label>
                                <Input
                                    id={f.key}
                                    type={f.type === "password" ? "password" : "text"}
                                    value={settings[f.key] || ""}
                                    onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
                                    placeholder={f.placeholder}
                                    className={`bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 ${f.type === "password" ? "font-mono" : ""}`}
                                    autoComplete="off"
                                />
                                {f.help && <p className="text-xs text-zinc-500 dark:text-zinc-400">{f.help}</p>}
                            </div>
                        ))}
                    </div>

                    <div className="pt-2 flex items-center gap-4">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 dark:text-black min-w-[140px]"
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                            ) : success ? (
                                <><CheckCircle2 className="w-4 h-4 mr-2" /> Saved</>
                            ) : (
                                "Save AI Settings"
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
