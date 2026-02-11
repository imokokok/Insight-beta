import { logger } from '@/lib/logger';

export type AuditAction =
  | 'user_login'
  | 'user_logout'
  | 'admin_login'
  | 'admin_logout'
  | 'config_updated'
  | 'assertion_created'
  | 'assertion_disputed'
  | 'assertion_resolved'
  | 'vote_cast'
  | 'alert_created'
  | 'alert_acknowledged'
  | 'alert_resolved'
  | 'incident_created'
  | 'incident_updated'
  | 'data_exported'
  | 'api_access'
  | 'sync_triggered'
  | 'contract_interaction'
  | 'permission_denied'
  | 'security_event';

export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  actor: string;
  actorType: 'user' | 'admin' | 'system' | 'anonymous';
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
  actorType?: AuditLogEntry['actorType'];
  severity?: AuditSeverity;
  startDate?: string;
  endDate?: string;
  instanceId?: string;
  limit?: number;
  offset?: number;
  search?: string;
  success?: boolean;
}

export interface AuditStatistics {
  total: number;
  byAction: Record<AuditAction, number>;
  bySeverity: Record<AuditSeverity, number>;
  byActorType: Record<'user' | 'admin' | 'system' | 'anonymous', number>;
  successRate: number;
  criticalEvents: number;
  timeRange: {
    start: string;
    end: string;
  };
  topActions: Array<{ action: AuditAction; count: number }>;
  topActors: Array<{ actor: string; count: number }>;
}

export interface AuditExportOptions {
  format: 'csv' | 'json';
  startDate?: string;
  endDate?: string;
  includeDetails?: boolean;
}

export interface AuditArchiveOptions {
  olderThanDays: number;
  compress?: boolean;
}

const MAX_LOGS = 10000;
const BATCH_SIZE = 100;
const PERSISTENCE_RETRY_ATTEMPTS = 3;
const PERSISTENCE_RETRY_DELAY = 1000;
const FETCH_TIMEOUT_MS = 5000; // 添加超时配置
const MAX_PERSISTENCE_QUEUE_SIZE = 5000; // 持久化队列最大大小

/**
 * 循环缓冲区 - 用于高效存储固定数量的日志条目
 * 当缓冲区满时，新条目会覆盖最旧的条目
 */
class CircularBuffer<T> {
  private buffer: (T | undefined)[];
  private head = 0;
  private tail = 0;
  private count = 0;
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;

    if (this.count < this.capacity) {
      this.count++;
    } else {
      this.tail = this.head;
    }
  }

  *[Symbol.iterator](): Iterator<T> {
    for (let i = 0; i < this.count; i++) {
      const index = (this.tail + i) % this.capacity;
      const item = this.buffer[index];
      if (item !== undefined) {
        yield item;
      }
    }
  }

  toArray(): T[] {
    const result: T[] = [];
    for (const item of this) {
      result.push(item);
    }
    return result;
  }

  get length(): number {
    return this.count;
  }

  clear(): void {
    this.buffer.fill(undefined);
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }

  /**
   * 过滤并返回符合条件的条目
   */
  filter(predicate: (item: T) => boolean): T[] {
    const result: T[] = [];
    for (const item of this) {
      if (predicate(item)) {
        result.push(item);
      }
    }
    return result;
  }
}

class SecurityAuditLogger {
  private logs: CircularBuffer<AuditLogEntry>;
  private persistenceQueue: AuditLogEntry[] = [];
  private isPersisting = false;
  private persistenceTimer: ReturnType<typeof setInterval> | null = null;

