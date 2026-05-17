import { createHmac, timingSafeEqual } from "crypto";

/**
 * HMAC-based URL signing used for click tracking and unsubscribe/preferences links
 * embedded in outbound emails. Prevents open-redirect abuse (anyone constructing a
 * `/api/track/click?url=...` URL pointing wherever they want) and prevents tampering
 * with subscriber IDs in unsubscribe links.
 *
 * Token format: base64url(JSON payload) + "." + base64url(HMAC-SHA256(payload, key))
 *
 * Each call site passes a `purpose` string that is mixed into the HMAC, so a token
 * signed for "click" cannot be replayed against the "unsubscribe" route.
 */

function getSecret(): string {
    const s = process.env.NEXTAUTH_SECRET || process.env.URL_SIGNING_SECRET;
    if (!s) {
        // In dev with no secret configured the worker would otherwise crash on
        // every send. Use a fixed dev fallback that's clearly unsafe so it's
        // obvious in tests/local; production deployments must set NEXTAUTH_SECRET.
        if (process.env.NODE_ENV !== "production") return "dev-only-unsigned-secret";
        throw new Error("NEXTAUTH_SECRET must be set to sign URLs in production");
    }
    return s;
}

function b64UrlEncode(buf: Buffer): string {
    return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64UrlDecode(str: string): Buffer {
    const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
    return Buffer.from(padded, "base64");
}

function hmac(payload: string, purpose: string): string {
    return b64UrlEncode(
        createHmac("sha256", getSecret()).update(purpose).update(".").update(payload).digest(),
    );
}

export function signToken<T extends Record<string, unknown>>(purpose: string, claims: T): string {
    const json = JSON.stringify(claims);
    const payload = b64UrlEncode(Buffer.from(json, "utf8"));
    const sig = hmac(payload, purpose);
    return `${payload}.${sig}`;
}

export function verifyToken<T = Record<string, unknown>>(purpose: string, token: string | null | undefined): T | null {
    if (!token || typeof token !== "string") return null;
    const idx = token.indexOf(".");
    if (idx <= 0 || idx === token.length - 1) return null;

    const payload = token.slice(0, idx);
    const provided = token.slice(idx + 1);
    const expected = hmac(payload, purpose);

    try {
        const a = b64UrlDecode(provided);
        const b = b64UrlDecode(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    } catch {
        return null;
    }

    try {
        const json = b64UrlDecode(payload).toString("utf8");
        return JSON.parse(json) as T;
    } catch {
        return null;
    }
}
