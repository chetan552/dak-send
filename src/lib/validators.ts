import { safeOriginUrl } from "@/lib/safe-url";

/**
 * Boolean wrapper around safeOriginUrl() for webhook destinations.
 * Delegating keeps a single SSRF blocklist: numeric/hex/octal-encoded hosts,
 * IPv6 loopback/link-local/unique-local, .localhost/.internal suffixes and
 * all private IPv4 ranges are rejected in one place.
 */
export function isSafeWebhookUrl(urlStr: string): boolean {
    try {
        safeOriginUrl(urlStr);
        return true;
    } catch {
        return false;
    }
}
