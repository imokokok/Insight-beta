import type { NextRequest } from "next/server";
import { handleApi } from "@/server/apiResponse";
import { logger } from "@/lib/logger";
import type { AuditLogEntry, AuditFilter } from "@/lib/auditLogger";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleApi(request, async () => {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const actor = searchParams.get("actor") || undefined;
    const actorType = searchParams.get("actorType") as AuditLogEntry["actorType"] | undefined;
    const severity = searchParams.get("severity") as AuditLogEntry["severity"] | undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const instanceId = searchParams.get("instanceId") || undefined;
    const limit = Number(searchParams.get("limit")) || 100;
    const offset = Number(searchParams.get("offset")) || 0;

    const filter: AuditFilter = {
      action: action as AuditLogEntry["action"] | undefined,
      actor,
      actorType,
      severity: severity as AuditLogEntry["severity"] | undefined,
      startDate,
      endDate,
      instanceId,
      limit,
      offset,
    };

    try {
      const result = await db.query<AuditLogEntry>(
        `
        SELECT * FROM audit_logs
        WHERE 1=1
          ${filter.action ? "AND action = ANY($1)" : ""}
          ${filter.actor ? "AND actor = $2" : ""}
          ${filter.actorType ? "AND actor_type = $3" : ""}
          ${filter.severity ? "AND severity = $4" : ""}
          ${filter.startDate ? "AND timestamp >= $5" : ""}
          ${filter.endDate ? "AND timestamp <= $6" : ""}
          ${filter.instanceId ? "AND instance_id = $7" : ""}
        ORDER BY timestamp DESC
        LIMIT $8 OFFSET $9
        `,
        [
          filter.action ? [filter.action] : null,
          filter.actor,
          filter.actorType,
          filter.severity,
          filter.startDate,
          filter.endDate,
          filter.instanceId,
          limit,
          offset,
        ].filter(Boolean),
      );

      const countResult = await db.query<{ count: bigint }>(
        `
        SELECT COUNT(*) as count FROM audit_logs
        WHERE 1=1
          ${filter.action ? "AND action = ANY($1)" : ""}
          ${filter.actor ? "AND actor = $2" : ""}
          ${filter.actorType ? "AND actor_type = $3" : ""}
          ${filter.severity ? "AND severity = $4" : ""}
          ${filter.startDate ? "AND timestamp >= $5" : ""}
          ${filter.endDate ? "AND timestamp <= $6" : ""}
          ${filter.instanceId ? "AND instance_id = $7" : ""}
        `,
        [
          filter.action ? [filter.action] : null,
          filter.actor,
          filter.actorType,
          filter.severity,
          filter.startDate,
          filter.endDate,
          filter.instanceId,
        ].filter(Boolean),
      );

      return {
        items: result.rows,
        total: Number(countResult.rows[0]?.count || 0),
        limit,
        offset,
      };
    } catch (error) {
      logger.error("Failed to query audit logs", { error, filter });
      throw error;
    }
  });
}

export async function POST(request: NextRequest) {
  return handleApi(request, async () => {
    const entry = (await request.json()) as Omit<AuditLogEntry, "id" | "timestamp">;

    try {
      await db.query(
        `
        INSERT INTO audit_logs (
          action, actor, actor_type, severity, details,
          ip, user_agent, request_id, instance_id, success, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `,
        [
          entry.action,
          entry.actor,
          entry.actorType,
          entry.severity,
          JSON.stringify(entry.details),
          entry.ip,
          entry.userAgent,
          entry.requestId,
          entry.instanceId,
          entry.success,
          entry.errorMessage,
        ],
      );

      return { ok: true };
    } catch (error) {
      logger.error("Failed to insert audit log", { error, entry });
      throw error;
    }
  });
}