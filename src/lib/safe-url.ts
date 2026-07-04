import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

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

    // URL.hostname keeps IPv6 brackets ("[::1]") — strip them so the IPv6
    // checks below see the bare address.
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");

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

    // IP-literal host (v4 or v6) — check every private/loopback/link-local/
    // metadata/CGNAT range, including hex-form IPv4-mapped IPv6.
    if (isIP(host) && isPrivateIp(host)) {
        throw new Error("Refusing to fetch from internal/private hosts.");
    }

    // Named loopback / internal hostnames
    if (
        host === "localhost" ||
        host.endsWith(".localhost") ||
        host.endsWith(".internal")
    ) {
        throw new Error("Refusing to fetch from internal/private hosts.");
    }

    return url;
}

function isPrivateIPv4(ip: string): boolean {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
        return true; // malformed → treat as unsafe
    }
    const [a, b] = parts;
    return (
        a === 0 ||                              // "this network"
        a === 10 ||                             // RFC1918
        a === 127 ||                            // loopback
        (a === 100 && b >= 64 && b <= 127) ||   // CGNAT 100.64.0.0/10
        (a === 169 && b === 254) ||             // link-local / cloud metadata
        (a === 172 && b >= 16 && b <= 31) ||    // RFC1918
        (a === 192 && b === 168) ||             // RFC1918
        (a === 192 && b === 0) ||               // 192.0.0.0/24 (IETF protocol assignments)
        a >= 224                                // multicast + reserved
    );
}

function isPrivateIp(addr: string): boolean {
    const ip = addr.toLowerCase();
    if (ip.includes(":")) {
        if (ip === "::" || ip === "::1") return true;                    // unspecified / loopback
        if (ip.startsWith("fe80:")) return true;                         // link-local
        if (ip.startsWith("fc") || ip.startsWith("fd")) return true;     // unique-local fc00::/7
        // IPv4-mapped (::ffff:x). The WHATWG URL parser serializes these with
        // the low 32 bits as two hex groups (::ffff:a00:1 = 10.0.0.1), while
        // dns.lookup returns dotted form (::ffff:10.0.0.1) — handle both.
        if (ip.startsWith("::ffff:")) {
            const rest = ip.slice(7);
            if (rest.includes(".")) return isPrivateIPv4(rest);
            const groups = rest.split(":");
            if (groups.length === 2 && groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) {
                const hi = parseInt(groups[0], 16);
                const lo = parseInt(groups[1], 16);
                return isPrivateIPv4(`${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`);
            }
            return true; // unparseable mapped form → treat as unsafe
        }
        return false;
    }
    return isPrivateIPv4(ip);
}

/**
 * DNS-layer SSRF guard, complementing the string checks in safeOriginUrl():
 * a public-looking hostname (e.g. internal.attacker.com) can resolve to
 * 127.0.0.1 or 10.x and defeat every hostname check. Resolves the host and
 * rejects if ANY returned address is private/loopback/link-local/metadata.
 *
 * Note: the subsequent fetch() re-resolves DNS, so a fast-flux rebinding
 * attacker retains a small TOCTOU window — but this blocks the practical
 * "domain pointed at an internal IP" attack outright.
 */
export async function assertPublicHost(url: URL): Promise<void> {
    const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();

    // IP literal — validate directly, no DNS involved
    if (isIP(host)) {
        if (isPrivateIp(host)) {
            throw new Error("Refusing to fetch from internal/private hosts.");
        }
        return;
    }

    let addresses;
    try {
        addresses = await lookup(host, { all: true });
    } catch {
        throw new Error("Could not resolve that hostname.");
    }
    if (addresses.length === 0) {
        throw new Error("Could not resolve that hostname.");
    }
    for (const { address } of addresses) {
        if (isPrivateIp(address)) {
            throw new Error("Refusing to fetch from a host that resolves to an internal/private address.");
        }
    }
}
