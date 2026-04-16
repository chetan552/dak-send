import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronSecret } from "../_auth";
import { writeAuditLog } from "@/lib/audit";

/**
 * Data retention cron — run daily.
 *
 * Default thresholds (configurable via Settings table):
 *   RETENTION_BOUNCED_DAYS     — delete bounced subscribers older than N days (default 90)
 *   RETENTION_UNSUBSCRIBED_DAYS — delete unsubscribed subscribers older than N days (default 365)
 *   RETENTION_CAMPAIGN_SENDS_DAYS — delete CampaignSend records older than N days (default 730)
 *   RETENTION_CAMPAIGN_CLICKS_DAYS — delete CampaignClick records older than N days (default 730)
 *
 * Set a threshold to 0 to disable that purge.
 */
export async function GET(req: NextRequest) {
    const authError = verifyCronSecret(req);
    if (authError) return authError;

    try {
        const settings = await prisma.setting.findMany({
            where: {
                key: {
                    in: [
                        "RETENTION_BOUNCED_DAYS",
                        "RETENTION_UNSUBSCRIBED_DAYS",
                        "RETENTION_CAMPAIGN_SENDS_DAYS",
                        "RETENTION_CAMPAIGN_CLICKS_DAYS",
                    ],
                },
            },
        });

        const cfg = settings.reduce<Record<string, string>>((acc, s) => ({ ...acc, [s.key]: s.value }), {});

        const bouncedDays = parseInt(cfg.RETENTION_BOUNCED_DAYS ?? "90", 10);
        const unsubDays = parseInt(cfg.RETENTION_UNSUBSCRIBED_DAYS ?? "365", 10);
        const sendsDays = parseInt(cfg.RETENTION_CAMPAIGN_SENDS_DAYS ?? "730", 10);
        const clicksDays = parseInt(cfg.RETENTION_CAMPAIGN_CLICKS_DAYS ?? "730", 10);

        const now = new Date();
        const results: Record<string, number> = {};

        // Purge bounced subscribers
        if (bouncedDays > 0) {
            const cutoff = new Date(now.getTime() - bouncedDays * 86_400_000);
            const { count } = await prisma.subscriber.deleteMany({
                where: { status: "bounced", updatedAt: { lt: cutoff } },
            });
            results.bouncedDeleted = count;
        }

        // Purge unsubscribed subscribers
        if (unsubDays > 0) {
            const cutoff = new Date(now.getTime() - unsubDays * 86_400_000);
            const { count } = await prisma.subscriber.deleteMany({
                where: { status: "unsubscribed", updatedAt: { lt: cutoff } },
            });
            results.unsubscribedDeleted = count;
        }

        // Purge old CampaignSend records
        if (sendsDays > 0) {
            const cutoff = new Date(now.getTime() - sendsDays * 86_400_000);
            const { count } = await prisma.campaignSend.deleteMany({
                where: { createdAt: { lt: cutoff } },
            });
            results.campaignSendsDeleted = count;
        }

        // Purge old CampaignClick records
        if (clicksDays > 0) {
            const cutoff = new Date(now.getTime() - clicksDays * 86_400_000);
            const { count } = await prisma.campaignClick.deleteMany({
                where: { clickedAt: { lt: cutoff } },
            });
            results.campaignClicksDeleted = count;
        }

        writeAuditLog({
            action: "retention_run",
            meta: { ...results, bouncedDays, unsubDays, sendsDays, clicksDays },
        });

        return NextResponse.json({ success: true, ...results });
    } catch (error) {
        console.error("Retention cron error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
