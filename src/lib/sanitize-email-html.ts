import * as cheerio from "cheerio";

// Always remove — no safe use in marketing/transactional email.
const UNSAFE_TAGS = ["script", "iframe", "object", "embed", "applet", "base", "form"];
const UNSAFE_ATTR_PREFIX = "on";

// Allowlist of URL schemes permitted on href/src/action. Anything else (data:,
// javascript:, vbscript:, file:, intent:, etc.) is stripped — data:image/svg+xml
// can carry inline <script> and the dashboard preview is HTML-rendered.
const SAFE_URL_SCHEMES = ["http:", "https:", "mailto:", "tel:", "cid:"];

function isSafeAttrUrl(raw: string): boolean {
    const trimmed = raw.trim();
    if (!trimmed) return true; // empty href is harmless
    // Relative URLs (no scheme) are fine
    if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return true;
    const lower = trimmed.toLowerCase();
    return SAFE_URL_SCHEMES.some((s) => lower.startsWith(s));
}

/**
 * Sanitize HTML pasted/fetched for use as email body or full email document.
 *
 * Preserves <style>, <meta charset>, <meta viewport>, <title>, and <link> by default —
 * these are routinely needed for email rendering. Strips scripts, iframes, forms,
 * on*="..." event handlers, javascript: URLs, and meta http-equiv=refresh.
 */
export function sanitizeEmailHtml(input: string): string {
    const html = (input || "").trim();
    if (!html) return "";

    const isFullDocument = /^\s*(<!doctype|<html\b)/i.test(html);
    const $ = cheerio.load(html);

    UNSAFE_TAGS.forEach((tag) => $(tag).remove());

    // meta http-equiv refresh redirects the client — strip those specifically,
    // but keep meta charset/viewport which are needed for email rendering.
    $("meta").each((_, el) => {
        const httpEquiv = $(el).attr("http-equiv");
        if (httpEquiv && httpEquiv.toLowerCase() === "refresh") {
            $(el).remove();
        }
    });

    $("*").each((_, el) => {
        const node = el as unknown as { type?: string; attribs?: Record<string, string> };
        if (node.type !== "tag") return;
        const attribs = node.attribs || {};
        for (const name of Object.keys(attribs)) {
            const lower = name.toLowerCase();
            const value = attribs[name];
            if (lower.startsWith(UNSAFE_ATTR_PREFIX)) {
                $(el).removeAttr(name);
                continue;
            }
            if (lower === "href" || lower === "src" || lower === "action") {
                if (!isSafeAttrUrl(value || "")) {
                    $(el).removeAttr(name);
                }
            }
        }
    });

    if (isFullDocument) {
        return $.html();
    }
    return $("body").html() || $.root().html() || "";
}
