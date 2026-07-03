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

    // Reject obfuscated IPv4 encodings that decode to a private/loopback address
    // but slip past the dotted-decimal prefix checks below:
    //   http://2130706433/    (decimal)   = 127.0.0.1
    //   http://0x7f000001/    (hex)        = 127.0.0.1
    //   http://0177.0.0.1/    (octal)      = 127.0.0.1
    // These forms are never legitimate for a user-pasted feed/import URL.
    if (/^0x[0-9a-f]+$/.test(host) || /^[0-9]+$/.test(host)) {
        throw new Error("Refusing to fetch from a numeric-encoded host.");
    }
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
        // Any octet with a leading zero is an octal escape; reject the whole address.
        if (host.split(".").some(oct => oct.length > 1 && oct.startsWith("0"))) {
            throw new Error("Refusing to fetch from an octal-encoded host.");
        }
    }

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
