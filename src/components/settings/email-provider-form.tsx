"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, CheckCircle2, Copy, Check } from "lucide-react";
import { updateSystemSettings } from "@/app/actions/settings";
import type { ProviderId } from "@/lib/email-provider/types";

interface EmailProviderFormProps {
    initialSettings: Record<string, string>;
    appUrl: string;
}

const PROVIDER_OPTIONS: Array<{ id: ProviderId; label: string; tagline: string }> = [
    { id: "ses", label: "Amazon SES", tagline: "Pennies per 1k. Best for high volume." },
    { id: "resend", label: "Resend", tagline: "Modern API, painless DNS setup." },
    { id: "postmark", label: "Postmark", tagline: "Strong deliverability, broadcast stream." },
    { id: "sendgrid", label: "SendGrid", tagline: "Mature, enterprise-friendly." },
    { id: "mailjet", label: "Mailjet", tagline: "EU-hosted, good price/perf." },
    { id: "elastic", label: "Elastic Email", tagline: "Cheap pay-as-you-go." },
];

interface FieldDef {
    key: string;
    label: string;
    placeholder?: string;
    type?: "text" | "password" | "textarea";
    help?: string;
}

const FIELDS_BY_PROVIDER: Record<ProviderId, FieldDef[]> = {
    ses: [
        { key: "AWS_ACCESS_KEY_ID", label: "AWS Access Key ID", placeholder: "AKIA..." },
        { key: "AWS_SECRET_ACCESS_KEY", label: "AWS Secret Access Key", type: "password" },
        { key: "AWS_REGION", label: "AWS Region", placeholder: "us-east-1" },
        { key: "SEND_RATE", label: "Send rate (per second)", placeholder: "14", help: "Stay at or below your SES max. Requires worker restart." },
    ],
    resend: [
        { key: "RESEND_API_KEY", label: "Resend API key", type: "password", placeholder: "re_..." },
        { key: "RESEND_WEBHOOK_SECRET", label: "Webhook signing secret", type: "password", placeholder: "whsec_...", help: "From Resend dashboard → Webhooks → Signing Secret. Optional in dev." },
    ],
    postmark: [
        { key: "POSTMARK_SERVER_TOKEN", label: "Server token", type: "password" },
        { key: "POSTMARK_MESSAGE_STREAM", label: "Broadcast message stream", placeholder: "broadcast", help: "Bulk campaigns require a Broadcast stream — not a Transactional one." },
        { key: "POSTMARK_WEBHOOK_USER", label: "Webhook basic-auth user", help: "Optional: protect your webhook URL with Basic Auth in the Postmark dashboard." },
        { key: "POSTMARK_WEBHOOK_PASS", label: "Webhook basic-auth password", type: "password" },
    ],
    sendgrid: [
        { key: "SENDGRID_API_KEY", label: "SendGrid API key", type: "password", placeholder: "SG..." },
        { key: "SENDGRID_WEBHOOK_PUBLIC_KEY", label: "Event webhook public key (PEM)", type: "textarea", help: "From SendGrid → Settings → Mail Settings → Event Webhook → 'Copy verification key'. Required in production." },
    ],
    mailjet: [
        { key: "MAILJET_API_KEY", label: "Mailjet API key", placeholder: "MJ..." },
        { key: "MAILJET_API_SECRET", label: "Mailjet API secret", type: "password" },
        { key: "MAILJET_WEBHOOK_SECRET", label: "Webhook shared secret", type: "password", help: "Optional: pass as ?token= on the webhook URL configured in Mailjet." },
    ],
    elastic: [
        { key: "ELASTIC_API_KEY", label: "Elastic Email API key", type: "password" },
        { key: "ELASTIC_WEBHOOK_SECRET", label: "Webhook shared secret", type: "password", help: "Optional: pass as ?token= on the notification URL configured in Elastic Email." },
    ],
};

