import * as cheerio from "cheerio";
import juice from "juice";
import { htmlToText } from "html-to-text";
import { EMAIL_BOILERPLATE } from "./email-boilerplate";
import { signToken } from "./sign-url";

export interface RenderEmailInput {
    /** Raw campaign HTML from TipTap editor (may be a bare fragment). */
    html: string;
    /** Stored plain-text version, if the author provided one. */
    plainText?: string | null;
    /** Campaign subject line (used in <title> of the wrapper). */
    subject: string;
    /** Merge-tag values for this individual recipient. */
    personalization: {
        name?: string | null;
        email: string;
        customFields?: Record<string, string>;
    };
    /**
     * When provided, open-tracking pixel and click-tracking wrapping are
     * applied. Omit (or pass undefined) for test sends so they don't
     * pollute analytics.
     * trackOpens/trackClicks default to true when not specified.
     */
    tracking?: {
        campaignId: string;
        baseUrl: string;
        trackOpens?: boolean;
        trackClicks?: boolean;
    };
    /** Full unsubscribe URL for this subscriber+list combination. */
    unsubscribeUrl: string;
    /**
     * Optional link to the subscriber preference center.
     * When provided, the [PreferencesUrl] merge tag is replaced and the
     * auto-injected footer shows both "Unsubscribe" and "Manage Preferences".
     */
    preferencesUrl?: string;
}

export interface RenderedEmail {
    /** Complete, CSS-inlined, Outlook-safe HTML ready to pass to SES. */
    html: string;
    /** Plain-text alternative for multipart/alternative. Always populated. */
    text: string;
}

// ---------------------------------------------------------------------------
// Personalization
// ---------------------------------------------------------------------------

function applyPersonalization(
    content: string,
    p: RenderEmailInput["personalization"],
    unsubscribeUrl: string,
    preferencesUrl?: string,
): string {
    let out = content
        .replace(/\[Name\]/gi, escapeHtml(p.name || "Friend"))
        .replace(/\[Email\]/gi, escapeHtml(p.email))
        .replace(/\[UnsubscribeUrl\]/gi, unsubscribeUrl)
        .replace(/\[Unsubscribe\]/gi, `<a href="${unsubscribeUrl}">Unsubscribe</a>`)
        .replace(/\[PreferencesUrl\]/gi, preferencesUrl || unsubscribeUrl);

    if (p.customFields) {
        out = out.replace(/\[CustomField:([^\]]+)\]/gi, (_match, fieldName: string) => {
            const key = Object.keys(p.customFields!).find(
                (k) => k.toLowerCase() === fieldName.toLowerCase(),
            );
            return key ? escapeHtml(p.customFields![key]) : "";
        });
    }

    return out;
}

// ---------------------------------------------------------------------------
// HTML pipeline
// ---------------------------------------------------------------------------

export function renderEmail(input: RenderEmailInput): RenderedEmail {
    const { subject, personalization, tracking, unsubscribeUrl, preferencesUrl } = input;

    // 1. Personalization on raw HTML first (before any wrapping/DOM parsing)
    const html = applyPersonalization(input.html, personalization, unsubscribeUrl, preferencesUrl);

    // 2. Parse with cheerio to work on DOM instead of fragile regexes.
    // Third arg `false` = don't auto-wrap in <html>/<body> (cheerio 1.x).
    const $ = cheerio.load(html, null, false);

    // 3. Detect whether the author already provided a full document
    const hasHtmlTag = $("html").length > 0;

    if (!hasHtmlTag) {
        // User authored a bare fragment — wrap in our Outlook-safe boilerplate.
        // Re-load as full document (third arg = true / default).
        const bodyContent = $.html();
        const wrapped = EMAIL_BOILERPLATE
            .replace("{{subject}}", escapeHtml(subject))
            .replace("{{preview}}", "")     // could add preview text later
            .replace("{{content}}", bodyContent);
        const $w = cheerio.load(wrapped, null, true);
        return finishPipeline($w, input, subject, tracking, unsubscribeUrl, personalization, preferencesUrl);
    }

    return finishPipeline($, input, subject, tracking, unsubscribeUrl, personalization, preferencesUrl);
}

