import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/aws";

// Transactional email API with API key auth
export async function POST(req: NextRequest) {
    try {
        const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");

        if (!apiKey) {
            return NextResponse.json({ error: "Missing API key. Include x-api-key header." }, { status: 401 });
        }

        // Validate API key against system settings
        const apiKeySetting = await (prisma as any).setting.findUnique({
            where: { key: "API_KEY" }
        });

        if (!apiKeySetting || apiKeySetting.value !== apiKey) {
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

        const emailParams: any = {
            Source: `${brand.fromName || brand.name} <${brand.fromEmail}>`,
            Destination: { ToAddresses: Array.isArray(to) ? to : [to] },
            Message: {
                Subject: { Data: subject },
                Body: {
                    Html: { Data: html },
                    ...(text && { Text: { Data: text } })
                }
            },
            ReplyToAddresses: replyTo ? [replyTo] : (brand.replyTo ? [brand.replyTo] : []),
        };

        await sendEmail(emailParams);

        return NextResponse.json({
            success: true,
            message: `Email sent to ${Array.isArray(to) ? to.join(', ') : to}`
        });

    } catch (error: any) {
        console.error("Transactional email error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
