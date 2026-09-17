// lib/audit.ts
import type { Prisma } from "@prisma/client";

type AuditInput = {
  actorUserId: string;
  action: string; // e.g. "STUDENT_CREATE", "STUDENT_IMPORT"
  entityType: string; // e.g. "Student"
  entityId: string;
  before?: unknown;
  after?: unknown;
};

export async function recordAudit(tx: Prisma.TransactionClient, input: AuditInput) {
  await tx.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      beforeJson: input.before ? JSON.stringify(input.before) : null,
      afterJson: input.after ? JSON.stringify(input.after) : null,
    },
  });
}