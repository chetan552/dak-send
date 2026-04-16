"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Key, Globe, Zap, Loader2, CheckCircle2 } from "lucide-react";
import { updateSystemSettings } from "@/app/actions/settings";

interface AWSConfigFormProps {
    initialSettings: Record<string, string>;
}

export function AWSConfigForm({ initialSettings }: AWSConfigFormProps) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [settings, setSettings] = useState(initialSettings);
    // const { toast } = useToast(); // If useToast is available

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(false);

        try {
            await updateSystemSettings({
                AWS_ACCESS_KEY_ID: settings.AWS_ACCESS_KEY_ID || "",
                AWS_SECRET_ACCESS_KEY: settings.AWS_SECRET_ACCESS_KEY || "",
                AWS_REGION: settings.AWS_REGION || "us-east-1",
                SEND_RATE: settings.SEND_RATE || "14",
            });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error(error);
            alert("Failed to update settings");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 shadow-sm">
            <CardHeader>
                <CardTitle className="text-xl text-zinc-900 dark:text-white flex items-center gap-2">
                    <Key className="w-5 h-5 text-amber-600 dark:text-amber-400" /> AWS SES Credentials
                </CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400">Configure your Amazon Simple Email Service credentials.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="accessKey" className="text-zinc-700 dark:text-zinc-300">Access Key ID</Label>
                            <Input
                                id="accessKey"
                                value={settings.AWS_ACCESS_KEY_ID || ""}
                                onChange={(e) => setSettings({ ...settings, AWS_ACCESS_KEY_ID: e.target.value })}
                                placeholder="AKIA..."
                                className="font-mono bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus:ring-amber-500/20 focus:border-amber-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="secretKey" className="text-zinc-700 dark:text-zinc-300">Secret Access Key</Label>
                            <Input
                                id="secretKey"
                                type="password"
                                value={settings.AWS_SECRET_ACCESS_KEY || ""}
                                onChange={(e) => setSettings({ ...settings, AWS_SECRET_ACCESS_KEY: e.target.value })}
                                placeholder="••••••••••••••••••••••••••••••••"
                                className="font-mono bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus:ring-amber-500/20 focus:border-amber-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="region" className="text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                                <Globe className="w-3.5 h-3.5" /> SES Region
                            </Label>
                            <Input
                                id="region"
                                value={settings.AWS_REGION || ""}
                                onChange={(e) => setSettings({ ...settings, AWS_REGION: e.target.value })}
                                placeholder="us-east-1"
                                className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus:ring-amber-500/20 focus:border-amber-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sendRate" className="text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5" /> Sending Rate (per sec)
                            </Label>
                            <Input
                                id="sendRate"
                                type="number"
                                min={1}
                                value={settings.SEND_RATE || ""}
                                onChange={(e) => setSettings({ ...settings, SEND_RATE: e.target.value })}
                                placeholder="14"
                                className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus:ring-amber-500/20 focus:border-amber-500"
                            />
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Stay at or below your SES max (shown above). Lower values trade throughput for stability. Requires a worker restart to take effect.
                            </p>
                        </div>
                    </div>
                    <div className="pt-2 flex items-center gap-4">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 dark:text-black min-w-[120px]"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : success ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Saved
                                </>
                            ) : (
                                "Save Settings"
                            )}
                        </Button>
                        {success && (
                            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in slide-in-from-left-2">
                                Settings updated successfully!
                            </p>
                        )}
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
