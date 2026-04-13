"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, Eye, EyeOff } from "lucide-react";
import { updateProfile } from "@/app/actions/user";

interface EditProfileFormProps {
    currentName: string;
    currentEmail: string;
}

export function EditProfileForm({ currentName, currentEmail }: EditProfileFormProps) {
    const [name, setName] = useState(currentName);
    const [email, setEmail] = useState(currentEmail);
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const isDirty = name !== currentName || email !== currentEmail;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess(false);
        if (!isDirty) return;

        setLoading(true);
        try {
            const result = await updateProfile(name, email, password);
            if (result.emailChanged) {
                // JWT has the old email — must sign out so user re-authenticates
                await signOut({ callbackUrl: "/login" });
            } else {
                setSuccess(true);
                setPassword("");
                setTimeout(() => setSuccess(false), 3000);
            }
        } catch (err: any) {
            setError(err.message || "Failed to update profile.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div className="space-y-2">
                <Label htmlFor="profile-name" className="text-zinc-600 dark:text-zinc-300">Name</Label>
                <Input
                    id="profile-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="profile-email" className="text-zinc-600 dark:text-zinc-300">Email Address</Label>
                <Input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white"
                />
            </div>

            {isDirty && (
                <div className="space-y-2">
                    <Label htmlFor="profile-password" className="text-zinc-600 dark:text-zinc-300">
                        Current Password <span className="text-zinc-400 font-normal">(required to save changes)</span>
                    </Label>
                    <div className="relative">
                        <Input
                            id="profile-password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {email !== currentEmail && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                            Changing your email will sign you out — you&apos;ll log in with the new address.
                        </p>
                    )}
                </div>
            )}

            {error && (
                <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-md px-3 py-2">
                    {error}
                </div>
            )}

            {success && (
                <div className="text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-md px-3 py-2 flex items-center gap-2">
                    <Check className="w-4 h-4" /> Profile updated.
                </div>
            )}

            <Button
                type="submit"
                disabled={loading || !isDirty}
                className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
            </Button>
        </form>
    );
}
