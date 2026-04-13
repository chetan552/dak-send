"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, ShieldCheck, Shield, Eye, EyeOff, Copy, RefreshCw } from "lucide-react";
import {
    initiate2FASetup,
    enable2FA,
    disable2FA,
    regenerateRecoveryCodes,
} from "@/app/actions/2fa";

interface TwoFactorSetupProps {
    enabled: boolean;
    recoveryCodesLeft: number;
}

type View = "idle" | "setup-qr" | "setup-verify" | "recovery-new" | "disable" | "regen";

export function TwoFactorSetup({ enabled, recoveryCodesLeft }: TwoFactorSetupProps) {
    const [view, setView] = useState<View>("idle");
    const [qrCode, setQrCode] = useState("");
    const [secret, setSecret] = useState("");
    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [newCodes, setNewCodes] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

    const reset = () => { setView("idle"); setCode(""); setPassword(""); setError(""); setQrCode(""); setSecret(""); };

    const startSetup = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await initiate2FASetup();
            setQrCode(data.qrCode);
            setSecret(data.secret);
            setView("setup-qr");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const confirmEnable = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const result = await enable2FA(code);
            setNewCodes(result.recoveryCodes);
            setView("recovery-new");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const confirmDisable = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await disable2FA(password, code);
            reset();
            // Force a page reload so the parent re-fetches status
            window.location.reload();
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const confirmRegen = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const result = await regenerateRecoveryCodes(code);
            setNewCodes(result.recoveryCodes);
            setView("recovery-new");
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const copySecret = () => {
        navigator.clipboard.writeText(secret);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // ── Recovery codes display ─────────────────────────────────────────────────
    if (view === "recovery-new") {
        return (
            <div className="space-y-4 max-w-md">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Check className="w-5 h-5" />
                    <span className="font-semibold">2FA {newCodes.length > 0 && !enabled ? "enabled" : "updated"} successfully</span>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg p-4 space-y-3">
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                        Save your recovery codes now — they won&apos;t be shown again.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        {newCodes.map((c) => (
                            <code key={c} className="text-xs font-mono bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-900/50 rounded px-2 py-1 text-amber-800 dark:text-amber-300">
                                {c}
                            </code>
                        ))}
                    </div>
                    <p className="text-xs text-amber-600 dark:text-amber-500">
                        Each code can only be used once. Store them in a safe place.
                    </p>
                </div>
                <Button onClick={reset} className="bg-blue-600 text-white hover:bg-blue-700">Done</Button>
            </div>
        );
    }

    // ── Disable form ───────────────────────────────────────────────────────────
    if (view === "disable") {
        return (
            <form onSubmit={confirmDisable} className="space-y-4 max-w-md">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Enter your password and a TOTP code (or recovery code) to disable 2FA.
                </p>
                <div className="space-y-2">
                    <Label className="text-zinc-600 dark:text-zinc-300">Current Password</Label>
                    <div className="relative">
                        <Input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white pr-10"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label className="text-zinc-600 dark:text-zinc-300">Authentication Code</Label>
                    <Input
                        type="text"
                        inputMode="numeric"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="000000 or recovery code"
                        required
                        className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono"
                    />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="flex gap-2">
                    <Button type="submit" disabled={loading} className="bg-red-600 text-white hover:bg-red-700">
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Disable 2FA
                    </Button>
                    <Button type="button" variant="outline" onClick={reset}>Cancel</Button>
                </div>
            </form>
        );
    }

    // ── Regen recovery codes form ──────────────────────────────────────────────
    if (view === "regen") {
        return (
            <form onSubmit={confirmRegen} className="space-y-4 max-w-md">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Enter your current TOTP code to generate new recovery codes. Old codes will be invalidated.
                </p>
                <div className="space-y-2">
                    <Label className="text-zinc-600 dark:text-zinc-300">Authentication Code</Label>
                    <Input
                        type="text"
                        inputMode="numeric"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="000000"
                        required
                        className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono"
                    />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="flex gap-2">
                    <Button type="submit" disabled={loading} className="bg-blue-600 text-white hover:bg-blue-700">
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Generate New Codes
                    </Button>
                    <Button type="button" variant="outline" onClick={reset}>Cancel</Button>
                </div>
            </form>
        );
    }

    // ── Setup: show QR code ────────────────────────────────────────────────────
    if (view === "setup-qr") {
        return (
            <div className="space-y-4 max-w-md">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.), then click Continue.
                </p>
                {qrCode && (
                    <div className="p-3 bg-white rounded-xl inline-block border border-zinc-200 dark:border-zinc-700">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrCode} alt="TOTP QR code" width={200} height={200} />
                    </div>
                )}
                <div className="space-y-1">
                    <p className="text-xs text-zinc-500">Or enter this key manually:</p>
                    <div className="flex items-center gap-2">
                        <code className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-700 dark:text-zinc-300 break-all">
                            {secret}
                        </code>
                        <button type="button" onClick={copySecret} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 flex-shrink-0">
                            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setView("setup-verify")} className="bg-blue-600 text-white hover:bg-blue-700">Continue</Button>
                    <Button variant="outline" onClick={reset}>Cancel</Button>
                </div>
            </div>
        );
    }

    // ── Setup: verify code ─────────────────────────────────────────────────────
    if (view === "setup-verify") {
        return (
            <form onSubmit={confirmEnable} className="space-y-4 max-w-md">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Enter the 6-digit code from your authenticator app to confirm setup.
                </p>
                <div className="space-y-2">
                    <Label className="text-zinc-600 dark:text-zinc-300">Verification Code</Label>
                    <Input
                        type="text"
                        inputMode="numeric"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="000000"
                        required
                        maxLength={6}
                        autoFocus
                        className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono text-center text-xl tracking-widest"
                    />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="flex gap-2">
                    <Button type="submit" disabled={loading} className="bg-blue-600 text-white hover:bg-blue-700">
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Enable 2FA
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setView("setup-qr")}>Back</Button>
                </div>
            </form>
        );
    }

    // ── Idle: status card ──────────────────────────────────────────────────────
    return (
        <div className="space-y-4 max-w-md">
            {enabled ? (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="w-5 h-5" />
                        <span className="font-semibold text-sm">Two-factor authentication is enabled</span>
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Recovery codes remaining: <strong>{recoveryCodesLeft}</strong>
                        {recoveryCodesLeft <= 2 && (
                            <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">
                                — running low, regenerate soon
                            </span>
                        )}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setView("regen"); setError(""); setCode(""); }}
                            className="border-zinc-200 dark:border-zinc-700"
                        >
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Regenerate Recovery Codes
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setView("disable"); setError(""); setCode(""); setPassword(""); }}
                            className="border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                            Disable 2FA
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                        <Shield className="w-5 h-5" />
                        <span className="font-semibold text-sm">Two-factor authentication is not enabled</span>
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Add an extra layer of security to your account with an authenticator app.
                    </p>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <Button
                        onClick={startSetup}
                        disabled={loading}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Set Up 2FA
                    </Button>
                </div>
            )}
        </div>
    );
}
