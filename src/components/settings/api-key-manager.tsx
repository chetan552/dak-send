"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Key, RefreshCw, Copy, CheckCircle2, AlertTriangle } from "lucide-react";
import { rotateApiKey } from "@/app/actions/settings";

export function ApiKeyManager({ hasExistingKey }: { hasExistingKey: boolean }) {
    const [loading, setLoading] = useState(false);
    const [newKey, setNewKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleRotate = async () => {
        if (!confirm("This will invalidate the current API key immediately. Any integrations using the old key will stop working. Continue?")) return;

        setLoading(true);
        setNewKey(null);
        try {
            const result = await rotateApiKey();
            setNewKey(result.plaintext);
        } catch (e: any) {
            alert(e.message || "Failed to rotate API key");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        if (!newKey) return;
        await navigator.clipboard.writeText(newKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 shadow-sm">
            <CardHeader>
                <CardTitle className="text-xl text-zinc-900 dark:text-white flex items-center gap-2">
                    <Key className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Transactional API Key
                </CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400">
                    Used to authenticate requests to <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">/api/send</code>. Keys are stored as bcrypt hashes — the plaintext is shown only once upon rotation.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-sm text-zinc-400 dark:text-zinc-500 flex items-center font-mono">
                        {hasExistingKey ? "••••••••••••••••••••••••••••••••" : "No API key configured"}
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleRotate}
                        disabled={loading}
                        className="flex items-center gap-2 border-zinc-200 dark:border-zinc-700"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        {hasExistingKey ? "Rotate Key" : "Generate Key"}
                    </Button>
                </div>

                {newKey && (
                    <div className="p-4 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 space-y-3">
                        <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <p className="text-sm font-medium">Copy this key now — it won't be shown again.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-700 px-3 py-2 rounded font-mono break-all text-zinc-900 dark:text-white">
                                {newKey}
                            </code>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleCopy}
                                className="flex-shrink-0 border-amber-200 dark:border-amber-700"
                            >
                                {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                            </Button>
                        </div>
                        <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
                            Include in requests as: <code className="font-mono">x-api-key: {newKey.slice(0, 8)}…</code>
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
