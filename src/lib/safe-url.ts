/**
 * Parse and validate a user-supplied URL for outbound fetch, blocking SSRF
 * targets (localhost, loopback, link-local, RFC1918 private ranges, AWS metadata).
 * Returns the parsed URL on success; throws on any unsafe input.
 */
export function safeOriginUrl(raw: string): URL {
    let url: URL;
    try {
        url = new URL(raw);
    } catch {
        throw new Error("That doesn't look like a valid URL.");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("Only http and https URLs are supported.");
    }

    // URL.hostname strips IPv6 brackets, so "[::1]" → "::1"
    const host = url.hostname.toLowerCase();

    // IPv6 loopback / link-local / unique-local / IPv4-mapped loopback
    if (
        host === "::1" ||
        host.startsWith("fe80:") ||
        host.startsWith("fc") ||
        host.startsWith("fd") ||
        /^::ffff:(127|10|0|169\.254|192\.168|172\.(1[6-9]|2[0-9]|3[01]))\./.test(host)
    ) {
        throw new Error("Refusing to fetch from internal/private hosts.");
    }

    // IPv4 + named loopback / private ranges / AWS-style metadata service
    if (
        host === "localhost" ||
        host === "0.0.0.0" ||
        host.endsWith(".localhost") ||
        host.endsWith(".internal") ||
        host.startsWith("127.") ||
        host.startsWith("10.") ||
        host.startsWith("192.168.") ||
        /^169\.254\./.test(host) ||
        /^172\.(1[6-9]|2[0-9]|3[01])\./.test(host)
    ) {
        throw new Error("Refusing to fetch from internal/private hosts.");
    }

    return url;
}
