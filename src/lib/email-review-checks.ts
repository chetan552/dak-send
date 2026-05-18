/**
 * Pure deterministic checks for an email body before send.
 *
 * Runs entirely on the client against the current TipTap HTML. Cheap to
 * execute — safe to debounce-call on every keystroke.
 *
 * Pairs with the optional AI review (reviewCampaignDraft) — those checks
 * cover taste/tone/judgement; these cover hard rules and clerical mistakes.
 */

export type CheckStatus = "pass" | "warn" | "fail" | "info";

export interface CheckResult {
    id: string;
    label: string;
    status: CheckStatus;
    detail?: string;
}

/** Tokens recognised by src/lib/email-render.ts */
const KNOWN_TOKENS = new Set([
    "Name",
    "Email",
    "UnsubscribeUrl",
    "Unsubscribe",
    "PreferencesUrl",
]);

const SPAM_TRIGGERS = [
    "free", "guaranteed", "act now", "click here", "limited time",
    "buy now", "order now", "100%", "risk-free", "no obligation",
    "winner", "congratulations", "earn money", "make money", "cash bonus",
    "as seen on", "double your", "lowest price", "amazing", "miracle",
];

export interface CheckInput {
    html: string;
    subject?: string;
    /** Optional set of known custom field names. When provided, [CustomField:X] tokens are validated against it. */
    knownCustomFields?: string[];
}