  constructor(maxLogs: number = MAX_LOGS) {
    this.logs = new CircularBuffer<AuditLogEntry>(maxLogs);
  }

  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    const auditEntry: AuditLogEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
    };

    this.logs.push(auditEntry);

    // 检查队列大小限制
    if (this.persistenceQueue.length >= MAX_PERSISTENCE_QUEUE_SIZE) {
      // 移除最旧的条目（队列的前20%）
      const removeCount = Math.floor(MAX_PERSISTENCE_QUEUE_SIZE * 0.2);
      this.persistenceQueue.splice(0, removeCount);
      logger.warn('Audit persistence queue limit reached, dropped oldest entries', {
        droppedCount: removeCount,
        currentSize: this.persistenceQueue.length,
        maxSize: MAX_PERSISTENCE_QUEUE_SIZE,
      });
    }

    this.persistenceQueue.push(auditEntry);

    logger.info('Audit log entry', {
      action: auditEntry.action,
      actor: auditEntry.actor,
      severity: auditEntry.severity,
      success: auditEntry.success,
    });

    this.schedulePersistence();
  }

  query(filter: AuditFilter): AuditLogEntry[] {
    let results = this.logs.toArray();

    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      results = results.filter(
        (log) =>
          log.actor.toLowerCase().includes(searchLower) ||
          log.action.toLowerCase().includes(searchLower) ||
          JSON.stringify(log.details).toLowerCase().includes(searchLower),
      );
    }

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

    if (filter.success !== undefined) {
      results = results.filter((log) => log.success === filter.success);
    }

    if (filter.startDate) {
      const startDate = filter.startDate;
      results = results.filter((log) => log.timestamp >= startDate);
    }

    if (filter.endDate) {
      const endDate = filter.endDate;
      results = results.filter((log) => log.timestamp <= endDate);
    }

    if (filter.instanceId) {
      results = results.filter((log) => log.instanceId === filter.instanceId);
    }

    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    const offset = filter.offset || 0;
    const limit = filter.limit || 100;

    return results.slice(offset, offset + limit);
  }

  getStatistics(filter: Omit<AuditFilter, 'limit' | 'offset' | 'search'> = {}): AuditStatistics {
    const logs = this.query(filter);

    const byAction = {} as Record<AuditAction, number>;
    const bySeverity = {} as Record<AuditSeverity, number>;
    const byActorType = {} as Record<'user' | 'admin' | 'system' | 'anonymous', number>;
    let successCount = 0;
    let criticalCount = 0;

    for (const log of logs) {
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      bySeverity[log.severity] = (bySeverity[log.severity] || 0) + 1;
      byActorType[log.actorType] = (byActorType[log.actorType] || 0) + 1;
      if (log.success) successCount++;
      if (log.severity === 'critical') criticalCount++;
    }

    const topActions = Object.entries(byAction)
      .map(([action, count]) => ({ action: action as AuditAction, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topActors = this.getTopActors(logs);

    const timeRange = this.getTimeRange(logs);

    return {
      total: logs.length,
      byAction,
      bySeverity,
      byActorType,
      successRate: logs.length > 0 ? (successCount / logs.length) * 100 : 0,
      criticalEvents: criticalCount,
      timeRange,
      topActions,
      topActors,
    };
  }

  private getTopActors(logs: AuditLogEntry[]): Array<{ actor: string; count: number }> {
    const actorCounts = new Map<string, number>();

    for (const log of logs) {
      const count = actorCounts.get(log.actor) || 0;
      actorCounts.set(log.actor, count + 1);
    }

    return Array.from(actorCounts.entries())
      .map(([actor, count]) => ({ actor, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private getTimeRange(logs: AuditLogEntry[]): { start: string; end: string } {
    if (logs.length === 0) {
      return {
        start: new Date().toISOString(),
        end: new Date().toISOString(),
      };
    }

    const timestamps = logs.map((log) => new Date(log.timestamp).getTime());
    const minTime = new Date(Math.min(...timestamps));
    const maxTime = new Date(Math.max(...timestamps));

    return {
      start: minTime.toISOString(),
      end: maxTime.toISOString(),
    };
  }

  async exportLogs(options: AuditExportOptions = { format: 'json' }): Promise<string> {
    const filter: AuditFilter = {};
    if (options.startDate) filter.startDate = options.startDate;
    if (options.endDate) filter.endDate = options.endDate;

    const logs = this.query(filter);

    if (!options.includeDetails) {
      return JSON.stringify(
        logs.map((log) => ({
          id: log.id,
          timestamp: log.timestamp,
          action: log.action,
          actor: log.actor,
          severity: log.severity,
          success: log.success,
        })),
        null,
        2,
      );
    }

    if (options.format === 'csv') {
      const firstLog = logs[0];
      if (!firstLog) {
        return 'id,timestamp,action,actor,severity,success';
      }
      const headers = Object.keys(firstLog);
      const csvRows = [headers.join(',')];

      for (const row of logs) {
        const values = headers.map((header) => {
          const value = row[header as keyof AuditLogEntry];
          return this.formatCSVValue(value);
        });
        csvRows.push(values.join(','));
      }

      return csvRows.join('\n');
    }

    return JSON.stringify(logs, null, 2);
  }

  private formatCSVValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue = String(value);

    if (
      stringValue.includes(',') ||
      stringValue.includes('"') ||
      stringValue.includes('\n') ||
      stringValue.includes('\r')
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }

  async archiveLogs(options: AuditArchiveOptions): Promise<{
    success: boolean;
    archivedCount: number;
    archiveSize: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - options.olderThanDays);
    const cutoff = cutoffDate.toISOString();

    const logsToArchive = this.logs.filter((log) => log.timestamp < cutoff);

    if (logsToArchive.length === 0) {
      return {
        success: true,
        archivedCount: 0,
        archiveSize: 0,
      };
    }

    try {
      const archiveData = JSON.stringify(logsToArchive, null, 2);
      const archiveSize = archiveData.length;

      if (options.compress) {
        const compressed = await this.compressData(archiveData);
        await this.saveArchive(compressed, `audit-archive-${cutoff.slice(0, 10)}.gz`);
      } else {
        await this.saveArchive(archiveData, `audit-archive-${cutoff.slice(0, 10)}.json`);
      }

      // 重新创建缓冲区，排除已归档的日志
      const remainingLogs = this.logs.filter((log) => log.timestamp >= cutoff);
      this.logs.clear();
      for (const log of remainingLogs) {
        this.logs.push(log);
      }

      logger.info('Audit logs archived', {
        cutoff,
        archivedCount: logsToArchive.length,
        archiveSize,
      });

      return {
        success: true,
        archivedCount: logsToArchive.length,
        archiveSize,
      };
    } catch (error) {
      logger.error('Failed to archive audit logs', { error });
      return {
        success: false,
        archivedCount: 0,
        archiveSize: 0,
      };
    }
  }

  private async compressData(data: string): Promise<string> {
    if (typeof CompressionStream === 'undefined') {
      return data;
    }

    try {
      const stream = new CompressionStream('gzip');
      const writer = stream.writable.getWriter();
      await writer.write(new TextEncoder().encode(data));
      await writer.close();

      const compressed = await new Response(stream.readable).arrayBuffer();
      return new TextDecoder().decode(compressed);
    } catch {
      return data;
    }
  }

  private async saveArchive(data: string, filename: string): Promise<void> {
    try {
      await fetch('/api/audit/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, filename }),
      });
    } catch (error) {
      logger.error('Failed to save audit archive', { error, filename });
      throw error;
    }
  }

  clearOldLogs(daysToKeep: number = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoff = cutoffDate.toISOString();

    const beforeCount = this.logs.length;
    const remainingLogs = this.logs.filter((log) => log.timestamp >= cutoff);
    this.logs.clear();
    for (const log of remainingLogs) {
      this.logs.push(log);
    }
    const afterCount = this.logs.length;

    logger.info('Old audit logs cleared', {
      cutoff,
      clearedCount: beforeCount - afterCount,
      remainingCount: afterCount,
    });
  }

  clearAllLogsForTest(): void {
    this.logs.clear();
    this.persistenceQueue = [];
  }

  getLogCount(): number {
    return this.logs.length;
  }

  getMemoryUsage(): {
    totalLogs: number;
    queueSize: number;
    memoryEstimate: string;
  } {
    const logsArray = this.logs.toArray();
    const totalSize = JSON.stringify(logsArray).length;
    const queueSize = this.persistenceQueue.length;
    const memoryEstimate = this.formatBytes(totalSize);

    return {
      totalLogs: this.logs.length,
      queueSize,
      memoryEstimate,
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  private schedulePersistence(): void {
    if (this.persistenceTimer) {
      clearTimeout(this.persistenceTimer);
    }

    this.persistenceTimer = setTimeout(() => {
      this.flushPersistenceQueue();
    }, 1000);
  }

  private async flushPersistenceQueue(): Promise<void> {
    if (this.isPersisting || this.persistenceQueue.length === 0) {
      return;
    }

    this.isPersisting = true;

    try {
      const batch = this.persistenceQueue.splice(0, BATCH_SIZE);

      while (batch.length > 0) {
        await this.persistBatch(batch.splice(0, BATCH_SIZE));
      }
    } catch (error) {
      logger.error('Failed to flush persistence queue', { error });
    } finally {
      this.isPersisting = false;
    }
  }

  private async persistBatch(entries: AuditLogEntry[]): Promise<void> {
    let attempt = 0;

    while (attempt < PERSISTENCE_RETRY_ATTEMPTS) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const response = await fetch('/api/audit/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entries),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return;
      } catch (error) {
        clearTimeout(timeout);
        attempt++;

        const isAbortError = error instanceof Error && error.name === 'AbortError';
        const errorMessage = isAbortError ? 'Request timeout' : String(error);

        if (attempt < PERSISTENCE_RETRY_ATTEMPTS) {
          const delay = PERSISTENCE_RETRY_DELAY * attempt;
          logger.warn('Persistence attempt failed, retrying', {
            attempt,
            error: errorMessage,
            delay,
          });
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          logger.error('Failed to persist audit logs after all retries', {
            attempts: attempt,
            error: errorMessage,
            entryCount: entries.length,
          });
        }
      }
    }

    throw new Error('Failed to persist audit logs after retries');
  }

  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart =
      typeof crypto !== 'undefined' && crypto.getRandomValues
        ? Array.from(crypto.getRandomValues(new Uint8Array(5)))
            .map((b) => b.toString(36).padStart(2, '0'))
            .join('')
        : Math.random().toString(36).slice(2, 12);
    return `audit-${timestamp}-${randomPart}`;
  }
}

let auditLogger: SecurityAuditLogger | null = null;

export function getAuditLogger(): SecurityAuditLogger {
  if (!auditLogger) {
    auditLogger = new SecurityAuditLogger();
  }
  return auditLogger;
}

/**
 * 记录安全事件
 */
export function logSecurityEvent(
  action: AuditAction,
  actor: string,
  details: Record<string, unknown>,
  severity: AuditSeverity = 'info',
  success: boolean = true
): void {
  const logger = getAuditLogger();
  logger.log({
    action,
    actor,
    actorType: 'user',
    severity,
    details,
    success,
  });
}

/**
 * 记录管理员操作
 */
export function logAdminAction(
  action: AuditAction,
  actor: string,
  details: Record<string, unknown>,
  success: boolean = true
): void {
  const logger = getAuditLogger();
  logger.log({
    action,
    actor,
    actorType: 'admin',
    severity: 'warning',
    details,
    success,
  });
}

/**
 * 记录安全警报
 */
export function logSecurityAlert(
  action: AuditAction,
  details: Record<string, unknown>,
  errorMessage: string
): void {
  const logger = getAuditLogger();
  logger.log({
    action,
    actor: 'system',
    actorType: 'system',
    severity: 'critical',
    details,
    success: false,
    errorMessage,
  });
}

/**
 * 获取审计统计
 */
export function getAuditStatistics(filter: Omit<AuditFilter, 'limit' | 'offset' | 'search'> = {}): AuditStatistics {
  const logger = getAuditLogger();
  return logger.getStatistics(filter);
}

/**
 * 导出审计日志
 */
export async function exportAuditLogs(options: AuditExportOptions = { format: 'json' }): Promise<string> {
  const logger = getAuditLogger();
  return logger.exportLogs(options);
}

/**
 * 清除所有审计日志（仅用于测试）
 */
export function clearAllAuditLogsForTest(): void {
  const logger = getAuditLogger();
  logger.clearAllLogsForTest();
}

/**
 * 获取审计内存使用情况
 */
export function getAuditMemoryUsage(): {
  totalLogs: number;
  queueSize: number;
  memoryEstimate: string;
} {
  const logger = getAuditLogger();
  return logger.getMemoryUsage();
}

