import { prisma } from "@/lib/prisma";

/**
 * Read multiple Setting keys at once, falling back to process.env when DB value is empty.
 * Returns a Record of { key -> value } with empty strings for missing keys.
 */
export async function readSettings(keys: string[]): Promise<Record<string, string>> {
    let rows: Array<{ key: string; value: string }> = [];
    try {
        rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
    } catch (e) {
        console.error("Failed to read provider settings from DB", e);
    }
    const map = rows.reduce<Record<string, string>>((acc, r) => ({ ...acc, [r.key]: r.value }), {});
    const out: Record<string, string> = {};
    for (const key of keys) {
        out[key] = map[key] || process.env[key] || "";
    }
    return out;
}
