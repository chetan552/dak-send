import { NextRequest, NextResponse } from "next/server";
import { checkRssFeeds } from "@/app/actions/rss";

export async function GET(req: NextRequest) {
    // Verify cron secret to prevent unauthorized access
    const secret = req.nextUrl.searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && secret !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const result = await checkRssFeeds();
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("RSS cron error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
