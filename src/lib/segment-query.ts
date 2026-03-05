// Direct fields on the Subscriber model
const SUBSCRIBER_FIELDS = new Set([
    "id", "email", "name", "status", "hasConfirmedGdpr",
    "createdAt", "updatedAt", "listId", "list",
    "customFields", "subscriptionTokens",
    "AND", "OR", "NOT",
]);

/**
 * Translates user-friendly segment queries into valid Prisma where clauses.
 * - Direct fields (email, name, status, etc.) pass through as-is.
 * - Unknown fields are treated as custom field names and auto-translated to
 *   `customFields: { some: { customField: { name: X }, value: Y } }`.
 */
export function translateSegmentQuery(query: Record<string, any>): Record<string, any> {
    const prismaWhere: Record<string, any> = {};
    const customFieldConditions: any[] = [];

    for (const [key, value] of Object.entries(query)) {
        if (SUBSCRIBER_FIELDS.has(key)) {
            prismaWhere[key] = value;
        } else {
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
