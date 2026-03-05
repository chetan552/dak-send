"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { updateSignupForm, updateSignupFormStatus, deleteSignupForm } from "@/app/actions/signup-form";
import type { FormConfig } from "@/lib/form-config";
import { Copy, Check, ExternalLink, Trash2, Pause, Play, Code, Eye, Settings, Save } from "lucide-react";

interface FormBuilderProps {
    form: any;
    appUrl: string;
}

export function FormBuilder({ form, appUrl }: FormBuilderProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [copied, setCopied] = useState(false);
    const [tab, setTab] = useState<"design" | "embed">("design");

    const defaultConfig: FormConfig = {
        headline: "Join our newsletter",
        description: "Get the latest updates delivered to your inbox.",
        buttonText: "Subscribe",
        successMessage: "Thanks for subscribing! Check your inbox to confirm.",
        bgColor: "#ffffff",
        accentColor: "#4f46e5",
        textColor: "#111827",
        layout: "centered",
        collectName: true,
        showBranding: true,
        customCss: "",
        fields: [],
        redirectUrl: "",
    };

    const [config, setConfig] = useState<FormConfig>({
        ...defaultConfig,
        ...(form.config || {}),
    });

    const updateField = useCallback((key: keyof FormConfig, value: any) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    }, []);

    const handleSave = () => {
        startTransition(async () => {
            await updateSignupForm(form.id, config);
        });
    };

    const handleToggleStatus = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        startTransition(async () => {
            await updateSignupFormStatus(form.id, form.status === "active" ? "paused" : "active");
            router.refresh();
        });
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Delete this form? This cannot be undone.")) return;
        startTransition(async () => {
            await deleteSignupForm(form.id);
            router.push("/dashboard/forms");
        });
    };

    const publicUrl = `${appUrl}/f/${form.slug}`;

    const customFieldsHtml = form.list?.customFields?.length > 0
        ? form.list.customFields.map((field: any) => {
            const requiredAttr = field.required ? ' required' : '';
            const labelStyle = `display:block;margin-bottom:4px;font-size:12px;font-weight:600;color:${config.textColor};opacity:0.8;`;
            const inputStyle = `width:100%;padding:10px 12px;margin-bottom:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;box-sizing:border-box;`;

            let fieldHtml = `<div style="margin-bottom:12px;">\n`;
            if (field.type !== "boolean") {
                fieldHtml += `    <label style="${labelStyle}">${field.name}${field.required ? ' <span style="color:red;">*</span>' : ''}</label>\n`;
            }

            if (field.type === "text" || field.type === "number" || field.type === "date") {
                fieldHtml += `    <input type="${field.type}" name="cf_${field.id}" placeholder="${field.name}"${requiredAttr} style="${inputStyle}" />\n`;
            } else if (field.type === "select") {
                const options = field.options?.split(",").map((o: string) => `<option value="${o.trim()}">${o.trim()}</option>`).join('\n      ');
                fieldHtml += `    <select name="cf_${field.id}"${requiredAttr} style="${inputStyle}">\n      <option value="">Select ${field.name.toLowerCase()}</option>\n      ${options}\n    </select>\n`;
            } else if (field.type === "boolean") {
                fieldHtml += `    <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;">\n      <input type="checkbox" name="cf_${field.id}" value="true"${requiredAttr} style="margin-top:2px;" />\n      <span style="font-size:12px;color:${config.textColor};opacity:0.7;">${field.name}${field.required ? ' <span style="color:red;">*</span>' : ''}</span>\n    </label>\n`;
            }

            fieldHtml += `  </div>`;
            return `  ${fieldHtml}`;
        }).join('\n')
        : "";

    const gdprHtml = form.list?.requireGdpr
        ? `  <label style="display:flex;align-items:flex-start;gap:8px;margin-bottom:12px;cursor:pointer;">\n    <input type="checkbox" name="gdpr" value="yes" required style="margin-top:2px;" />\n    <span style="font-size:12px;color:${config.textColor};opacity:0.7;">I consent to receiving emails and agree to the privacy policy.</span>\n  </label>\n`
        : "";

    const embedCode = `<!-- DakSend Signup Form -->
<form action="${appUrl}/api/subscribe" method="POST" style="max-width:400px;font-family:system-ui,sans-serif;">
  <h3 style="margin:0 0 8px;font-size:20px;color:${config.textColor};">${config.headline}</h3>
  <p style="margin:0 0 16px;font-size:14px;color:#666;">${config.description}</p>
  <input type="hidden" name="listId" value="${form.listId}" />
  ${config.collectName ? `<input type="text" name="name" placeholder="Your name" style="width:100%;padding:10px 12px;margin-bottom:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;box-sizing:border-box;" />\n  ` : ""}<input type="email" name="email" placeholder="Email address" required style="width:100%;padding:10px 12px;margin-bottom:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;box-sizing:border-box;" />
${customFieldsHtml ? `${customFieldsHtml}\n` : ""}${gdprHtml}  <button type="submit" style="width:100%;padding:10px 12px;background:${config.accentColor};color:white;border:none;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer;">${config.buttonText}</button>
</form>`;

    const copyEmbed = () => {
        navigator.clipboard.writeText(embedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            {/* Action bar */}
            <div className="flex items-center gap-2 flex-wrap">
                <button onClick={handleSave} disabled={isPending} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white font-medium text-sm hover:bg-teal-700 transition-colors disabled:opacity-50">
                    <Save className="w-4 h-4" /> {isPending ? "Saving..." : "Save Changes"}
                </button>
                <a href={publicUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm transition-colors">
                    <ExternalLink className="w-4 h-4" /> View Live
                </a>
                <button type="button" onClick={handleToggleStatus} disabled={isPending} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${form.status === "active" ? "border-amber-200 dark:border-amber-800 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20" : "border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"}`}>
                    {form.status === "active" ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Activate</>}
                </button>
                <button type="button" onClick={handleDelete} disabled={isPending} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 dark:border-red-800/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm transition-colors ml-auto">
                    <Trash2 className="w-4 h-4" /> Delete
                </button>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-zinc-200 dark:border-zinc-800">
                <button onClick={() => setTab("design")} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === "design" ? "border-teal-500 text-teal-600 dark:text-teal-400" : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}>
                    <Settings className="w-4 h-4" /> Design
                </button>
                <button onClick={() => setTab("embed")} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === "embed" ? "border-teal-500 text-teal-600 dark:text-teal-400" : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}>
                    <Code className="w-4 h-4" /> Embed Code
                </button>
            </div>

            {tab === "design" ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Config panel */}
                    <div className="space-y-5">
                        <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50 space-y-4">
                            <h3 className="font-semibold text-zinc-900 dark:text-white text-sm">Content</h3>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Headline</label>
                                <input type="text" value={config.headline} onChange={(e) => updateField("headline", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Description</label>
                                <textarea value={config.description} onChange={(e) => updateField("description", e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Button Text</label>
                                    <input type="text" value={config.buttonText} onChange={(e) => updateField("buttonText", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Success Message</label>
                                    <input type="text" value={config.successMessage} onChange={(e) => updateField("successMessage", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" />
                                </div>
                            </div>
                        </div>

                        <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50 space-y-4">
                            <h3 className="font-semibold text-zinc-900 dark:text-white text-sm">Appearance</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Background</label>
                                    <div className="flex items-center gap-2">
                                        <input type="color" value={config.bgColor} onChange={(e) => updateField("bgColor", e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-zinc-300 dark:border-zinc-600 shrink-0" />
                                        <input type="text" value={config.bgColor} onChange={(e) => updateField("bgColor", e.target.value)} className="flex-1 min-w-0 px-2 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-mono focus:ring-1 focus:ring-teal-500 outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Accent</label>
                                    <div className="flex items-center gap-2">
                                        <input type="color" value={config.accentColor} onChange={(e) => updateField("accentColor", e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-zinc-300 dark:border-zinc-600 shrink-0" />
                                        <input type="text" value={config.accentColor} onChange={(e) => updateField("accentColor", e.target.value)} className="flex-1 min-w-0 px-2 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-mono focus:ring-1 focus:ring-teal-500 outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Text</label>
                                    <div className="flex items-center gap-2">
                                        <input type="color" value={config.textColor} onChange={(e) => updateField("textColor", e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-zinc-300 dark:border-zinc-600 shrink-0" />
                                        <input type="text" value={config.textColor} onChange={(e) => updateField("textColor", e.target.value)} className="flex-1 min-w-0 px-2 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-mono focus:ring-1 focus:ring-teal-500 outline-none" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50 space-y-4">
                            <h3 className="font-semibold text-zinc-900 dark:text-white text-sm">Options</h3>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={config.collectName} onChange={(e) => updateField("collectName", e.target.checked)} className="rounded border-zinc-300 dark:border-zinc-600 text-teal-600 focus:ring-teal-500" />
                                <span className="text-sm text-zinc-700 dark:text-zinc-300">Collect subscriber name</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={config.showBranding} onChange={(e) => updateField("showBranding", e.target.checked)} className="rounded border-zinc-300 dark:border-zinc-600 text-teal-600 focus:ring-teal-500" />
                                <span className="text-sm text-zinc-700 dark:text-zinc-300">Show "Powered by DakSend" branding</span>
                            </label>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Redirect URL (optional)</label>
                                <input type="url" value={config.redirectUrl || ""} onChange={(e) => updateField("redirectUrl", e.target.value)} placeholder="https://example.com/thank-you" className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm placeholder-zinc-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" />
                            </div>
                        </div>
                    </div>

                    {/* Live preview */}
                    <div className="sticky top-6">
                        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                            <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
                                <Eye className="w-4 h-4 text-zinc-400" />
                                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Live Preview</span>
                            </div>
                            <div style={{ backgroundColor: config.bgColor }} className="p-8 min-h-[400px] flex items-center justify-center transition-colors duration-200">
                                <div className="w-full max-w-sm">
                                    <h2 style={{ color: config.textColor }} className="text-2xl font-bold mb-2 transition-colors">{config.headline}</h2>
                                    <p style={{ color: config.textColor, opacity: 0.6 }} className="text-sm mb-6 transition-colors">{config.description}</p>
                                    {config.collectName && (
                                        <input type="text" disabled placeholder="Your name" className="w-full px-3 py-2.5 mb-2 rounded-lg border border-zinc-300 text-sm bg-white/80" />
                                    )}
                                    <input type="email" disabled placeholder="Email address" className="w-full px-3 py-2.5 mb-3 rounded-lg border border-zinc-300 text-sm bg-white/80" />
                                    <button disabled style={{ backgroundColor: config.accentColor }} className="w-full py-2.5 rounded-lg text-white font-semibold text-sm transition-colors">
                                        {config.buttonText}
                                    </button>
                                    {config.showBranding && (
                                        <p className="text-center text-[10px] text-zinc-400 mt-4">Powered by DakSend</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Embed tab */
                <div className="space-y-6">
                    <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-zinc-900 dark:text-white text-sm">Shareable URL</h3>
                            <button onClick={() => { navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />} {copied ? "Copied!" : "Copy"}
                            </button>
                        </div>
                        <code className="block p-3 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-sm text-zinc-700 dark:text-zinc-300 font-mono break-all">{publicUrl}</code>
                    </div>

                    <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-zinc-900 dark:text-white text-sm">Embed HTML</h3>
                            <button onClick={copyEmbed} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />} {copied ? "Copied!" : "Copy"}
                            </button>
                        </div>
                        <pre className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-xs text-zinc-700 dark:text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap">{embedCode}</pre>
                        <p className="text-xs text-zinc-500">Paste this into any HTML page to embed your signup form.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
