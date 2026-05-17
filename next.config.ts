import type { NextConfig } from "next";

const SECURITY_HEADERS = [
    // Block render-as-frame for clickjacking (legacy header, still respected)
    { key: "X-Frame-Options", value: "DENY" },
    // Stop MIME sniffing — uploaded files served as their declared type only
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Don't leak full URLs (which include tokens like ?s=...) on outbound links
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // Default-deny most browser features the dashboard doesn't use
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    // Cloudflare adds HSTS at the edge; this is a safe fallback if Cloudflare is bypassed
    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
    output: "standalone",
    async headers() {
        return [
            { source: "/:path*", headers: SECURITY_HEADERS },
        ];
    },
};

export default nextConfig;
