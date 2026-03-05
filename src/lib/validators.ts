export function isSafeWebhookUrl(urlStr: string): boolean {
    try {
        const parsed = new URL(urlStr);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

        // Basic hostname checks for SSRF
        const hostname = parsed.hostname.toLowerCase();

        // Block localhost and loopback
        if (hostname === 'localhost' || hostname.startsWith('127.') || hostname.startsWith('::1')) return false;

        // Block AWS metadata and common private IPs
        if (hostname === '169.254.169.254' || hostname.startsWith('169.254.') || hostname.startsWith('10.') || hostname.startsWith('192.168.')) {
            return false;
        }

        // Additional private IP ranges (172.16.0.0 - 172.31.255.255)
        if (hostname.startsWith('172.')) {
            const secondOctet = parseInt(hostname.split('.')[1], 10);
            if (secondOctet >= 16 && secondOctet <= 31) return false;
        }

        // Block 0.0.0.0
        if (hostname === '0.0.0.0') return false;

        return true;
    } catch {
        // Invalid URL
        return false;
    }
}
