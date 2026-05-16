import { NextRequest, NextResponse } from "next/server";
import { parseMailjetWebhook } from "@/lib/email-provider/mailjet-provider";
import { handleProviderEvent } from "@/lib/email-provider/handle-event";
import { readSettings } from "@/lib/email-provider/settings";

/**
 * Mailjet doesn't sign Parse webhooks. We support an optional shared-secret
 * query parameter so the URL itself is the credential.
 *   POST /api/webhooks/mailjet?token=<MAILJET_WEBHOOK_SECRET>
 */
export async function POST(req: NextRequest) {
    const { MAILJET_WEBHOOK_SECRET } = await readSettings(["MAILJET_WEBHOOK_SECRET"]);
    if (MAILJET_WEBHOOK_SECRET) {
        const token = req.nextUrl.searchParams.get("token");
        if (token !== MAILJET_WEBHOOK_SECRET) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    try {
        const body = await req.json();
        const events = parseMailjetWebhook(body);
        for (const evt of events) {
            try { await handleProviderEvent(evt); } catch (e) { console.error("Mailjet handler error:", e); }
        }
        return NextResponse.json({ ok: true });
    } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
