"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Keyboard, RotateCcw, Check } from "lucide-react";
import {
    DEFAULT_THEME_SHORTCUT,
    getStoredShortcut,
    parseShortcut,
    setStoredShortcut,
    formatShortcut,
} from "@/lib/theme-shortcut";

function subscribeShortcut(cb: () => void) {
    if (typeof window === "undefined") return () => {};
    window.addEventListener("daksend:theme-shortcut-changed", cb);
    window.addEventListener("storage", cb);
    return () => {
        window.removeEventListener("daksend:theme-shortcut-changed", cb);
        window.removeEventListener("storage", cb);
    };
}

export function ThemeShortcutInput() {
    const shortcut = useSyncExternalStore(
        subscribeShortcut,
        () => getStoredShortcut(),
        () => DEFAULT_THEME_SHORTCUT,
    );
    const [recording, setRecording] = useState(false);
    const [saved, setSaved] = useState(false);
    const inputRef = useRef<HTMLDivElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!recording) return;
        e.preventDefault();
        const key = e.key.toLowerCase();
        if (["control", "meta", "alt", "shift"].includes(key) || key === "tab" || key === "escape") {
            if (key === "escape") {
                setRecording(false);
                inputRef.current?.blur();
            }
            return;
        }
        const parts: string[] = [];
        if (e.ctrlKey) parts.push("ctrl");
        if (e.metaKey) parts.push("meta");
        if (e.altKey) parts.push("alt");
        if (e.shiftKey) parts.push("shift");
        parts.push(key);
        const spec = parts.join("+");
        setStoredShortcut(spec);
        setRecording(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        inputRef.current?.blur();
    };

    const handleReset = () => {
        setStoredShortcut(DEFAULT_THEME_SHORTCUT);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const display = formatShortcut(parseShortcut(shortcut));

    return (
        <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 shadow-sm">
            <CardHeader>
                <CardTitle className="text-xl text-zinc-900 dark:text-white flex items-center gap-2">
                    <Keyboard className="w-5 h-5 text-zinc-600 dark:text-zinc-400" /> Keyboard Shortcuts
                </CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400">
                    Customize how you control the dashboard. Stored locally on this browser.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Toggle light / dark mode</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Click below and press a key combination.
                        </p>
                    </div>
                    <div
                        ref={inputRef}
                        tabIndex={0}
                        role="button"
                        aria-label="Recording keyboard shortcut"
                        onClick={() => setRecording(true)}
                        onFocus={() => setRecording(true)}
                        onBlur={() => setRecording(false)}
                        onKeyDown={handleKeyDown}
                        className={`min-w-[160px] px-4 py-2 rounded-lg text-center font-mono text-sm cursor-pointer transition-colors border ${
                            recording
                                ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300"
                                : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600"
                        }`}
                    >
                        {recording ? "Press keys..." : display || DEFAULT_THEME_SHORTCUT}
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                        className="border-zinc-200 dark:border-zinc-700 gap-2"
                        title="Reset to default"
                    >
                        <RotateCcw className="w-3.5 h-3.5" /> Reset
                    </Button>
                </div>
                {saved && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" /> Saved
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
