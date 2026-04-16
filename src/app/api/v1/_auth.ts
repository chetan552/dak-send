import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * Validate the x-api-key header against the stored API_KEY setting.
 * Keys stored after rotation are bcrypt hashes (start with $2b$/$2a$).
 * Legacy plaintext keys are compared with timingSafeEqual for backward compat.
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
    if (!setting) {
        return NextResponse.json({ error: "Invalid API key." }, { status: 403 });
    }

    const isBcrypt = setting.value.startsWith("$2b$") || setting.value.startsWith("$2a$");
    const keysMatch = isBcrypt
        ? await bcrypt.compare(key, setting.value)
        : key.length === setting.value.length && timingSafeEqual(Buffer.from(key), Buffer.from(setting.value));

    if (!keysMatch) {
        return NextResponse.json({ error: "Invalid API key." }, { status: 403 });
    }

    return null;
}
