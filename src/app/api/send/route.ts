import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { getProvider } from "@/lib/email-provider/factory";
import bcrypt from "bcryptjs";

// Transactional email API with API key auth
export async function POST(req: NextRequest) {
    try {
        const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");

        if (!apiKey) {
            return NextResponse.json({ error: "Missing API key. Include x-api-key header." }, { status: 401 });
        }

        // Validate API key against system settings
        const apiKeySetting = await prisma.setting.findUnique({
            where: { key: "API_KEY" }
        });

        let keysMatch = false;
        if (apiKeySetting) {
            const isBcrypt = apiKeySetting.value.startsWith("$2b$") || apiKeySetting.value.startsWith("$2a$");
            keysMatch = isBcrypt
                ? await bcrypt.compare(apiKey, apiKeySetting.value)
                : apiKey.length === apiKeySetting.value.length &&
                  timingSafeEqual(Buffer.from(apiKey), Buffer.from(apiKeySetting.value));
        }
        if (!keysMatch) {
            return NextResponse.json({ error: "Invalid API key" }, { status: 403 });
        }

        const body = await req.json();
        const { brandId, to, subject, html, text, replyTo } = body;

        if (!brandId || !to || !subject || !html) {
            return NextResponse.json({
                error: "Missing required fields: brandId, to, subject, html"
            }, { status: 400 });
        }

        const brand = await prisma.brand.findUnique({
            where: { id: brandId }
        });

        if (!brand || !brand.fromEmail) {
            return NextResponse.json({ error: "Brand not found or sender email not configured" }, { status: 404 });
        }

        const recipients: string[] = Array.isArray(to) ? to : [to];
        const provider = await getProvider();

        // Send one message per recipient so each provider's per-recipient APIs work uniformly.
        for (const recipient of recipients) {
            await provider.send({
                from: { email: brand.fromEmail, name: brand.fromName || brand.name },
                to: { email: recipient },
                replyTo: replyTo || brand.replyTo || undefined,
                subject,
                html,
                text: text || "",
            });
        }

        return NextResponse.json({
            success: true,
            message: `Email sent to ${recipients.join(', ')}`
        });

    } catch (error: any) {
        console.error("Transactional email error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
