import { prisma } from "@/lib/prisma";

const GLOBAL_FLAG = "AI_ENABLED";
const API_KEY = "DEEPSEEK_API_KEY";
const BRAND_FLAG_PREFIX = "BRAND_AI_ENABLED:";

export type AiAvailability =
    | { available: true; apiKey: string }
    | { available: false; reason: "disabled_globally" | "disabled_for_brand" | "no_api_key" };

async function readSettings(keys: string[]) {
    const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
    return rows.reduce<Record<string, string>>((acc, r) => ({ ...acc, [r.key]: r.value }), {});
}

export async function getAiAvailability(brandId?: string | null): Promise<AiAvailability> {
    const keys = [GLOBAL_FLAG, API_KEY];
    if (brandId) keys.push(`${BRAND_FLAG_PREFIX}${brandId}`);
    const settings = await readSettings(keys);

    const apiKey = settings[API_KEY] || process.env.DEEPSEEK_API_KEY || "";
    if (settings[GLOBAL_FLAG] !== "true") return { available: false, reason: "disabled_globally" };
    if (brandId && settings[`${BRAND_FLAG_PREFIX}${brandId}`] === "false") {
        return { available: false, reason: "disabled_for_brand" };
    }
    if (!apiKey) return { available: false, reason: "no_api_key" };
    return { available: true, apiKey };
}

export async function isAiEnabledGlobal(): Promise<boolean> {
    const s = await readSettings([GLOBAL_FLAG]);
    return s[GLOBAL_FLAG] === "true";
}

export async function isAiEnabledForBrand(brandId: string): Promise<boolean> {
    const s = await readSettings([GLOBAL_FLAG, `${BRAND_FLAG_PREFIX}${brandId}`]);
    if (s[GLOBAL_FLAG] !== "true") return false;
    return s[`${BRAND_FLAG_PREFIX}${brandId}`] !== "false";
}

export async function setBrandAiEnabled(brandId: string, enabled: boolean) {
    const key = `${BRAND_FLAG_PREFIX}${brandId}`;
    await prisma.setting.upsert({
        where: { key },
        update: { value: enabled ? "true" : "false" },
        create: { key, value: enabled ? "true" : "false" },
    });
}
