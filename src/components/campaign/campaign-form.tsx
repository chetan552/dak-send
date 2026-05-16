"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/campaign/rich-text-editor";
import { TemplatePicker } from "@/components/campaign/template-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Blocks, Code2 } from "lucide-react";
import { createCampaignDraft, updateCampaignDraft } from "@/app/actions/campaign";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { AiSubjectGenerator } from "@/components/campaign/ai-subject-generator";

interface CampaignFormProps {
    brands: any[];
    initialData?: any;
    aiEnabledByBrand?: Record<string, boolean>;
}

export function CampaignForm({ brands, initialData, aiEnabledByBrand = {} }: CampaignFormProps) {
    const [loading, setLoading] = useState(false);
    const [htmlContent, setHtmlContent] = useState(initialData?.htmlText || "");
    const [subject, setSubject] = useState<string>(initialData?.subject || "");
    const [brandId, setBrandId] = useState<string | undefined>(
        initialData?.brandId || (brands.length === 1 ? brands[0].id : undefined),
    );
    const [editorMode, setEditorMode] = useState<"html" | "blocks">(
        initialData ? (initialData.contentJson ? "blocks" : "html") : "blocks"
    );
    const router = useRouter();
    const aiAvailable = brandId ? aiEnabledByBrand[brandId] === true : false;

    // Load template HTML / subject / brand from sessionStorage (set by Template Library, AI generator, or importer)
    useEffect(() => {
        if (typeof window !== "undefined" && !initialData) {
            const templateHtml = sessionStorage.getItem("template_html");
            if (templateHtml) {
                setHtmlContent(templateHtml.trim());
                setEditorMode("html");
                sessionStorage.removeItem("template_html");
            }
            const templateSubject = sessionStorage.getItem("template_subject");
            if (templateSubject) {
                setSubject(templateSubject);
                sessionStorage.removeItem("template_subject");
            }
            const templateBrand = sessionStorage.getItem("template_brand");
            if (templateBrand) {
                setBrandId(templateBrand);
                sessionStorage.removeItem("template_brand");
            }
        }
    }, [initialData]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData(e.currentTarget);
            // For block builder mode on a new campaign, use placeholder HTML; blocks are set in the builder
            formData.set("htmlText", editorMode === "blocks" && !initialData ? "<p>Draft</p>" : htmlContent);

            if (initialData) {
                await updateCampaignDraft(initialData.id, formData);
                router.push("/dashboard/campaigns");
            } else {
                const campaign = await createCampaignDraft(formData);
                if (editorMode === "blocks") {
                    router.push(`/dashboard/campaigns/${campaign.id}/builder`);
                } else {
                    router.push(`/dashboard/campaigns/${campaign.id}`);
                }
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred while saving the campaign.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="name" className="text-zinc-700 dark:text-zinc-300">Campaign Name (Internal)</Label>
                    <Input id="name" name="name" defaultValue={initialData?.name} placeholder="Summer Sale 2026" required className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white shadow-sm" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="brandId" className="text-zinc-700 dark:text-zinc-300">Brand</Label>
                    <Select name="brandId" value={brandId} onValueChange={setBrandId} disabled={!!initialData}>
                        <SelectTrigger className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white shadow-sm">
                            <SelectValue placeholder="Select a brand" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white">
                            {brands.map(brand => (
                                <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="subject" className="text-zinc-700 dark:text-zinc-300">Email Subject Line</Label>
                <Input
                    id="subject"
                    name="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Don't miss out on our biggest sale of the year!"
                    required
                    className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                />
                {aiAvailable && (
                    <AiSubjectGenerator
                        brandId={brandId}
                        getBodyHtml={() => htmlContent}
                        currentSubject={subject}
                        onPick={setSubject}
                    />
                )}
            </div>

            {/* Editor mode toggle — only shown when creating a new campaign */}
            {!initialData && (
                <div className="space-y-2">
                    <Label className="text-zinc-700 dark:text-zinc-300">Editor Type</Label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setEditorMode("blocks")}
                            className={cn(
                                "flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all",
                                editorMode === "blocks"
                                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                                    : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                            )}
                        >
                            <Blocks className={cn("w-5 h-5 mt-0.5 flex-shrink-0", editorMode === "blocks" ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400")} />
                            <div>
                                <p className={cn("text-sm font-semibold", editorMode === "blocks" ? "text-indigo-700 dark:text-indigo-300" : "text-zinc-700 dark:text-zinc-300")}>Block Builder</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Drag-and-drop visual blocks</p>
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setEditorMode("html")}
                            className={cn(
                                "flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all",
                                editorMode === "html"
                                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                                    : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                            )}
                        >
                            <Code2 className={cn("w-5 h-5 mt-0.5 flex-shrink-0", editorMode === "html" ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400")} />
                            <div>
                                <p className={cn("text-sm font-semibold", editorMode === "html" ? "text-indigo-700 dark:text-indigo-300" : "text-zinc-700 dark:text-zinc-300")}>HTML Editor</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Rich text or raw HTML</p>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* Email content — only shown in HTML mode (or when editing an existing HTML campaign) */}
            {(editorMode === "html" || !!initialData) && (
                <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-2">
                        <Label htmlFor="htmlText" className="text-zinc-700 dark:text-zinc-300">Email Content</Label>
                        {!initialData && <TemplatePicker onSelect={setHtmlContent} />}
                    </div>
                    <RichTextEditor
                        value={htmlContent}
                        onChange={setHtmlContent}
                    />
                </div>
            )}

            {/* Block builder placeholder — shown when block mode is active on a new campaign */}
            {editorMode === "blocks" && !initialData && (
                <div className="rounded-lg border-2 border-dashed border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-950/20 p-8 text-center">
                    <Blocks className="w-10 h-10 text-indigo-400 dark:text-indigo-500 mx-auto mb-3" />
                    <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Block Builder opens after saving</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Fill in the name, brand, and subject above, then click Save Draft to open the visual editor.</p>
                </div>
            )}

            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800/50 flex justify-end">
                <Button type="submit" disabled={loading} className="bg-blue-600 text-white hover:bg-blue-700 gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {initialData ? 'Update Draft' : 'Save Draft'}
                </Button>
            </div>
        </form>
    );
}