const WEBHOOK_PATH: Record<ProviderId, string> = {
    ses: "/api/webhooks/ses",
    resend: "/api/webhooks/resend",
    postmark: "/api/webhooks/postmark",
    sendgrid: "/api/webhooks/sendgrid",
    mailjet: "/api/webhooks/mailjet",
    elastic: "/api/webhooks/elastic",
};

export function EmailProviderForm({ initialSettings, appUrl }: EmailProviderFormProps) {
    const [provider, setProvider] = useState<ProviderId>(
        (initialSettings.EMAIL_PROVIDER as ProviderId) || "ses",
    );
    const [settings, setSettings] = useState<Record<string, string>>(initialSettings);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [copied, setCopied] = useState(false);

    const fields = FIELDS_BY_PROVIDER[provider];
    const webhookUrl = `${appUrl.replace(/\/$/, "")}${WEBHOOK_PATH[provider]}`;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(false);
        try {
            const payload: Record<string, string> = { EMAIL_PROVIDER: provider };
            for (const f of fields) {
                payload[f.key] = settings[f.key] || "";
            }
            await updateSystemSettings(payload);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error(err);
            alert(err instanceof Error ? err.message : "Failed to update provider settings");
        } finally {
            setLoading(false);
        }
    };

    const handleCopyWebhook = async () => {
        try {
            await navigator.clipboard.writeText(webhookUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            window.prompt("Copy this URL:", webhookUrl);
        }
    };

    return (
        <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 shadow-sm">
            <CardHeader>
                <CardTitle className="text-xl text-zinc-900 dark:text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Email Provider
                </CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400">
                    DakSend can send through one of six transports. Pick a provider and add its credentials.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSave} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {PROVIDER_OPTIONS.map((opt) => (
                            <button
                                type="button"
                                key={opt.id}
                                onClick={() => setProvider(opt.id)}
                                className={`text-left p-3 rounded-lg border-2 transition-all ${
                                    provider === opt.id
                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                                        : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                                }`}
                            >
                                <p className={`text-sm font-semibold ${
                                    provider === opt.id
                                        ? "text-blue-700 dark:text-blue-300"
                                        : "text-zinc-700 dark:text-zinc-300"
                                }`}>{opt.label}</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{opt.tagline}</p>
                            </button>
                        ))}
                    </div>

                    <div className="border-t border-zinc-200 dark:border-zinc-800 pt-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {fields.map((f) => (
                                <div key={f.key} className={`space-y-2 ${f.type === "textarea" ? "md:col-span-2" : ""}`}>
                                    <Label htmlFor={f.key} className="text-zinc-700 dark:text-zinc-300">{f.label}</Label>
                                    {f.type === "textarea" ? (
                                        <textarea
                                            id={f.key}
                                            value={settings[f.key] || ""}
                                            onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
                                            placeholder={f.placeholder}
                                            rows={4}
                                            className="w-full font-mono text-xs px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                            autoComplete="off"
                                        />
                                    ) : (
                                        <Input
                                            id={f.key}
                                            type={f.type === "password" ? "password" : "text"}
                                            value={settings[f.key] || ""}
                                            onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
                                            placeholder={f.placeholder}
                                            className={`bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 ${f.type === "password" ? "font-mono" : ""}`}
                                            autoComplete="off"
                                        />
                                    )}
                                    {f.help && <p className="text-xs text-zinc-500 dark:text-zinc-400">{f.help}</p>}
                                </div>
                            ))}
                        </div>

                        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">Webhook URL</p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 text-xs font-mono text-zinc-800 dark:text-zinc-200 truncate">{webhookUrl}</code>
                                <button
                                    type="button"
                                    onClick={handleCopyWebhook}
                                    className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                    {copied ? "Copied" : "Copy"}
                                </button>
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
                                Configure this URL in your provider&apos;s bounce/complaint webhook settings.
                            </p>
                        </div>
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
                                "Save Provider"
                            )}
                        </Button>
                        {success && (
                            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in slide-in-from-left-2">
                                Provider settings updated.
                            </p>
                        )}
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