function finishPipeline(
    $: cheerio.CheerioAPI,
    input: RenderEmailInput,
    subject: string,
    tracking: RenderEmailInput["tracking"],
    unsubscribeUrl: string,
    personalization: RenderEmailInput["personalization"],
    preferencesUrl?: string,
): RenderedEmail {
    // 4. Tracking pixel — only for real sends, not test sends
    if (tracking && tracking.trackOpens !== false) {
        const pixel = `<img src="${tracking.baseUrl}/api/track/open?cid=${tracking.campaignId}&email=${encodeURIComponent(personalization.email)}" width="1" height="1" border="0" alt="" style="height:1px;width:1px;min-height:1px;" />`;
        $("body").append(pixel);
    }

    // 5. Click-tracking href rewrite using DOM (not regex)
    if (tracking && tracking.trackClicks !== false) {
        $('a[href]').each((_i, el) => {
            const href = $(el).attr("href") || "";
            if (!href.startsWith("http")) return;
            if (href.includes("/api/unsubscribe")) return;
            // HMAC-sign (cid, email, url) so the click endpoint can't be abused
            // as an open redirect to arbitrary URLs.
            const token = signToken("click", {
                cid: tracking.campaignId,
                e: personalization.email,
                u: href,
            });
            const trackedUrl = `${tracking.baseUrl}/api/track/click?t=${encodeURIComponent(token)}`;
            $(el).attr("href", trackedUrl);
        });
    }

    // 6. Guarantee an unsubscribe link is present
    const hasUnsubscribeLink = $(`a[href*="/api/unsubscribe"]`).length > 0 ||
        $("body").html()?.includes(unsubscribeUrl);

    if (!hasUnsubscribeLink) {
        const prefsLink = preferencesUrl
            ? ` &middot; <a href="${preferencesUrl}" style="color:#666;text-decoration:underline;">Manage Preferences</a>`
            : "";
        const footer = `
<br>
<div style="text-align:center;font-size:12px;color:#666;padding:16px 0;">
  <p style="margin:0 0 4px;">You are receiving this email because you subscribed to our list.</p>
  <p style="margin:0;"><a href="${unsubscribeUrl}" style="color:#666;text-decoration:underline;">Unsubscribe</a>${prefsLink}</p>
</div>`;
        $("body").append(footer);
    }

    // 7. Serialize and inline CSS via juice
    const preInlineHtml = $.html();
    const finalHtml = juice(preInlineHtml, {
        preserveMediaQueries: true,
        removeStyleTags: false,
        webResources: { images: false, scripts: false, links: false },
    });

    // 8. Plain text alternative
    let text: string;
    if (input.plainText && input.plainText.trim()) {
        text = applyPersonalization(input.plainText, personalization, unsubscribeUrl, preferencesUrl);
    } else {
        text = htmlToText(finalHtml, {
            wordwrap: 78,
            selectors: [
                { selector: "img", format: "skip" },
                { selector: "a", options: { ignoreHref: false } },
                { selector: "head", format: "skip" },
                { selector: "style", format: "skip" },
            ],
        });
    }

    return { html: finalHtml, text };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * Build the List-Unsubscribe header values for a campaign send.
 * Returns an object with `listUnsubscribe` and `listUnsubscribePost` strings.
 */
export function buildUnsubscribeHeaders(unsubscribeUrl: string, fromEmail: string) {
    const domain = fromEmail.split("@")[1] || "example.com";
    return {
        listUnsubscribe: `<${unsubscribeUrl}>, <mailto:unsubscribe@${domain}?subject=unsubscribe>`,
        listUnsubscribePost: "List-Unsubscribe=One-Click",
    };
}
