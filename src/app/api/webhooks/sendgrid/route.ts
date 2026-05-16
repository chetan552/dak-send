import { NextRequest, NextResponse } from "next/server";
import { createVerify } from "crypto";
import { parseSendgridWebhook } from "@/lib/email-provider/sendgrid-provider";
import { handleProviderEvent } from "@/lib/email-provider/handle-event";
import { readSettings } from "@/lib/email-provider/settings";

/**
 * SendGrid signs Event Webhook requests with ECDSA.
 * Headers:
 *  - X-Twilio-Email-Event-Webhook-Signature: base64 ECDSA signature
 *  - X-Twilio-Email-Event-Webhook-Timestamp: unix seconds
 * Payload to verify: `${timestamp}${raw_body}`
 * Public key is configured via SENDGRID_WEBHOOK_PUBLIC_KEY (PEM format).
 */
function verifySendgridSignature(raw: string, headers: Headers, pemKey: string): boolean {
    const signature = headers.get("x-twilio-email-event-webhook-signature");
    const timestamp = headers.get("x-twilio-email-event-webhook-timestamp");
    if (!signature || !timestamp) return false;

    try {
        const verifier = createVerify("SHA256");
        verifier.update(timestamp);
        verifier.update(raw);
        return verifier.verify(pemKey, signature, "base64");
    } catch (err) {
        console.error("SendGrid signature verification failed:", err);
        return false;
    }
}

export async function POST(req: NextRequest) {
    const raw = await req.text();
    const { SENDGRID_WEBHOOK_PUBLIC_KEY } = await readSettings(["SENDGRID_WEBHOOK_PUBLIC_KEY"]);

    if (SENDGRID_WEBHOOK_PUBLIC_KEY) {
        const ok = verifySendgridSignature(raw, req.headers, SENDGRID_WEBHOOK_PUBLIC_KEY);
        if (!ok && process.env.NODE_ENV !== "development") {
            return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
        }
    }

    try {
        const body = JSON.parse(raw);
        const events = parseSendgridWebhook(body);
        for (const evt of events) {
            try { await handleProviderEvent(evt); } catch (e) { console.error("SendGrid handler error:", e); }
        }
        return NextResponse.json({ ok: true });
    } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
