"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { updateSystemSettings } from "@/app/actions/settings";

interface AIConfigFormProps {
    initialSettings: Record<string, string>;
}

export function AIConfigForm({ initialSettings }: AIConfigFormProps) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [enabled, setEnabled] = useState(initialSettings.AI_ENABLED === "true");
    const [apiKey, setApiKey] = useState(initialSettings.DEEPSEEK_API_KEY || "");

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(false);
        try {
            await updateSystemSettings({
                AI_ENABLED: enabled ? "true" : "false",
                DEEPSEEK_API_KEY: apiKey,
            });
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
                    Powered by DeepSeek. Enables subject line generation, pre-send review, and post-send insights.
                    Per-brand opt-out is available on each brand page.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSave} className="space-y-4">
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

                    <div className="space-y-2">
                        <Label htmlFor="deepseek-key" className="text-zinc-700 dark:text-zinc-300">DeepSeek API Key</Label>
                        <Input
                            id="deepseek-key"
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder={initialSettings.DEEPSEEK_API_KEY ? "••••••••••••••••" : "sk-..."}
                            className="font-mono bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus:ring-violet-500/20 focus:border-violet-500"
                            autoComplete="off"
                        />
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Get a key at <a href="https://platform.deepseek.com" target="_blank" rel="noreferrer" className="underline">platform.deepseek.com</a>. DeepSeek runs in China — keep AI off for privacy-sensitive brands.
                        </p>
                    </div>

                    <div className="pt-2 flex items-center gap-4">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 dark:text-black min-w-[120px]"
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
