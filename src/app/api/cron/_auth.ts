import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * Verify the ?secret= query param against CRON_SECRET using a
 * constant-time comparison to prevent timing-based brute-force attacks.
 * Returns a 403 response if verification fails, null if it passes.
 */
export function verifyCronSecret(req: NextRequest): NextResponse | null {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) return null; // No secret configured — open (dev mode)

    const secret = req.nextUrl.searchParams.get("secret") ?? "";
    const valid =
        secret.length === cronSecret.length &&
        timingSafeEqual(Buffer.from(secret), Buffer.from(cronSecret));

    if (!valid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return null;
}
