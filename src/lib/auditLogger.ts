import { logger } from "@/lib/logger";

export type AuditAction =
  | "user_login"
  | "user_logout"
  | "admin_login"
  | "admin_logout"
  | "config_updated"
  | "assertion_created"
  | "assertion_disputed"
  | "assertion_resolved"
  | "vote_cast"
  | "alert_created"
  | "alert_acknowledged"
  | "alert_resolved"
  | "incident_created"
  | "incident_updated"
  | "data_exported"
  | "api_access"
  | "sync_triggered"
  | "contract_interaction"
  | "permission_denied"
  | "security_event";

export type AuditSeverity = "info" | "warning" | "critical";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  actor: string;
  actorType: "user" | "admin" | "system" | "anonymous";
  severity: AuditSeverity;
  details: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  instanceId?: string;
  success: boolean;
  errorMessage?: string;
}

export interface AuditFilter {
  action?: AuditAction | AuditAction[];
  actor?: string;
  actorType?: AuditLogEntry["actorType"];
  severity?: AuditSeverity;
  startDate?: string;
  endDate?: string;
  instanceId?: string;
  limit?: number;
  offset?: number;
}

class SecurityAuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxLogs: number = 10000;

  log(entry: Omit<AuditLogEntry, "id" | "timestamp">): void {
    const auditEntry: AuditLogEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
    };

    this.logs.push(auditEntry);

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    logger.info("Audit log entry", {
      action: auditEntry.action,
      actor: auditEntry.actor,
      severity: auditEntry.severity,
      success: auditEntry.success,
    });

    this.persistToDatabase(auditEntry);
  }

  query(filter: AuditFilter): AuditLogEntry[] {
    let results = [...this.logs];

    if (filter.action) {
      const actions = Array.isArray(filter.action) ? filter.action : [filter.action];
      results = results.filter((log) => actions.includes(log.action));
    }

    if (filter.actor) {
      results = results.filter((log) => log.actor === filter.actor);
    }

    if (filter.actorType) {
      results = results.filter((log) => log.actorType === filter.actorType);
    }

    if (filter.severity) {
      results = results.filter((log) => log.severity === filter.severity);
    }

    if (filter.startDate) {
      results = results.filter((log) => log.timestamp >= filter.startDate!);
    }

    if (filter.endDate) {
      results = results.filter((log) => log.timestamp <= filter.endDate!);
    }

    if (filter.instanceId) {
      results = results.filter((log) => log.instanceId === filter.instanceId);
    }

    if (filter.success !== undefined) {
      results = results.filter((log) => log.success === filter.success);
    }

    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    const offset = filter.offset || 0;
    const limit = filter.limit || 100;

    return results.slice(offset, offset + limit);
  }

  getStatistics(filter: Omit<AuditFilter, "limit" | "offset"> = {}): {
    total: number;
    byAction: Record<AuditAction, number>;
    bySeverity: Record<AuditSeverity, number>;
    successRate: number;
    criticalEvents: number;
  } {
    const logs = this.query(filter);
    const byAction = {} as Record<AuditAction, number>;
    const bySeverity = {} as Record<AuditSeverity, number>;
    let successCount = 0;
    let criticalCount = 0;

    for (const log of logs) {
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      bySeverity[log.severity] = (bySeverity[log.severity] || 0) + 1;
      if (log.success) successCount++;
      if (log.severity === "critical") criticalCount++;
    }

    return {
      total: logs.length,
      byAction,
      bySeverity,
      successRate: logs.length > 0 ? (successCount / logs.length) * 100 : 0,
      criticalEvents: criticalCount,
    };
  }

  private generateId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async persistToDatabase(entry: AuditLogEntry): Promise<void> {
    try {
      await fetch("/api/audit/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
    } catch (error) {
      logger.error("Failed to persist audit log", { error, entry });
    }
  }

  exportLogs(filter: AuditFilter = {}): string {
    const logs = this.query(filter);
    return JSON.stringify(logs, null, 2);
  }

  clearOldLogs(daysToKeep: number = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoff = cutoffDate.toISOString();

    this.logs = this.logs.filter((log) => log.timestamp >= cutoff);

    logger.info("Old audit logs cleared", {
      cutoff,
      remaining: this.logs.length,
    });
  }
}

let auditLogger: SecurityAuditLogger | null = null;

export function getAuditLogger(): SecurityAuditLogger {
  if (!auditLogger) {
    auditLogger = new SecurityAuditLogger();
  }
  return auditLogger;
}

export function logSecurityEvent(
  action: AuditAction,
  actor: string,
  details: Record<string, unknown>,
  severity: AuditSeverity = "info",
  success: boolean = true,
  errorMessage?: string,
): void {
  const logger = getAuditLogger();
  logger.log({
    action,
    actor,
    actorType: "user",
    severity,
    details,
    success,
    errorMessage,
  });
}

export function logAdminAction(
  action: AuditAction,
  actor: string,
  details: Record<string, unknown>,
  success: boolean = true,
): void {
  const logger = getAuditLogger();
  logger.log({
    action,
    actor,
    actorType: "admin",
    severity: success ? "info" : "warning",
    details,
    success,
  });
}

export function logSecurityAlert(
  action: AuditAction,
  details: Record<string, unknown>,
  errorMessage?: string,
): void {
  const logger = getAuditLogger();
  logger.log({
    action,
    actor: "system",
    actorType: "system",
    severity: "critical",
    details,
    success: false,
    errorMessage,
  });
}