import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

// Registo de auditoria para ações administrativas. Nunca bloqueia a operação
// principal em caso de falha de escrita.
export async function logAudit(entry: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Prisma.InputJsonValue | null;
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        meta: entry.meta ?? undefined,
      },
    });
  } catch (err) {
    console.warn("[carmix] falha ao registar auditoria:", entry.action, err);
  }
}