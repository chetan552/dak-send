"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Check } from "lucide-react";
import { set2FAPolicy, type TwoFactorPolicy } from "@/app/actions/2fa";

const OPTIONS: { value: TwoFactorPolicy; label: string; description: string }[] = [
    {
        value: "off",
        label: "Disabled",
        description: "2FA is not available. Users cannot set it up.",
    },
    {
        value: "optional",
        label: "Optional",
        description: "Users can enable 2FA but are not required to.",
    },
    {
        value: "required",
        label: "Required",
        description: "All users must set up 2FA. They can log in but will be prompted to configure it.",
    },
];

interface TwoFactorPolicyProps {
    currentPolicy: TwoFactorPolicy;
}

export function TwoFactorPolicyControl({ currentPolicy }: TwoFactorPolicyProps) {
    const [selected, setSelected] = useState<TwoFactorPolicy>(currentPolicy);
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");

    const handleSave = async () => {
        if (selected === currentPolicy) return;
        setLoading(true);
        setError("");
        try {
            await set2FAPolicy(selected);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-3 max-w-md">
            {OPTIONS.map((opt) => (
                <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selected === opt.value
                            ? "border-blue-500 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                >
                    <input
                        type="radio"
                        name="2fa-policy"
                        value={opt.value}
                        checked={selected === opt.value}
                        onChange={() => setSelected(opt.value)}
                        className="mt-0.5 accent-blue-600"
                    />
                    <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">{opt.label}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{opt.description}</p>
                    </div>
                </label>
            ))}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex items-center gap-3">
                <Button
                    onClick={handleSave}
                    disabled={loading || selected === currentPolicy}
                    className="disabled:opacity-50"
                >
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Policy
                </Button>
                {saved && (
                    <span className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="w-4 h-4" /> Saved
                    </span>
                )}
            </div>
        </div>
    );
}
