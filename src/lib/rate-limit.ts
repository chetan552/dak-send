/**
 * Simple in-memory rate limiter for login attempts.
 *
 * Tracks failed attempts per IP. After MAX_ATTEMPTS failures within
 * WINDOW_MS, further attempts are blocked for BLOCK_MS.
 *
 * In-memory is appropriate here because:
 * - The worker is a single persistent process on the Pi
 * - Login rate limiting doesn't need to survive restarts
 * - No extra dependencies needed
 */

const MAX_ATTEMPTS = 5;          // failures before lockout
const WINDOW_MS = 10 * 60 * 1000; // 10 minute sliding window
const BLOCK_MS = 15 * 60 * 1000;  // 15 minute lockout

interface Entry {
    attempts: number;
    firstAttemptAt: number;
    blockedUntil?: number;
}

const store = new Map<string, Entry>();

// Clean up old entries every 30 minutes to prevent memory leak
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
        const expired = entry.blockedUntil
            ? now > entry.blockedUntil
            : now - entry.firstAttemptAt > WINDOW_MS;
        if (expired) store.delete(key);
    }
}, 30 * 60 * 1000);

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry) {
        return { allowed: true };
    }

    // Currently blocked
    if (entry.blockedUntil) {
        if (now < entry.blockedUntil) {
            return {
                allowed: false,
                retryAfterSeconds: Math.ceil((entry.blockedUntil - now) / 1000),
            };
        }
        // Block expired — reset
        store.delete(ip);
        return { allowed: true };
    }

    // Window expired — reset
    if (now - entry.firstAttemptAt > WINDOW_MS) {
        store.delete(ip);
        return { allowed: true };
    }

    return { allowed: true };
}

export function recordFailedAttempt(ip: string): void {
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry) {
        store.set(ip, { attempts: 1, firstAttemptAt: now });
        return;
    }

    // Window expired — start fresh
    if (now - entry.firstAttemptAt > WINDOW_MS) {
        store.set(ip, { attempts: 1, firstAttemptAt: now });
        return;
    }

    const attempts = entry.attempts + 1;

    if (attempts >= MAX_ATTEMPTS) {
        store.set(ip, { ...entry, attempts, blockedUntil: now + BLOCK_MS });
    } else {
        store.set(ip, { ...entry, attempts });
    }
}

export function recordSuccessfulLogin(ip: string): void {
    store.delete(ip);
}
