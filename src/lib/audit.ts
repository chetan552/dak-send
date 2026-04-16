import { prisma } from "./prisma";

export type AuditAction =
    | "consent_recorded"
    | "data_exported"
    | "subscriber_deleted"
    | "api_key_rotated"
    | "retention_run";

interface AuditOptions {
    action: AuditAction;
    entityType?: string;
    entityId?: string;
    actorId?: string;
    actorIp?: string;
    meta?: Record<string, unknown> | Record<string, never>;
}

/**
 * Write an immutable audit record. Fire-and-forget safe — errors are logged
 * but never bubble up to callers.
 */
export async function writeAuditLog(opts: AuditOptions): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                action: opts.action,
                entityType: opts.entityType,
                entityId: opts.entityId,
                actorId: opts.actorId,
                actorIp: opts.actorIp,
                meta: (opts.meta ?? {}) as object,
            },
        });
    } catch (e) {
        console.error("[audit] Failed to write audit log:", e);
    }
}
