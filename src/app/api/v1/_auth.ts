import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Validate the x-api-key header against the stored API_KEY setting.
 * Returns null on success, or a 401/403 NextResponse to return immediately.
 */
export async function requireApiKey(req: NextRequest): Promise<NextResponse | null> {
    const key = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace("Bearer ", "");

    if (!key) {
        return NextResponse.json(
            { error: "Missing API key. Include x-api-key header." },
            { status: 401 }
        );
    }

    const setting = await prisma.setting.findUnique({ where: { key: "API_KEY" } });

    if (!setting || setting.value !== key) {
        return NextResponse.json({ error: "Invalid API key." }, { status: 403 });
    }

    return null;
}
