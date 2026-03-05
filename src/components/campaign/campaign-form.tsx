"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/campaign/rich-text-editor";
import { TemplatePicker } from "@/components/campaign/template-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { createCampaignDraft, updateCampaignDraft } from "@/app/actions/campaign";
import { useRouter } from "next/navigation";

interface CampaignFormProps {
    brands: any[];
    initialData?: any;
}

export function CampaignForm({ brands, initialData }: CampaignFormProps) {
    const [loading, setLoading] = useState(false);
    const [htmlContent, setHtmlContent] = useState(initialData?.htmlText || "");
    const router = useRouter();

    // Load template HTML from sessionStorage (set by Template Library)
    useEffect(() => {
        if (typeof window !== "undefined" && !initialData) {
            const templateHtml = sessionStorage.getItem("template_html");
            if (templateHtml) {
                setHtmlContent(templateHtml);
                sessionStorage.removeItem("template_html");
            }
        }
    }, [initialData]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData(e.currentTarget);
            formData.set("htmlText", htmlContent);

            if (initialData) {
                await updateCampaignDraft(initialData.id, formData);
                router.push("/dashboard/campaigns");
            } else {
                const campaign = await createCampaignDraft(formData);
                router.push(`/dashboard/campaigns/${campaign.id}`);
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
                    <Select name="brandId" defaultValue={initialData?.brandId || (brands.length === 1 ? brands[0].id : undefined)} disabled={!!initialData}>
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
                <Input id="subject" name="subject" defaultValue={initialData?.subject} placeholder="Don't miss out on our biggest sale of the year!" required className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white shadow-sm" />
            </div>

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

            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800/50 flex justify-end">
                <Button type="submit" disabled={loading} className="bg-blue-600 text-white hover:bg-blue-700 gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {initialData ? 'Update Draft' : 'Save Draft'}
                </Button>
            </div>
        </form>
    );
}
