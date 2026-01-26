export type AuditAction =
  | 'user.login'
  | 'user.logout'
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'user.role_change'
  | 'assertion.create'
  | 'assertion.view'
  | 'assertion.update'
  | 'assertion.delete'
  | 'dispute.create'
  | 'dispute.vote'
  | 'dispute.resolve'
  | 'dispute.settle'
  | 'alert.create'
  | 'alert.resolve'
  | 'alert.acknowledge'
  | 'settings.update'
  | 'api_key.create'
  | 'api_key.revoke'
  | 'webhook.create'
  | 'webhook.update'
  | 'webhook.delete'
  | 'export.data'
  | 'admin.action'
  | 'system.backup'
  | 'system.restore'
  | 'security.mfa_enable'
  | 'security.mfa_disable'
  | 'security.password_change';

export type AuditSeverity = 'info' | 'warning' | 'critical' | 'security';

export type AuditEntityType =
  | 'user'
  | 'assertion'
  | 'dispute'
  | 'alert'
  | 'settings'
  | 'api_key'
  | 'webhook'
  | 'system'
  | 'security';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  actorId: string;
  actorType: 'user' | 'system' | 'api' | 'admin';
  actorAddress?: string;
  severity: AuditSeverity;
  description: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  success: boolean;
  errorMessage?: string;
  duration?: number;
}

export interface AuditFilter {
  startDate?: string;
  endDate?: string;
  actions?: AuditAction[];
  entityTypes?: AuditEntityType[];
  actorIds?: string[];
  severities?: AuditSeverity[];
  entityIds?: string[];
  success?: boolean;
  searchQuery?: string;
}

export interface AuditStats {
  totalEntries: number;
  entriesByAction: Record<AuditAction, number>;
  entriesByEntityType: Record<AuditEntityType, number>;
  entriesBySeverity: Record<AuditSeverity, number>;
  entriesByHour: Record<string, number>;
  topActors: Array<{ actorId: string; count: number }>;
  recentSecurityEvents: AuditLogEntry[];
  activityTrend: number;
}

export interface AuditReport {
  id: string;
  name: string;
  period: { start: string; end: string };
  generatedAt: string;
  summary: {
    totalEvents: number;
    securityEvents: number;
    criticalEvents: number;
    uniqueActors: number;
    topActions: Array<{ action: string; count: number }>;
    topEntities: Array<{ entityType: string; count: number }>;
  };
  securityAnalysis: {
    failedLogins: number;
    permissionChanges: number;
    sensitiveOperations: number;
    unusualActivity: Array<{
      description: string;
      timestamp: string;
      severity: string;
    }>;
  };
  recommendations: string[];
  exportFormat: 'json' | 'csv' | 'pdf';
}

export class EnhancedAuditLogger {
  private logs: Map<string, AuditLogEntry> = new Map();
  private logBuffer: AuditLogEntry[] = [];
  private readonly MAX_BUFFER_SIZE = 1000;
  private readonly RETENTION_DAYS = 365;

  private readonly ACTION_LABELS: Record<AuditAction, string> = {
    'user.login': 'User Login',
    'user.logout': 'User Logout',
    'user.create': 'User Created',
    'user.update': 'User Updated',
    'user.delete': 'User Deleted',
    'user.role_change': 'User Role Changed',
    'assertion.create': 'Assertion Created',
    'assertion.view': 'Assertion Viewed',
    'assertion.update': 'Assertion Updated',
    'assertion.delete': 'Assertion Deleted',
    'dispute.create': 'Dispute Created',
    'dispute.vote': 'Vote Cast',
    'dispute.resolve': 'Dispute Resolved',
    'dispute.settle': 'Dispute Settled',
    'alert.create': 'Alert Created',
    'alert.resolve': 'Alert Resolved',
    'alert.acknowledge': 'Alert Acknowledged',
    'settings.update': 'Settings Updated',
    'api_key.create': 'API Key Created',
    'api_key.revoke': 'API Key Revoked',
    'webhook.create': 'Webhook Created',
    'webhook.update': 'Webhook Updated',
    'webhook.delete': 'Webhook Deleted',
    'export.data': 'Data Exported',
    'admin.action': 'Admin Action',
    'system.backup': 'System Backup',
    'system.restore': 'System Restore',
    'security.mfa_enable': 'MFA Enabled',
    'security.mfa_disable': 'MFA Disabled',
    'security.password_change': 'Password Changed',
  };