export function runEmailChecks(input: CheckInput): CheckResult[] {
    const html = input.html || "";
    const subject = (input.subject || "").trim();
    const knownCfs = new Set((input.knownCustomFields || []).map(s => s.toLowerCase()));

    const checks: CheckResult[] = [];

    // ── 1. Empty body ────────────────────────────────────────────────────────
    const textOnly = stripHtml(html).trim();
    if (!textOnly) {
        checks.push({
            id: "empty",
            label: "Body has content",
            status: "fail",
            detail: "The email body is empty.",
        });
    } else if (textOnly.length < 30) {
        checks.push({
            id: "empty",
            label: "Body has content",
            status: "warn",
            detail: `Only ${textOnly.length} characters of text — most clients consider very short emails low quality.`,
        });
    } else {
        checks.push({ id: "empty", label: "Body has content", status: "pass" });
    }

    // ── 2. Subject ───────────────────────────────────────────────────────────
    if (subject !== undefined) {
        if (!subject) {
            checks.push({
                id: "subject",
                label: "Subject line set",
                status: "fail",
                detail: "Subject line is empty.",
            });
        } else if (subject.length > 80) {
            checks.push({
                id: "subject",
                label: "Subject line length",
                status: "warn",
                detail: `${subject.length} characters — mobile clients truncate around 40–60.`,
            });
        } else {
            checks.push({ id: "subject", label: "Subject line set", status: "pass" });
        }
    }

    // ── 3. Personalization tokens ────────────────────────────────────────────
    const tokens = extractTokens(html);
    const unknownTokens: string[] = [];
    const unknownCfs: string[] = [];

    for (const tok of tokens) {
        if (tok.startsWith("CustomField:")) {
            const fieldName = tok.slice("CustomField:".length).trim();
            if (knownCfs.size > 0 && !knownCfs.has(fieldName.toLowerCase())) {
                unknownCfs.push(fieldName);
            }
        } else if (!KNOWN_TOKENS.has(tok)) {
            unknownTokens.push(tok);
        }
    }

    if (unknownTokens.length === 0 && unknownCfs.length === 0) {
        checks.push({
            id: "tokens",
            label: "Personalization tokens valid",
            status: "pass",
            detail: tokens.length === 0
                ? "No merge tags used."
                : `${tokens.length} merge tag${tokens.length === 1 ? "" : "s"} all valid.`,
        });
    } else {
        const parts: string[] = [];
        if (unknownTokens.length > 0) {
            parts.push(`unknown token${unknownTokens.length === 1 ? "" : "s"}: ${unknownTokens.map(t => `[${t}]`).join(", ")}`);
        }
        if (unknownCfs.length > 0) {
            parts.push(`unknown custom field${unknownCfs.length === 1 ? "" : "s"}: ${unknownCfs.join(", ")}`);
        }
        checks.push({
            id: "tokens",
            label: "Personalization tokens",
            status: "fail",
            detail: `Will render as empty at send time — ${parts.join("; ")}.`,
        });
    }

    // ── 4. Orphan brackets / typos ───────────────────────────────────────────
    // Look for square-bracketed text that looks like a token attempt but
    // contains spaces or other oddities suggesting a typo.
    const orphans = findOrphanBracketTokens(html);
    if (orphans.length > 0) {
        checks.push({
            id: "orphans",
            label: "Token syntax",
            status: "warn",
            detail: `Possible mistyped merge tag${orphans.length === 1 ? "" : "s"}: ${orphans.map(o => `[${o}]`).join(", ")}.`,
        });
    }

    // ── 5. Unsubscribe link ──────────────────────────────────────────────────
    // The renderer auto-injects an unsubscribe footer if one isn't present,
    // so this is informational — but explicit is better for layout control.
    const hasUnsubExplicit =
        /\[Unsubscribe(?:Url)?\]/i.test(html) ||
        /\/api\/unsubscribe/i.test(html) ||
        /unsubscribe/i.test(stripHtml(html));
    checks.push({
        id: "unsubscribe",
        label: "Unsubscribe link",
        status: hasUnsubExplicit ? "pass" : "info",
        detail: hasUnsubExplicit
            ? undefined
            : "No explicit unsubscribe link — one will be auto-appended at send time.",
    });

    // ── 6. Images: alt text + absolute URLs ──────────────────────────────────
    const images = matchAll(html, /<img\b([^>]*)>/gi).map(m => m[1] || "");
    const imgsWithoutAlt: number[] = [];
    const imgsBadSrc: string[] = [];

    images.forEach((attrs, i) => {
        const altMatch = /\balt\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
        const altValue = altMatch ? (altMatch[1] ?? altMatch[2] ?? altMatch[3] ?? "") : null;
        if (altValue === null || altValue.trim() === "") {
            imgsWithoutAlt.push(i + 1);
        }
        const srcMatch = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
        const src = srcMatch ? (srcMatch[1] ?? srcMatch[2] ?? srcMatch[3] ?? "") : "";
        if (src && !isAbsoluteHttpUrl(src) && !src.startsWith("data:")) {
            imgsBadSrc.push(src);
        }
    });

    if (images.length === 0) {
        checks.push({ id: "images", label: "Images", status: "pass", detail: "No images." });
    } else {
        const issues: string[] = [];
        if (imgsWithoutAlt.length > 0) {
            issues.push(`${imgsWithoutAlt.length} image${imgsWithoutAlt.length === 1 ? "" : "s"} without alt text`);
        }
        if (imgsBadSrc.length > 0) {
            issues.push(`${imgsBadSrc.length} non-absolute src${imgsBadSrc.length === 1 ? "" : "s"} (e.g. ${truncate(imgsBadSrc[0], 40)})`);
        }
        if (issues.length === 0) {
            checks.push({ id: "images", label: `${images.length} image${images.length === 1 ? "" : "s"}`, status: "pass" });
        } else {
            checks.push({
                id: "images",
                label: "Images need attention",
                status: imgsBadSrc.length > 0 ? "fail" : "warn",
                detail: issues.join("; ") + ".",
            });
        }
    }

    // ── 7. Image-to-text ratio ───────────────────────────────────────────────
    if (images.length > 0 && textOnly.length > 0) {
        const ratio = images.length / Math.max(1, textOnly.length / 100);
        if (ratio > 1.5) {
            checks.push({
                id: "image_ratio",
                label: "Image-to-text ratio",
                status: "warn",
                detail: "Image-heavy emails are more likely to be flagged as spam. Add more body text.",
            });
        }
    }

    // ── 8. Links: hrefs valid ───────────────────────────────────────────────
    const anchors = matchAll(html, /<a\b([^>]*)>/gi).map(m => m[1] || "");
    const badAnchors: string[] = [];
    anchors.forEach(attrs => {
        const hrefMatch = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
        const href = hrefMatch ? (hrefMatch[1] ?? hrefMatch[2] ?? hrefMatch[3] ?? "") : "";
        if (!href || href === "#" || href.trim() === "") {
            badAnchors.push(href || "(missing)");
        }
    });
    if (anchors.length === 0) {
        // Nothing to check — silent pass
    } else if (badAnchors.length > 0) {
        checks.push({
            id: "links",
            label: "Links",
            status: "fail",
            detail: `${badAnchors.length} link${badAnchors.length === 1 ? "" : "s"} with empty or placeholder href.`,
        });
    } else {
        checks.push({ id: "links", label: `${anchors.length} link${anchors.length === 1 ? "" : "s"} OK`, status: "pass" });
    }

    // ── 9. Spam-trigger words & ALL CAPS ─────────────────────────────────────
    const lower = textOnly.toLowerCase();
    const matchedTriggers = SPAM_TRIGGERS.filter(t => lower.includes(t));
    const capsRatio = capsRatioOf(textOnly);
    const spamIssues: string[] = [];
    if (matchedTriggers.length > 2) {
        spamIssues.push(`${matchedTriggers.length} spam-trigger word${matchedTriggers.length === 1 ? "" : "s"} (e.g. "${matchedTriggers[0]}", "${matchedTriggers[1]}")`);
    }
    if (capsRatio > 0.3 && textOnly.length > 40) {
        spamIssues.push(`${Math.round(capsRatio * 100)}% of letters are uppercase`);
    }
    const exclaim = (textOnly.match(/!/g) || []).length;
    if (exclaim > 5) {
        spamIssues.push(`${exclaim} exclamation marks`);
    }
    if (spamIssues.length > 0) {
        checks.push({
            id: "spam",
            label: "Spam signals",
            status: "warn",
            detail: spamIssues.join("; ") + ".",
        });
    } else {
        checks.push({ id: "spam", label: "Spam signals", status: "pass" });
    }

    return checks;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
    return html
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ");
}

