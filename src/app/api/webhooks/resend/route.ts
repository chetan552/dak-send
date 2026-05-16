import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { parseResendWebhook } from "@/lib/email-provider/resend-provider";
import { handleProviderEvent } from "@/lib/email-provider/handle-event";
import { readSettings } from "@/lib/email-provider/settings";

/**
 * Resend signs webhooks with Svix.
 * Headers: svix-id, svix-timestamp, svix-signature ("v1,base64...").
 * Sig payload: `${svix_id}.${svix_timestamp}.${raw_body}` HMAC-SHA256 with the secret (base64-decoded if `whsec_` prefixed).
 */
async function verifySvix(raw: string, headers: Headers, secret: string): Promise<boolean> {
    const svixId = headers.get("svix-id");
    const svixTimestamp = headers.get("svix-timestamp");
    const svixSignature = headers.get("svix-signature");
    if (!svixId || !svixTimestamp || !svixSignature) return false;

    let secretBytes: Buffer;
    if (secret.startsWith("whsec_")) {
        secretBytes = Buffer.from(secret.slice(6), "base64");
    } else {
        secretBytes = Buffer.from(secret, "utf8");
    }

    const expected = createHmac("sha256", secretBytes)
        .update(`${svixId}.${svixTimestamp}.${raw}`)
        .digest("base64");

    const provided = svixSignature.split(" ").map((s) => s.split(",")[1]).filter(Boolean);
    return provided.some((sig) => {
        try {
            const a = Buffer.from(sig, "base64");
            const b = Buffer.from(expected, "base64");
            return a.length === b.length && timingSafeEqual(a, b);
        } catch {
            return false;
        }
    });
}

export async function POST(req: NextRequest) {
    const raw = await req.text();
    const { RESEND_WEBHOOK_SECRET } = await readSettings(["RESEND_WEBHOOK_SECRET"]);
    if (RESEND_WEBHOOK_SECRET) {
        const ok = await verifySvix(raw, req.headers, RESEND_WEBHOOK_SECRET);
        if (!ok && process.env.NODE_ENV !== "development") {
            return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
        }
    }

    try {
        const body = JSON.parse(raw);
        const events = parseResendWebhook(body);
        for (const evt of events) {
            try { await handleProviderEvent(evt); } catch (e) { console.error("Resend handler error:", e); }
        }
        return NextResponse.json({ ok: true });
    } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
