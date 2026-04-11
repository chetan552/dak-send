// This endpoint is kept for backwards-compatibility with existing SNS topic subscriptions.
// New deployments should configure SNS to point to /api/webhooks/ses instead.
// Both routes share identical handling logic.
import { NextRequest, NextResponse } from "next/server";
import { handleSnsPayload } from "@/app/api/webhooks/ses/route";

export async function POST(req: NextRequest) {
    try {
        const payload = JSON.parse(await req.text());
        const result = await handleSnsPayload(payload);
        return NextResponse.json(result.body, { status: result.status });
    } catch (e: any) {
        console.error("Error processing SNS webhook (sns route):", e);
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}
