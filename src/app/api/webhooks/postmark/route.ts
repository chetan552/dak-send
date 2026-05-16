import { NextRequest, NextResponse } from "next/server";
import { parsePostmarkWebhook } from "@/lib/email-provider/postmark-provider";
import { handleProviderEvent } from "@/lib/email-provider/handle-event";
import { readSettings } from "@/lib/email-provider/settings";

/**
 * Postmark doesn't sign webhooks. We support optional HTTP Basic Auth
 * (Postmark lets you configure this per-webhook in the dashboard).
 * If POSTMARK_WEBHOOK_USER/PASS are set, the request must present matching credentials.
 */
function checkBasicAuth(req: NextRequest, user: string, pass: string): boolean {
    const header = req.headers.get("authorization");
    if (!header || !header.startsWith("Basic ")) return false;
    try {
        const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
        const idx = decoded.indexOf(":");
        if (idx === -1) return false;
        return decoded.slice(0, idx) === user && decoded.slice(idx + 1) === pass;
    } catch {
        return false;
    }
}

export async function POST(req: NextRequest) {
    const { POSTMARK_WEBHOOK_USER, POSTMARK_WEBHOOK_PASS } = await readSettings([
        "POSTMARK_WEBHOOK_USER",
        "POSTMARK_WEBHOOK_PASS",
    ]);
    if (POSTMARK_WEBHOOK_USER && POSTMARK_WEBHOOK_PASS) {
        if (!checkBasicAuth(req, POSTMARK_WEBHOOK_USER, POSTMARK_WEBHOOK_PASS)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    try {
        const body = await req.json();
        const events = parsePostmarkWebhook(body);
        for (const evt of events) {
            try { await handleProviderEvent(evt); } catch (e) { console.error("Postmark handler error:", e); }
        }
        return NextResponse.json({ ok: true });
    } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
