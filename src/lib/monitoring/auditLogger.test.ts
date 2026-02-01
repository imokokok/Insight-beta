import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAuditLogger,
  logSecurityEvent,
  logAdminAction,
  logSecurityAlert,
  getAuditStatistics,
  exportAuditLogs,
  clearAllAuditLogsForTest,
  getAuditMemoryUsage,
  type AuditAction,
  type AuditSeverity,
} from './auditLogger';

describe('AuditLogger', () => {
  beforeEach(() => {
    clearAllAuditLogsForTest();
  });

  describe('Basic Logging', () => {
    it('should log an entry with required fields', () => {
      const logger = getAuditLogger();
      logger.log({
        action: 'user_login' as AuditAction,
        actor: 'user123',
        actorType: 'user',
        severity: 'info' as AuditSeverity,
        details: { ip: '127.0.0.1' },
        success: true,
      });

      const logs = logger.query({});
      expect(logs.length).toBe(1);
      expect(logs[0]!.action).toBe('user_login');
      expect(logs[0]!.actor).toBe('user123');
      expect(logs[0]!.success).toBe(true);
    });

    it('should generate unique IDs for each log entry', () => {
      const logger = getAuditLogger();

      logger.log({
        action: 'user_login' as AuditAction,
        actor: 'user1',
        actorType: 'user',
        severity: 'info',
        details: {},
        success: true,
      });

      logger.log({
        action: 'user_login' as AuditAction,
        actor: 'user2',
        actorType: 'user',
        severity: 'info',
        details: {},
        success: true,
      });

      const logs = logger.query({});
      expect(logs[0]!.id).not.toBe(logs[1]!.id);
    });

    it('should set timestamp automatically', () => {
      const logger = getAuditLogger();
      const before = Date.now();

      logger.log({
        action: 'user_login' as AuditAction,
        actor: 'user123',
        actorType: 'user',
        severity: 'info',
        details: {},
        success: true,
      });

      const after = Date.now();
      const logs = logger.query({});
      const logTime = new Date(logs[0]!.timestamp).getTime();

      expect(logTime).toBeGreaterThanOrEqual(before);
      expect(logTime).toBeLessThanOrEqual(after);
    });
  });

  describe('Query Functionality', () => {
    beforeEach(() => {
      const logger = getAuditLogger();

      // Add test logs
      logger.log({
        action: 'user_login',
        actor: 'user1',
        actorType: 'user',
        severity: 'info',
        details: {},
        success: true,
      });

      logger.log({
        action: 'config_updated',
        actor: 'admin1',
        actorType: 'admin',
        severity: 'warning',
        details: {},
        success: true,
      });

      logger.log({
        action: 'security_event',
        actor: 'system',
        actorType: 'system',
        severity: 'critical',
        details: {},
        success: false,
      });
    });

    it('should filter by action', () => {
      const logger = getAuditLogger();
      const logs = logger.query({ action: 'user_login' });

      expect(logs.length).toBe(1);
      expect(logs[0]!.action).toBe('user_login');
    });

    it('should filter by actor', () => {
      const logger = getAuditLogger();
      const logs = logger.query({ actor: 'admin1' });

      expect(logs.length).toBe(1);
      expect(logs[0]!.actor).toBe('admin1');
    });

    it('should filter by severity', () => {
      const logger = getAuditLogger();
      const logs = logger.query({ severity: 'critical' });

      expect(logs.length).toBe(1);
      expect(logs[0]!.severity).toBe('critical');
    });

    it('should filter by success status', () => {
      const logger = getAuditLogger();
      const logs = logger.query({ success: false });

      expect(logs.length).toBe(1);
      expect(logs[0]!.success).toBe(false);
    });

    it('should support pagination', () => {
      const logger = getAuditLogger();

      // Add more logs
      for (let i = 0; i < 10; i++) {
        logger.log({
          action: 'user_login',
          actor: `user${i}`,
          actorType: 'user',
          severity: 'info',
          details: {},
          success: true,
        });
      }

      const page1 = logger.query({ limit: 5, offset: 0 });
      const page2 = logger.query({ limit: 5, offset: 5 });

      expect(page1.length).toBe(5);
      expect(page2.length).toBe(5);
    });

    it('should support search', () => {
      const logger = getAuditLogger();
      logger.log({
        action: 'user_login',
        actor: 'special_user',
        actorType: 'user',
        severity: 'info',
        details: { key: 'special_value' },
        success: true,
      });

      const logs = logger.query({ search: 'special' });
      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    it('should calculate statistics correctly', () => {
      const logger = getAuditLogger();

      // Add test logs
      logger.log({
        action: 'user_login',
        actor: 'user1',
        actorType: 'user',
        severity: 'info',
        details: {},
        success: true,
      });
      logger.log({
        action: 'user_login',
        actor: 'user2',
        actorType: 'user',
        severity: 'info',
        details: {},
        success: true,
      });
      logger.log({
        action: 'config_updated',
        actor: 'admin1',
        actorType: 'admin',
        severity: 'warning',
        details: {},
        success: true,
      });
      logger.log({
        action: 'security_event',
        actor: 'system',
        actorType: 'system',
        severity: 'critical',
        details: {},
        success: false,
      });

      const stats = logger.getStatistics({});

      expect(stats.total).toBe(4);
      expect(stats.successRate).toBe(75); // 3 out of 4 successful
      expect(stats.criticalEvents).toBe(1);
      expect(stats.bySeverity.critical).toBe(1);
      expect(stats.bySeverity.info).toBe(2);
      expect(stats.bySeverity.warning).toBe(1);
    });

    it('should identify top actions', () => {
      const logger = getAuditLogger();

      // Add multiple logs of same action
      for (let i = 0; i < 5; i++) {
        logger.log({
          action: 'user_login',
          actor: `user${i}`,
          actorType: 'user',
          severity: 'info',
          details: {},
          success: true,
        });
      }
      logger.log({
        action: 'config_updated',
        actor: 'admin1',
        actorType: 'admin',
        severity: 'warning',
        details: {},
        success: true,
      });

      const stats = logger.getStatistics({});

      expect(stats.topActions[0]!.action).toBe('user_login');
      expect(stats.topActions[0]!.count).toBe(5);
    });

    it('should identify top actors', () => {
      const logger = getAuditLogger();

      // Add multiple logs from same actor
      for (let i = 0; i < 3; i++) {
        logger.log({
          action: 'user_login',
          actor: 'active_user',
          actorType: 'user',
          severity: 'info',
          details: {},
          success: true,
        });
      }
      logger.log({
        action: 'user_login',
        actor: 'other_user',
        actorType: 'user',
        severity: 'info',
        details: {},
        success: true,
      });

      const stats = logger.getStatistics({});

      expect(stats.topActors[0]!.actor).toBe('active_user');
      expect(stats.topActors[0]!.count).toBe(3);
    });
  });

  describe('Export', () => {
    beforeEach(() => {
      clearAllAuditLogsForTest();
    });

    it('should export logs as CSV', async () => {
      const logger = getAuditLogger();
      logger.log({
        action: 'user_login',
        actor: 'user1',
        actorType: 'user',
        severity: 'info',
        details: { key: 'value' },
        success: true,
      });

      const exported = await logger.exportLogs({ format: 'json' });
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
    });

    it('should export logs as CSV', async () => {
      const logger = getAuditLogger();
      logger.log({
        action: 'user_login',
        actor: 'user1',
        actorType: 'user',
        severity: 'info',
        details: {},
        success: true,
      });

      const exported = await logger.exportLogs({ format: 'csv' });

      expect(exported).toContain('id');
      expect(exported).toContain('timestamp');
      expect(exported).toContain('action');
    });

    it('should respect date range filters during export', async () => {
      const logger = getAuditLogger();

      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date(Date.now() + 1).toISOString();

      logger.log({
        action: 'user_login',
        actor: 'user1',
        actorType: 'user',
        severity: 'info',
        details: {},
        success: true,
      });

      const exported = await logger.exportLogs({
        format: 'json',
        startDate,
        endDate,
      });

      const parsed = JSON.parse(exported);
      expect(parsed.length).toBeGreaterThan(0);
    });
  });

  describe('Memory Management', () => {
    beforeEach(() => {
      clearAllAuditLogsForTest();
    });

    it('should track memory usage', () => {
      const logger = getAuditLogger();

      logger.log({
        action: 'user_login',
        actor: 'user1',
        actorType: 'user',
        severity: 'info',
        details: {},
        success: true,
      });

      const usage = logger.getMemoryUsage();

      expect(usage.totalLogs).toBeGreaterThan(0);
      expect(usage.memoryEstimate).toBeDefined();
    });

    it('should clear old logs', () => {
      const logger = getAuditLogger();

      logger.log({
        action: 'user_login',
        actor: 'user1',
        actorType: 'user',
        severity: 'info',
        details: {},
        success: true,
      });

      const initialCount = logger.getLogCount();
      expect(initialCount).toBe(1);

      logger.clearOldLogs(-1);

      const finalCount = logger.getLogCount();
      expect(finalCount).toBe(0);
    });

    it('should enforce max log limit', () => {
      const logger = getAuditLogger();

      // Add many logs
      for (let i = 0; i < 10100; i++) {
        logger.log({
          action: 'user_login',
          actor: `user${i}`,
          actorType: 'user',
          severity: 'info',
          details: {},
          success: true,
        });
      }

      const count = logger.getLogCount();
      expect(count).toBeLessThanOrEqual(10000); // Max limit
    });
  });

  describe('Helper Functions', () => {
    beforeEach(() => {
      clearAllAuditLogsForTest();
    });

    it('should log security events', () => {
      logSecurityEvent('user_login', 'user123', { ip: '127.0.0.1' }, 'info', true);

      const logger = getAuditLogger();
      const logs = logger.query({ action: 'user_login' });

      expect(logs.length).toBe(1);
      expect(logs[0]!.actorType).toBe('user');
    });

    it('should log admin actions', () => {
      logAdminAction('config_updated', 'admin123', { config: 'test' }, true);

      const logger = getAuditLogger();
      const logs = logger.query({ action: 'config_updated' });

      expect(logs.length).toBe(1);
      expect(logs[0]!.actorType).toBe('admin');
    });

    it('should log security alerts', () => {
      logSecurityAlert('security_event', { reason: 'suspicious_activity' }, 'Error occurred');

      const logger = getAuditLogger();
      const logs = logger.query({ action: 'security_event' });

      expect(logs.length).toBe(1);
      expect(logs[0]!.severity).toBe('critical');
      expect(logs[0]!.success).toBe(false);
    });

    it('should get audit statistics', () => {
      logSecurityEvent('user_login', 'user1', {}, 'info', true);
      logSecurityEvent('user_login', 'user2', {}, 'info', true);

      const stats = getAuditStatistics({});

      expect(stats.total).toBe(2);
      expect(stats.byAction.user_login).toBe(2);
    });

    it('should export audit logs', async () => {
      logSecurityEvent('user_login', 'user1', {}, 'info', true);

      const exported = await exportAuditLogs({ format: 'json' });
      const parsed = JSON.parse(exported);

      expect(parsed.length).toBe(1);
    });

    it('should get audit memory usage', () => {
      logSecurityEvent('user_login', 'user1', {}, 'info', true);

      const usage = getAuditMemoryUsage();

      expect(usage.totalLogs).toBeGreaterThan(0);
      expect(usage.memoryEstimate).toBeDefined();
    });
  });
});
