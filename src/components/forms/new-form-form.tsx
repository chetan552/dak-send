"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { FileInput, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createSignupForm } from "@/app/actions/signup-form";

interface NewFormFormProps {
    brands: { id: string; name: string; lists: { id: string; name: string }[] }[];
}

export function NewFormForm({ brands }: NewFormFormProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [brandId, setBrandId] = useState(brands.length === 1 ? brands[0].id : "");
    const [listId, setListId] = useState("");
    const [error, setError] = useState("");

    const selectedBrand = brands.find(b => b.id === brandId);

    const handleNameChange = (val: string) => {
        setName(val);
        // Auto-generate slug from name
        setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!name.trim() || !slug.trim() || !brandId || !listId) {
            setError("All fields are required.");
            return;
        }

        startTransition(async () => {
            try {
                const form = await createSignupForm({ name, slug, brandId, listId });
                router.push(`/dashboard/forms/${form.id}`);
            } catch (err: any) {
                setError(err.message || "Failed to create form.");
            }
        });
    };

    return (
        <div className="max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400 mb-2">
                <Link href="/dashboard/forms" className="hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Forms
                </Link>
            </div>

            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-1 flex items-center gap-3">
                    <FileInput className="w-7 h-7 text-teal-500" />
                    New Signup Form
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Choose a brand and list, then customize your form.
                </p>
            </div>

            <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800">
                <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Form Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                placeholder="e.g. Newsletter Signup, Early Access"
                                className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">URL Slug</label>
                            <div className="flex items-center gap-0">
                                <span className="px-3 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-r-0 border-zinc-300 dark:border-zinc-700 rounded-l-lg text-sm text-zinc-500 dark:text-zinc-400 whitespace-nowrap">/f/</span>
                                <input
                                    type="text"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                                    placeholder="my-newsletter"
                                    className="w-full px-3 py-2.5 rounded-r-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm font-mono"
                                />
                            </div>
                            <p className="text-xs text-zinc-500 mt-1">Public URL for your signup form</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Brand</label>
                            <select
                                value={brandId}
                                onChange={(e) => {
                                    setBrandId(e.target.value);
                                    setListId("");
                                }}
                                className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm"
                            >
                                <option value="">Select a brand...</option>
                                {brands.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Target List</label>
                            <select
                                value={listId}
                                onChange={(e) => setListId(e.target.value)}
                                disabled={!selectedBrand}
                                className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm disabled:opacity-50"
                            >
                                <option value="">Select a list...</option>
                                {selectedBrand?.lists.map(l => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                            </select>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-sm">{error}</div>
                        )}

                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full py-2.5 px-4 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
                        >
                            {isPending ? "Creating..." : "Create Form & Customize →"}
                        </button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
