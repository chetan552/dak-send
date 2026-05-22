"use client";

import { useState } from "react";
import { Languages, Loader2, Check } from "lucide-react";
import { translateCampaignDraft } from "@/app/actions/ai";
import { getBrandLanguage } from "@/lib/languages";

interface AiTranslateButtonProps {
    brandId: string;
    languageCode: string | null | undefined;
    getDraft: () => { subject: string; html: string };
    onTranslated: (next: { subject: string; html: string }) => void;
    disabled?: boolean;
}

export function AiTranslateButton({ brandId, languageCode, getDraft, onTranslated, disabled }: AiTranslateButtonProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const language = getBrandLanguage(languageCode);
    if (!language) return null;

    const handleClick = async () => {
        setLoading(true);
        setError(null);
        setSuccess(false);
        try {
            const draft = getDraft();
            const result = await translateCampaignDraft({
                brandId,
                subject: draft.subject,
                html: draft.html,
            });
            onTranslated({ subject: result.subject, html: result.html });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 2500);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to translate.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                type="button"
                onClick={handleClick}
                disabled={loading || disabled}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 dark:text-violet-300 hover:text-violet-900 dark:hover:text-violet-100 disabled:opacity-60"
            >
                {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : success ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                    <Languages className="w-3.5 h-3.5" />
                )}
                {loading
                    ? `Translating to ${language.label}...`
                    : success
                        ? `Translated to ${language.label}`
                        : `Translate to ${language.label} with AI`}
            </button>
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}
