import { test } from "node:test";
import assert from "node:assert/strict";
import { safeOriginUrl, assertPublicHost } from "./safe-url";
import { isSafeWebhookUrl } from "./validators";

// ---------------------------------------------------------------------------
// String-level SSRF blocklist (safeOriginUrl / isSafeWebhookUrl).
// These run offline — no DNS — and cover the URL forms an attacker can hand-craft.
// ---------------------------------------------------------------------------

const BLOCKED: string[] = [
    // Named loopback / internal
    "http://localhost/",
    "http://localhost:6379/",
    "http://foo.localhost/",
    "http://db.internal/hook",
    // IPv4 loopback / private / metadata / CGNAT / unspecified
    "http://127.0.0.1/",
    "http://10.1.2.3/",
    "http://172.16.0.1/",
    "http://172.31.255.255/",
    "http://192.168.1.1/",
    "http://169.254.169.254/",     // AWS/GCP metadata
    "http://100.64.1.1/",          // CGNAT 100.64/10
    "http://0.0.0.0/",
    // Encoded IPv4 that decodes to 127.0.0.1
    "http://2130706433/",          // decimal
    "http://0x7f000001/",          // hex
    "http://0177.0.0.1/",          // octal
    // IPv6 loopback / link-local / unique-local / IPv4-mapped
    "http://[::1]/",
    "http://[fe80::1]/",
    "http://[fd00::1]/",
    "http://[fc00::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://[::ffff:10.0.0.1]/",
    // Non-http(s) schemes
    "ftp://example.com/",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "gopher://127.0.0.1/",
    // Garbage
    "not a url",
];

const ALLOWED: string[] = [
    "https://example.com/feed.xml",
    "https://hooks.slack.com/services/T/B/x",
    "http://8.8.8.8/",              // public IP literal
    "https://sub.domain.co.uk/path?q=1",
];

test("safeOriginUrl rejects private/loopback/encoded/non-http hosts", () => {
    for (const url of BLOCKED) {
        assert.throws(() => safeOriginUrl(url), new RegExp(".*"), `expected block: ${url}`);
    }
});

test("safeOriginUrl allows public http/https hosts", () => {
    for (const url of ALLOWED) {
        assert.doesNotThrow(() => safeOriginUrl(url), `expected allow: ${url}`);
    }
});

test("isSafeWebhookUrl agrees with safeOriginUrl (single blocklist)", () => {
    for (const url of BLOCKED) {
        assert.equal(isSafeWebhookUrl(url), false, `expected block: ${url}`);
    }
    for (const url of ALLOWED) {
        assert.equal(isSafeWebhookUrl(url), true, `expected allow: ${url}`);
    }
});

// ---------------------------------------------------------------------------
// DNS-layer guard (assertPublicHost) — defeats a public hostname whose A/AAAA
// record points at an internal address (DNS-rebinding style SSRF).
// ---------------------------------------------------------------------------

test("assertPublicHost blocks IP literals in every private range", async () => {
    for (const url of [
        "http://127.0.0.1/",
        "http://169.254.169.254/",
        "http://10.0.0.1/",
        "http://[::1]/",
        "http://[::ffff:10.0.0.1]/",
    ]) {
        await assert.rejects(() => assertPublicHost(new URL(url)), `expected block: ${url}`);
    }
});

test("assertPublicHost blocks a public name resolving to loopback", async () => {
    // localtest.me is a public DNS name that resolves to 127.0.0.1 — the exact
    // rebinding shape the string checks miss.
    await assert.rejects(() => assertPublicHost(new URL("http://localtest.me/")));
});

test("assertPublicHost allows a genuinely public host", async () => {
    await assert.doesNotThrow(async () => assertPublicHost(new URL("https://example.com/")));
});