function extractTokens(html: string): string[] {
    // Match [Word] and [CustomField:Word]. Token bodies are letter/digit/colon/underscore/hyphen.
    const re = /\[([A-Za-z][A-Za-z0-9_\-]*(?::[A-Za-z0-9_\-\s]+)?)\]/g;
    const tokens: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) tokens.push(m[1]);
    return tokens;
}

function findOrphanBracketTokens(html: string): string[] {
    // Look for [some text] that looks intended-as-a-token but failed strict match.
    // We flag [Something With Spaces], [name] in unusual casing? -> too noisy. Stick to
    // strict heuristic: bracketed content under 30 chars that's not a known token and
    // contains letters but also unusual characters that wouldn't appear in a real token.
    const text = stripHtml(html);
    const re = /\[([^\[\]]{1,40})\]/g;
    const orphans = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
        const body = m[1];
        if (!body) continue;
        // Real tokens already matched by extractTokens — skip those by structure
        if (/^[A-Za-z][A-Za-z0-9_\-]*(?::[A-Za-z0-9_\-\s]+)?$/.test(body)) continue;
        // Looks like it might have been intended as a token if it starts with a capital
        // letter and contains mostly letters/spaces
        if (/^[A-Za-z]/.test(body) && /^[A-Za-z0-9 :_\-]+$/.test(body)) {
            orphans.add(body);
        }
    }
    return Array.from(orphans);
}

function isAbsoluteHttpUrl(url: string): boolean {
    return /^https?:\/\//i.test(url) && !/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(url);
}

function capsRatioOf(text: string): number {
    let letters = 0;
    let caps = 0;
    for (const ch of text) {
        if (/[A-Za-z]/.test(ch)) {
            letters++;
            if (/[A-Z]/.test(ch)) caps++;
        }
    }
    return letters === 0 ? 0 : caps / letters;
}

function matchAll(s: string, re: RegExp): RegExpExecArray[] {
    const results: RegExpExecArray[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(s)) !== null) {
        results.push(m);
        if (!re.global) break;
    }
    return results;
}

function truncate(s: string, n: number): string {
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// ── Summary helpers ─────────────────────────────────────────────────────────

export function summarizeChecks(checks: CheckResult[]): {
    fail: number;
    warn: number;
    pass: number;
    info: number;
    overall: CheckStatus;
} {
    const counts = { fail: 0, warn: 0, pass: 0, info: 0 };
    for (const c of checks) counts[c.status]++;
    const overall: CheckStatus =
        counts.fail > 0 ? "fail" :
        counts.warn > 0 ? "warn" :
        "pass";
    return { ...counts, overall };
}
