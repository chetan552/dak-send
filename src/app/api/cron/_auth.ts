import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * Verify the cron secret using a constant-time comparison.
 *
 * Accepted forms (in priority order):
 *   1. Authorization: Bearer <secret>  (preferred — not logged by proxies)
 *   2. ?secret=<secret>                (legacy — kept for backward compat)
 *
 * In production, CRON_SECRET MUST be set. In development, requests are
 * allowed through when no secret is configured so local testing stays easy.
 */
export function verifyCronSecret(req: NextRequest): NextResponse | null {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        if (process.env.NODE_ENV === "production") {
            // Refuse all cron requests in production if the secret is missing —
            // better to break loudly than silently expose unauthenticated endpoints.
            return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 403 });
        }
        return null; // Dev/test: open without a secret
    }

    // Extract the provided secret from Authorization header or query param
    const authHeader = req.headers.get("authorization") ?? "";
    const provided = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : (req.nextUrl.searchParams.get("secret") ?? "");

    const valid =
        provided.length === cronSecret.length &&
        timingSafeEqual(Buffer.from(provided), Buffer.from(cronSecret));

    if (!valid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return null;
}
