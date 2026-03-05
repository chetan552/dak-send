"use client";

import { useState } from "react";
import { incrementFormSubmissions } from "@/app/actions/signup-form";

interface PublicSignupFormProps {
    form: any;
    config: any;
}

export function PublicSignupForm({ form, config }: PublicSignupFormProps) {
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");

        const formData = new FormData(e.currentTarget);

        try {
            const bodyData = Object.fromEntries(formData.entries());
            const res = await fetch("/api/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...bodyData,
                    listId: form.listId,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Something went wrong.");
                setSubmitting(false);
                return;
            }

            // Track submission
            await incrementFormSubmissions(form.id);

            if (config.redirectUrl) {
                window.location.href = config.redirectUrl;
                return;
            }

            setSubmitted(true);
        } catch (err) {
            setError("Network error. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="text-center py-8 animate-in fade-in zoom-in-95 duration-300">
                <div className="text-4xl mb-4">🎉</div>
                <h2 style={{ color: config.textColor }} className="text-xl font-bold mb-2">{config.successMessage}</h2>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-sm">
            <h2 style={{ color: config.textColor }} className="text-2xl font-bold mb-2">{config.headline}</h2>
            <p style={{ color: config.textColor, opacity: 0.6 }} className="text-sm mb-6">{config.description}</p>

            {config.collectName && (
                <input
                    type="text"
                    name="name"
                    placeholder="Your name"
                    className="w-full px-3 py-2.5 mb-2 rounded-lg border border-zinc-300 text-sm bg-white/90 text-zinc-900 focus:ring-2 focus:ring-offset-0 outline-none transition-all"
                    style={{ focusRingColor: config.accentColor } as any}
                />
            )}

            <input
                type="email"
                name="email"
                placeholder="Email address"
                required
                className="w-full px-3 py-2.5 mb-2 rounded-lg border border-zinc-300 text-sm bg-white/90 text-zinc-900 focus:ring-2 focus:ring-offset-0 outline-none transition-all"
            />

            {form.list?.customFields?.length > 0 && (
                <div className="flex flex-col gap-2 w-full mb-3 text-left">
                    {form.list.customFields.map((field: any) => (
                        <div key={field.id} className="w-full">
                            {field.type !== "boolean" && (
                                <label className="block text-xs font-semibold mb-1" style={{ color: config.textColor, opacity: 0.8 }}>
                                    {field.name} {field.required && <span className="text-red-500">*</span>}
                                </label>
                            )}

                            {(field.type === "text" || field.type === "number" || field.type === "date") && (
                                <input
                                    type={field.type}
                                    name={`cf_${field.id}`}
                                    required={field.required}
                                    placeholder={field.name}
                                    className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm bg-white/90 text-zinc-900 focus:ring-2 focus:ring-offset-0 outline-none transition-all"
                                />
                            )}

                            {field.type === "select" && (
                                <select
                                    name={`cf_${field.id}`}
                                    required={field.required}
                                    className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm bg-white/90 text-zinc-900 focus:ring-2 focus:ring-offset-0 outline-none transition-all"
                                >
                                    <option value="">Select {field.name.toLowerCase()}</option>
                                    {field.options?.split(",").map((opt: string) => (
                                        <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                                    ))}
                                </select>
                            )}

                            {field.type === "boolean" && (
                                <label className="flex items-start gap-2 cursor-pointer mt-1">
                                    <input
                                        type="checkbox"
                                        name={`cf_${field.id}`}
                                        value="true"
                                        required={field.required}
                                        className="mt-0.5 rounded border-zinc-300 focus:ring-2"
                                        style={{ color: config.accentColor } as any}
                                    />
                                    <span className="text-xs" style={{ color: config.textColor, opacity: 0.7 }}>
                                        {field.name} {field.required && <span className="text-red-500">*</span>}
                                    </span>
                                </label>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {form.list?.requireGdpr && (
                <label className="flex items-start gap-2 mb-3 cursor-pointer">
                    <input type="checkbox" name="gdpr" value="yes" required className="mt-0.5 rounded border-zinc-300 text-teal-600 focus:ring-teal-500" />
                    <span className="text-xs" style={{ color: config.textColor, opacity: 0.7 }}>
                        I consent to receiving emails and agree to the privacy policy.
                    </span>
                </label>
            )}

            {error && (
                <div className="p-2 mb-2 rounded-lg bg-red-50 text-red-600 text-xs">{error}</div>
            )}

            <button
                type="submit"
                disabled={submitting}
                style={{ backgroundColor: config.accentColor }}
                className="w-full py-2.5 rounded-lg text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
            >
                {submitting ? "Subscribing..." : config.buttonText}
            </button>

            {config.showBranding && (
                <p className="text-center text-[10px] mt-4" style={{ color: config.textColor, opacity: 0.3 }}>
                    Powered by DakSend
                </p>
            )}
        </form>
    );
}
