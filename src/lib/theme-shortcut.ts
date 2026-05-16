export const THEME_SHORTCUT_KEY = "daksend.themeShortcut";
export const DEFAULT_THEME_SHORTCUT = "ctrl+shift+d";

export interface ParsedShortcut {
    ctrl: boolean;
    meta: boolean;
    alt: boolean;
    shift: boolean;
    key: string;
}

export function parseShortcut(spec: string): ParsedShortcut | null {
    const parts = spec
        .toLowerCase()
        .split("+")
        .map((p) => p.trim())
        .filter(Boolean);
    if (parts.length === 0) return null;

    const out: ParsedShortcut = { ctrl: false, meta: false, alt: false, shift: false, key: "" };
    for (const p of parts) {
        if (p === "ctrl" || p === "control") out.ctrl = true;
        else if (p === "meta" || p === "cmd" || p === "command" || p === "win") out.meta = true;
        else if (p === "alt" || p === "option" || p === "opt") out.alt = true;
        else if (p === "shift") out.shift = true;
        else out.key = p;
    }
    if (!out.key) return null;
    return out;
}

export function eventMatchesShortcut(e: KeyboardEvent, shortcut: ParsedShortcut): boolean {
    if (shortcut.ctrl !== e.ctrlKey) return false;
    if (shortcut.meta !== e.metaKey) return false;
    if (shortcut.alt !== e.altKey) return false;
    if (shortcut.shift !== e.shiftKey) return false;
    return e.key.toLowerCase() === shortcut.key;
}

export function formatShortcut(s: ParsedShortcut | null): string {
    if (!s) return "";
    const parts: string[] = [];
    if (s.ctrl) parts.push("Ctrl");
    if (s.meta) parts.push("Cmd");
    if (s.alt) parts.push("Alt");
    if (s.shift) parts.push("Shift");
    parts.push(s.key.length === 1 ? s.key.toUpperCase() : s.key);
    return parts.join("+");
}

export function getStoredShortcut(): string {
    if (typeof window === "undefined") return DEFAULT_THEME_SHORTCUT;
    return localStorage.getItem(THEME_SHORTCUT_KEY) || DEFAULT_THEME_SHORTCUT;
}

export function setStoredShortcut(spec: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(THEME_SHORTCUT_KEY, spec);
    window.dispatchEvent(new Event("daksend:theme-shortcut-changed"));
}
