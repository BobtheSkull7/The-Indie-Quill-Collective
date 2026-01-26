import { db } from "../db";
import { auditLogs } from "@shared/schema";

export type AuditAction = 
  | "view"
  | "create"
  | "update"
  | "delete"
  | "sign"
  | "status_change"
  | "export";

export type AuditTargetTable = 
  | "applications"
  | "contracts"
  | "users"
  | "publishing_updates";

interface AuditLogParams {
  userId: number;
  action: AuditAction;
  targetTable: AuditTargetTable;
  targetId: string | number;
  details?: Record<string, any>;
  ipAddress?: string;
  isMinor?: boolean;
}

export async function logAuditEvent({
  userId,
  action,
  targetTable,
  targetId,
  details,
  ipAddress,
  isMinor,
}: AuditLogParams): Promise<void> {
  try {
    const enrichedDetails = {
      ...details,
      isMinorData: isMinor ?? false,
      timestamp: new Date().toISOString(),
    };

    await db.insert(auditLogs).values({
      userId,
      action,
      entityType: targetTable,
      entityId: String(targetId),
      details: JSON.stringify(enrichedDetails),
    });

    if (isMinor) {
      console.log(`[AUDIT] Minor data access: User ${userId} performed ${action} on ${targetTable}:${targetId}`);
    }
  } catch (error) {
    console.error("[AUDIT] Failed to log audit event:", error);
  }
}

export async function logMinorDataAccess(
  userId: number,
  action: AuditAction,
  targetTable: AuditTargetTable,
  targetId: string | number,
  ipAddress?: string,
  additionalDetails?: Record<string, any>
): Promise<void> {
  return logAuditEvent({
    userId,
    action,
    targetTable,
    targetId,
    details: additionalDetails,
    ipAddress,
    isMinor: true,
  });
}

export function getClientIp(req: any): string | undefined {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    req.ip
  );
}
