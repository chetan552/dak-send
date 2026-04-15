import { redis } from "@/lib/queue";
import { NextRequest, NextResponse } from "next/server";

/**
 * Redis-backed sliding-window rate limiter for public (unauthenticated) endpoints.
 *
 * Returns a 429 NextResponse when the caller exceeds the limit, null otherwise.
 * Fails open (returns null) if Redis is unavailable to avoid blocking real traffic.
 *
 * @param req       - Incoming request (IP extracted from forwarded headers).
 * @param prefix    - Key prefix that identifies the endpoint, e.g. "unsubscribe".
 * @param max       - Max requests allowed per window (default 20).
 * @param windowSec - Window duration in seconds (default 60).
 */
export async function redisRateLimit(
    req: NextRequest,
    prefix: string,
    max = 20,
    windowSec = 60,
): Promise<NextResponse | null> {
    const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        req.headers.get("x-real-ip") ||
        "unknown";

    if (ip === "unknown") return null;

    const key = `rl:${prefix}:${ip}`;

    try {
        const count = await redis.incr(key);
        if (count === 1) {
            await redis.expire(key, windowSec);
        }
        if (count > max) {
            const ttl = await redis.ttl(key);
            return NextResponse.json(
                { error: "Too many requests. Please try again later." },
                {
                    status: 429,
                    headers: { "Retry-After": String(ttl > 0 ? ttl : windowSec) },
                },
            );
        }
    } catch {
        // Redis unavailable — fail open
    }

    return null;
}
