import { db } from "@/lib/db";

export type AuditAction =
  | "remove"
  | "restore"
  | "warn"
  | "suspend"
  | "verify"
  | "reject"
  | "payout"
  | "plan"
  | "ad"
  | "announcement"
  | "job_publish"
  | "job_close"
  | "team_event";

export async function recordAudit(input: {
  actorId: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  reason?: string | null;
  before?: unknown;
}) {
  await db.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason?.trim() || null,
      before: input.before === undefined ? null : JSON.stringify(input.before),
    },
  });
}
