import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { parseElasticWebhook } from "@/lib/email-provider/elastic-provider";
import { handleProviderEvent } from "@/lib/email-provider/handle-event";
import { readSettings } from "@/lib/email-provider/settings";

/**
 * Elastic Email doesn't sign notification payloads. We support an optional
 * shared-secret query parameter so the URL itself is the credential.
 *   POST /api/webhooks/elastic?token=<ELASTIC_WEBHOOK_SECRET>
 *
 * Elastic Email can POST either JSON or x-www-form-urlencoded depending on
 * the notification type, so we accept both.
 */
async function readBody(req: NextRequest): Promise<unknown> {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        return req.json();
    }
    if (contentType.includes("application/x-www-form-urlencoded")) {
        const text = await req.text();
        const params = new URLSearchParams(text);
        const obj: Record<string, string> = {};
        params.forEach((value, key) => { obj[key] = value; });
        return obj;
    }
    // Try JSON as a fallback
    try {
        return JSON.parse(await req.text());
    } catch {
        return {};
    }
}

export async function POST(req: NextRequest) {
    const { ELASTIC_WEBHOOK_SECRET } = await readSettings(["ELASTIC_WEBHOOK_SECRET"]);
    if (ELASTIC_WEBHOOK_SECRET) {
        const token = req.nextUrl.searchParams.get("token") ?? "";
        const expected = Buffer.from(ELASTIC_WEBHOOK_SECRET);
        const provided = Buffer.from(token);
        const valid = provided.length === expected.length && timingSafeEqual(provided, expected);
        if (!valid) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    try {
        const body = await readBody(req);
        const events = parseElasticWebhook(body);
        for (const evt of events) {
            try { await handleProviderEvent(evt); } catch (e) { console.error("Elastic handler error:", e); }
        }
        return NextResponse.json({ ok: true });
    } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
