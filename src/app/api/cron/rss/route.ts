import { NextRequest, NextResponse } from "next/server";
import { checkRssFeeds } from "@/app/actions/rss";
import { markCronLastRun } from "@/app/actions/cron-settings";
import { verifyCronSecret } from "../_auth";

export async function GET(req: NextRequest) {
    const authError = verifyCronSecret(req);
    if (authError) return authError;

    try {
        const result = await checkRssFeeds();
        await markCronLastRun("rss").catch(() => {});
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("RSS cron error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
