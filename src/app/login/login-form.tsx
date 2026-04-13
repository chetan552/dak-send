"use client";

import { useState, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [totp, setTotp] = useState("");
    const [step, setStep] = useState<"credentials" | "totp">("credentials");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const totpRef = useRef<HTMLInputElement>(null);

    const handleCredentials = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await signIn("credentials", {
                redirect: false,
                email,
                password,
                totp: "",
            });

            if (res?.error === "2FA_REQUIRED") {
                setStep("totp");
                setLoading(false);
                setTimeout(() => totpRef.current?.focus(), 50);
                return;
            }

            if (res?.error) {
                setError(
                    res.error.includes("Too many")
                        ? res.error
                        : "Invalid email or password."
                );
                setLoading(false);
            } else {
                router.push("/dashboard");
            }
        } catch {
            setError("Something went wrong. Please try again.");
            setLoading(false);
        }
    };

    const handleTotp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await signIn("credentials", {
                redirect: false,
                email,
                password,
                totp,
            });

            if (res?.error) {
                setError(
                    res.error.includes("Too many")
                        ? res.error
                        : res.error === "Invalid authentication code."
                        ? "Invalid code. Check your authenticator app or use a recovery code."
                        : "Something went wrong."
                );
                setLoading(false);
            } else {
                router.push("/dashboard");
            }
        } catch {
            setError("Something went wrong. Please try again.");
            setLoading(false);
        }
    };

    if (step === "totp") {
        return (
            <form onSubmit={handleTotp} className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-white">Two-factor authentication</p>
                        <p className="text-xs text-zinc-400">{email}</p>
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 text-sm">
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="totp" className="text-zinc-300">
                        Authentication code
                    </Label>
                    <Input
                        ref={totpRef}
                        id="totp"
                        type="text"
                        inputMode="numeric"
                        value={totp}
                        onChange={(e) => setTotp(e.target.value)}
                        placeholder="000000"
                        required
                        maxLength={10}
                        className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-indigo-500 text-center text-2xl tracking-[0.4em] font-mono"
                    />
                    <p className="text-xs text-zinc-500">
                        Enter the 6-digit code from your authenticator app, or a recovery code.
                    </p>
                </div>

                <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-white text-black hover:bg-zinc-200 transition-colors font-medium text-base h-11 disabled:opacity-80"
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verifying...
                        </>
                    ) : (
                        "Verify"
                    )}
                </Button>

                <button
                    type="button"
                    onClick={() => { setStep("credentials"); setTotp(""); setError(""); }}
                    className="w-full flex items-center justify-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
            </form>
        );
    }

    return (
        <form onSubmit={handleCredentials} className="space-y-4">
            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 text-sm">
                    {error}
                </div>
            )}
            <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">Email</Label>
                <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="m@example.com"
                    required
                    className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-blue-500"
                />
            </div>
            <div className="space-y-2 pb-2">
                <Label htmlFor="password" className="text-zinc-300">Password</Label>
                <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-blue-500"
                />
            </div>
            <Button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black hover:bg-zinc-200 transition-colors font-medium text-base h-11 disabled:opacity-80"
            >
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                    </>
                ) : (
                    "Sign In"
                )}
            </Button>
        </form>
    );
}