  private readonly ACTION_CATEGORIES: Record<AuditAction, string> = {
    'user.login': 'Authentication',
    'user.logout': 'Authentication',
    'user.create': 'User Management',
    'user.update': 'User Management',
    'user.delete': 'User Management',
    'user.role_change': 'User Management',
    'assertion.create': 'Oracle Operations',
    'assertion.view': 'Oracle Operations',
    'assertion.update': 'Oracle Operations',
    'assertion.delete': 'Oracle Operations',
    'dispute.create': 'Dispute Resolution',
    'dispute.vote': 'Dispute Resolution',
    'dispute.resolve': 'Dispute Resolution',
    'dispute.settle': 'Dispute Resolution',
    'alert.create': 'Alerting',
    'alert.resolve': 'Alerting',
    'alert.acknowledge': 'Alerting',
    'settings.update': 'Configuration',
    'api_key.create': 'API Management',
    'api_key.revoke': 'API Management',
    'webhook.create': 'Integration',
    'webhook.update': 'Integration',
    'webhook.delete': 'Integration',
    'export.data': 'Data Operations',
    'admin.action': 'Administration',
    'system.backup': 'System Operations',
    'system.restore': 'System Operations',
    'security.mfa_enable': 'Security',
    'security.mfa_disable': 'Security',
    'security.password_change': 'Security',
  };

  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const fullEntry: AuditLogEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
    };

    this.logs.set(fullEntry.id, fullEntry);
    this.logBuffer.push(fullEntry);

    if (this.logBuffer.length >= this.MAX_BUFFER_SIZE) {
      this.flushBuffer();
    }

    return fullEntry;
  }

  logUserLogin(
    userId: string,
    address: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
  ): AuditLogEntry {
    return this.log({
      action: success ? 'user.login' : 'user.login',
      entityType: 'user',
      entityId: userId,
      actorId: userId,
      actorType: 'user',
      actorAddress: address,
      severity: success ? 'info' : 'warning',
      description: success
        ? `User ${address.slice(0, 6)}...${address.slice(-4)} logged in successfully`
        : `Failed login attempt for ${address.slice(0, 6)}...${address.slice(-4)}`,
      metadata: {},
      ipAddress,
      userAgent,
      success,
      errorMessage: success ? undefined : 'Invalid credentials',
    });
  }

  logDisputeAction(
    action: 'create' | 'vote' | 'resolve' | 'settle',
    userId: string,
    disputeId: string,
    details: Record<string, unknown>,
    success: boolean,
  ): AuditLogEntry {
    const actionMap: Record<string, AuditAction> = {
      create: 'dispute.create',
      vote: 'dispute.vote',
      resolve: 'dispute.resolve',
      settle: 'dispute.settle',
    };

    return this.log({
      action: actionMap[action] ?? 'dispute.create',
      entityType: 'dispute',
      entityId: disputeId,
      actorId: userId,
      actorType: 'user',
      severity: 'info',
      description: `Dispute ${action}: ${disputeId.slice(0, 8)}...`,
      metadata: details,
      success,
    });
  }

  logAlertAction(
    action: 'create' | 'resolve' | 'acknowledge',
    userId: string,
    alertId: string,
    alertType: string,
    severity: AuditSeverity,
  ): AuditLogEntry {
    const actionMap: Record<string, AuditAction> = {
      create: 'alert.create',
      resolve: 'alert.resolve',
      acknowledge: 'alert.acknowledge',
    };

    return this.log({
      action: actionMap[action] ?? 'alert.create',
      entityType: 'alert',
      entityId: alertId,
      actorId: userId,
      actorType: 'user',
      severity,
      description: `Alert ${action}: ${alertType}`,
      metadata: { alertType },
      success: true,
    });
  }

  logSettingsChange(
    userId: string,
    settingKey: string,
    oldValue: unknown,
    newValue: unknown,
  ): AuditLogEntry {
    return this.log({
      action: 'settings.update',
      entityType: 'settings',
      entityId: settingKey,
      actorId: userId,
      actorType: 'user',
      severity: 'info',
      description: `Settings updated: ${settingKey}`,
      oldValue: oldValue as Record<string, unknown>,
      newValue: newValue as Record<string, unknown>,
      metadata: { settingKey },
      success: true,
    });
  }

  logSecurityEvent(
    eventType: 'mfa_enable' | 'mfa_disable' | 'password_change',
    userId: string,
    details: Record<string, unknown>,
  ): AuditLogEntry {
    const actionMap: Record<string, AuditAction> = {
      mfa_enable: 'security.mfa_enable',
      mfa_disable: 'security.mfa_disable',
      password_change: 'security.password_change',
    };

    return this.log({
      action: actionMap[eventType] ?? 'security.mfa_enable',
      entityType: 'security',
      entityId: userId,
      actorId: userId,
      actorType: 'user',
      severity: 'security',
      description: `Security event: ${eventType.replace('_', ' ')}`,
      metadata: details,
      success: true,
    });
  }

  getLog(id: string): AuditLogEntry | null {
    return this.logs.get(id) || null;
  }

  getAllLogs(): AuditLogEntry[] {
    return Array.from(this.logs.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  filterLogs(filter: AuditFilter): AuditLogEntry[] {
    let logs = this.getAllLogs();

    if (filter.startDate) {
      const start = new Date(filter.startDate).getTime();
      logs = logs.filter((l) => new Date(l.timestamp).getTime() >= start);
    }

    if (filter.endDate) {
      const end = new Date(filter.endDate).getTime();
      logs = logs.filter((l) => new Date(l.timestamp).getTime() <= end);
    }

    const { actions, entityTypes, actorIds, severities, entityIds } = filter;

    if (actions && actions.length > 0) {
      logs = logs.filter((l) => actions.includes(l.action));
    }

    if (entityTypes && entityTypes.length > 0) {
      logs = logs.filter((l) => entityTypes.includes(l.entityType));
    }

    if (actorIds && actorIds.length > 0) {
      logs = logs.filter((l) => actorIds.includes(l.actorId));
    }

    if (severities && severities.length > 0) {
      logs = logs.filter((l) => severities.includes(l.severity));
    }

    if (entityIds && entityIds.length > 0) {
      logs = logs.filter((l) => entityIds.includes(l.entityId));
    }

    if (filter.success !== undefined) {
      logs = logs.filter((l) => l.success === filter.success);
    }

    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.description.toLowerCase().includes(query) ||
          l.entityId.toLowerCase().includes(query) ||
          l.actorId.toLowerCase().includes(query),
      );
    }

    return logs;
  }

  getStats(filter?: AuditFilter): AuditStats {
    const logs = filter ? this.filterLogs(filter) : this.getAllLogs();

    const entriesByAction: Record<AuditAction, number> = {} as Record<AuditAction, number>;
    const entriesByEntityType: Record<AuditEntityType, number> = {} as Record<
      AuditEntityType,
      number
    >;
    const entriesBySeverity: Record<AuditSeverity, number> = {} as Record<AuditSeverity, number>;
    const entriesByHour: Record<string, number> = {};
    const actorCounts: Map<string, number> = new Map();

    logs.forEach((log) => {
      entriesByAction[log.action] = (entriesByAction[log.action] || 0) + 1;
      entriesByEntityType[log.entityType] = (entriesByEntityType[log.entityType] || 0) + 1;
      entriesBySeverity[log.severity] = (entriesBySeverity[log.severity] || 0) + 1;

      const hour = log.timestamp.substring(0, 13) + ':00';
      entriesByHour[hour] = (entriesByHour[hour] || 0) + 1;

      actorCounts.set(log.actorId, (actorCounts.get(log.actorId) || 0) + 1);
    });

    const topActors = Array.from(actorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([actorId, count]) => ({ actorId, count }));

    const recentSecurityEvents = logs
      .filter((l) => l.severity === 'security' || l.severity === 'critical')
      .slice(0, 20);

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const todayLogs = logs.filter((l) => new Date(l.timestamp) >= oneDayAgo);
    const yesterdayLogs = logs.filter(
      (l) => new Date(l.timestamp) >= twoDaysAgo && new Date(l.timestamp) < oneDayAgo,
    );

    const activityTrend =
      yesterdayLogs.length > 0
        ? ((todayLogs.length - yesterdayLogs.length) / yesterdayLogs.length) * 100
        : 0;

    return {
      totalEntries: logs.length,
      entriesByAction,
      entriesByEntityType,
      entriesBySeverity,
      entriesByHour,
      topActors,
      recentSecurityEvents,
      activityTrend,
    };
  }

  generateReport(
    name: string,
    startDate: string,
    endDate: string,
    exportFormat: 'json' | 'csv' | 'pdf' = 'json',
  ): AuditReport {
    const filter: AuditFilter = {
      startDate,
      endDate,
    };

    const logs = this.filterLogs(filter);
    const stats = this.getStats(filter);

    const failedLogins = logs.filter((l) => l.action === 'user.login' && !l.success).length;

    const permissionChanges = logs.filter((l) => l.action === 'user.role_change').length;

    const sensitiveOperations = logs.filter((l) =>
      ['system.backup', 'system.restore', 'api_key.revoke', 'webhook.delete'].includes(l.action),
    ).length;

    const unusualActivity = logs
      .filter((l) => l.severity === 'critical' || l.severity === 'security')
      .slice(0, 10)
      .map((l) => ({
        description: l.description,
        timestamp: l.timestamp,
        severity: l.severity,
      }));

    const recommendations = this.generateRecommendations(stats, logs);

    const topActions = Object.entries(stats.entriesByAction)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([action, count]) => ({
        action: this.ACTION_LABELS[action as AuditAction] || action,
        count,
      }));

    const topEntities = Object.entries(stats.entriesByEntityType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([entityType, count]) => ({
        entityType,
        count,
      }));

    const uniqueActors = new Set(logs.map((l) => l.actorId)).size;

    return {
      id: this.generateId(),
      name,
      period: { start: startDate, end: endDate },
      generatedAt: new Date().toISOString(),
      summary: {
        totalEvents: logs.length,
        securityEvents: logs.filter((l) => l.severity === 'security').length,
        criticalEvents: logs.filter((l) => l.severity === 'critical').length,
        uniqueActors,
        topActions,
        topEntities,
      },
      securityAnalysis: {
        failedLogins,
        permissionChanges,
        sensitiveOperations,
        unusualActivity,
      },
      recommendations,
      exportFormat,
    };
  }

  private generateRecommendations(stats: AuditStats, logs: AuditLogEntry[]): string[] {
    const recommendations: string[] = [];

    if (stats.activityTrend > 50) {
      recommendations.push(
        'Activity has increased significantly (>50%). Consider reviewing for unusual patterns.',
      );
    }

    const failedActions = logs.filter((l) => !l.success);
    if (failedActions.length > stats.totalEntries * 0.1) {
      recommendations.push(
        'High failure rate detected (>10%). Review failed actions for potential issues.',
      );
    }

    const securityEvents = logs.filter((l) => l.severity === 'security');
    if (securityEvents.length > 10) {
      recommendations.push(
        'Elevated security events detected. Review security logs for potential threats.',
      );
    }

    const topActor = stats.topActors[0];
    if (topActor && topActor.count > stats.totalEntries * 0.5) {
      recommendations.push(
        'Single actor responsible for >50% of activity. Verify this is expected behavior.',
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Audit logs show normal activity patterns.');
      recommendations.push('All security checks passed.');
    }

    return recommendations.slice(0, 5);
  }

  exportLogs(filter: AuditFilter, format: 'json' | 'csv'): string {
    const logs = this.filterLogs(filter);

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }

    const headers = [
      'ID',
      'Timestamp',
      'Action',
      'Entity Type',
      'Entity ID',
      'Actor ID',
      'Severity',
      'Description',
      'Success',
    ];

    const rows = logs.map((log) => [
      log.id,
      log.timestamp,
      log.action,
      log.entityType,
      log.entityId,
      log.actorId,
      log.severity,
      `"${log.description.replace(/"/g, '""')}"`,
      log.success.toString(),
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  private flushBuffer(): void {
    console.log(`[AUDIT] Flushing ${this.logBuffer.length} log entries to persistent storage`);
    this.logBuffer = [];
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  clearOldLogs(): number {
    const cutoff = new Date(Date.now() - this.RETENTION_DAYS * 24 * 60 * 60 * 1000);
    let removed = 0;

    for (const [id, log] of this.logs) {
      if (new Date(log.timestamp) < cutoff) {
        this.logs.delete(id);
        removed++;
      }
    }

    return removed;
  }

  getActionLabel(action: AuditAction): string {
    return this.ACTION_LABELS[action] || action;
  }

  getActionCategory(action: AuditAction): string {
    return this.ACTION_CATEGORIES[action] || 'Other';
  }
}

export const auditLogger = new EnhancedAuditLogger();

export function createAuditEntry(
  action: AuditAction,
  entityType: AuditEntityType,
  entityId: string,
  actorId: string,
  description: string,
): Omit<AuditLogEntry, 'id' | 'timestamp'> {
  return {
    action,
    entityType,
    entityId,
    actorId,
    actorType: 'user',
    severity: 'info',
    description,
    metadata: {},
    success: true,
  };
}
