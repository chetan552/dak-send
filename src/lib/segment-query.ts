// Direct fields on the Subscriber model
const SUBSCRIBER_FIELDS = new Set([
    "id", "email", "name", "status", "hasConfirmedGdpr",
    "createdAt", "updatedAt", "listId", "list",
    "customFields", "subscriptionTokens",
]);

/**
 * Translates user-friendly segment queries into valid Prisma where clauses.
 *
 * Standard fields (email, name, status, etc.) pass through as-is.
 * Unknown fields are treated as custom field names and auto-translated to
 * `customFields: { some: { customField: { name: X }, value: Y } }`.
 *
 * AND / OR / NOT combinators recurse so custom fields nested inside them
 * are translated correctly.
 *
 * Special operators:
 *   has_tag: "tag-name"
 *     → subscriber must have the named tag
 *
 *   event_count: { name: "event-name", within_days: 30, gte: 1 }
 *     → subscriber must have triggered the named event at least N times in the last X days
 *     Fields: name (required), within_days (optional, default 30), gte (optional, default 1)
 */
export function translateSegmentQuery(query: Record<string, any>): Record<string, any> {
    const prismaWhere: Record<string, any> = {};
    const customFieldConditions: any[] = [];

    for (const [key, value] of Object.entries(query)) {
        // ── has_tag operator ──────────────────────────────────────────────────
        if (key === "has_tag") {
            const tagName = String(value);
            prismaWhere.tags = {
                some: { tag: { name: tagName } },
            };
            continue;
        }

        // ── event_count operator ──────────────────────────────────────────────
        if (key === "event_count") {
            const opts = typeof value === "object" && value !== null ? value : { name: String(value) };
            const eventName: string = opts.name;
            const withinDays: number = typeof opts.within_days === "number" ? opts.within_days : 30;
            const since = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000);

            prismaWhere.events = {
                some: { name: eventName, occurredAt: { gte: since } },
            };
            continue;
        }

        // ── AND / OR combinators — recurse into each clause ────────────────────
        if (key === "AND" || key === "OR") {
            if (Array.isArray(value)) {
                prismaWhere[key] = value.map(item =>
                    item && typeof item === "object" ? translateSegmentQuery(item) : item
                );
            } else {
                prismaWhere[key] = value;
            }
            continue;
        }

        // ── NOT combinator — recurse into the negated clause ───────────────────
        if (key === "NOT") {
            if (value && typeof value === "object" && !Array.isArray(value)) {
                prismaWhere[key] = translateSegmentQuery(value);
            } else {
                prismaWhere[key] = value;
            }
            continue;
        }

        // ── standard subscriber fields ─────────────────────────────────────────
        if (SUBSCRIBER_FIELDS.has(key)) {
            prismaWhere[key] = value;
        } else {
            // ── custom field fallback ──────────────────────────────────────────
            customFieldConditions.push({
                customField: { name: key },
                value: typeof value === "string" ? value : String(value),
            });
        }
    }

    if (customFieldConditions.length > 0) {
        if (customFieldConditions.length === 1) {
            prismaWhere.customFields = { some: customFieldConditions[0] };
        } else {
            prismaWhere.AND = [
                ...(prismaWhere.AND || []),
                ...customFieldConditions.map(cond => ({
                    customFields: { some: cond },
                })),
            ];
        }
    }

    return prismaWhere;
}
