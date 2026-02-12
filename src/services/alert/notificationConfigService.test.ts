/**
 * Notification Config Service Tests
 *
 * 通知渠道配置服务测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationConfigService } from './notificationConfigService';
import { query } from '@/infrastructure/database/db';

// Mock database
vi.mock('@/server/db', () => ({
  query: vi.fn(),
}));

describe('NotificationConfigService', () => {
  let service: NotificationConfigService;

  beforeEach(() => {
    service = new NotificationConfigService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ensureSchema', () => {
    it('should create notification channels table', async () => {
      vi.mocked(query).mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'CREATE',
        oid: 0,
        fields: [],
      });

      await service.ensureSchema();

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS notification_channels'),
      );
    });

    it('should throw error when query fails', async () => {
      vi.mocked(query).mockRejectedValue(new Error('Database error'));

      await expect(service.ensureSchema()).rejects.toThrow('Database error');
    });
  });

  describe('createChannel', () => {
    it('should create email channel', async () => {
      const mockRow = {
        id: 'test-id',
        name: 'Test Email',
        channel: 'email',
        enabled: true,
        config: {
          type: 'email',
          smtpHost: 'smtp.test.com',
          smtpPort: 587,
          username: 'user',
          password: 'pass',
          fromAddress: 'test@test.com',
          toAddresses: ['user@test.com'],
          useTLS: true,
        },
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(query).mockResolvedValue({
        rows: [mockRow],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const result = await service.createChannel({
        name: 'Test Email',
        channel: 'email',
        config: {
          type: 'email',
          smtpHost: 'smtp.test.com',
          smtpPort: 587,
          username: 'user',
          password: 'pass',
          fromAddress: 'test@test.com',
          toAddresses: ['user@test.com'],
          useTLS: true,
        },
        enabled: true,
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Email');
      expect(result.channel).toBe('email');
      expect(result.enabled).toBe(true);
    });

    it('should create webhook channel', async () => {
      const mockRow = {
        id: 'webhook-id',
        name: 'Test Webhook',
        channel: 'webhook',
        enabled: true,
        config: {
          type: 'webhook',
          url: 'https://example.com/webhook',
          method: 'POST',
          headers: {},
          timeoutMs: 5000,
          retryCount: 3,
        },
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(query).mockResolvedValue({
        rows: [mockRow],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const result = await service.createChannel({
        name: 'Test Webhook',
        channel: 'webhook',
        config: {
          type: 'webhook',
          url: 'https://example.com/webhook',
          method: 'POST',
          headers: {},
          timeoutMs: 5000,
          retryCount: 3,
        },
      });

      expect(result).toBeDefined();
      expect(result.channel).toBe('webhook');
    });

    it('should throw error when creation fails', async () => {
      vi.mocked(query).mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      await expect(
        service.createChannel({
          name: 'Test',
          channel: 'email',
          config: {
            type: 'email',
            smtpHost: 'smtp.test.com',
            smtpPort: 587,
            username: 'user',
            password: 'pass',
            fromAddress: 'test@test.com',
            toAddresses: ['user@test.com'],
            useTLS: true,
          },
        }),
      ).rejects.toThrow('Failed to create notification channel');
    });
  });

  describe('getChannel', () => {
    it('should return null when channel not found', async () => {
      vi.mocked(query).mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await service.getChannel('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('getAllChannels', () => {
    it('should return all enabled channels', async () => {
      const mockRows = [
        {
          id: '1',
          name: 'Email 1',
          channel: 'email',
          enabled: true,
          config: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: '2',
          name: 'Slack 1',
          channel: 'slack',
          enabled: true,
          config: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      vi.mocked(query).mockResolvedValue({
        rows: mockRows,
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await service.getAllChannels();

      expect(result).toHaveLength(2);
      expect(result[0]!.name).toBe('Email 1');
      expect(result[1]!.name).toBe('Slack 1');
    });
  });

  describe('getChannelsByType', () => {
    it('should return channels filtered by type', async () => {
      const mockRows = [
        {
          id: '1',
          name: 'Email 1',
          channel: 'email',
          enabled: true,
          config: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: '2',
          name: 'Email 2',
          channel: 'email',
          enabled: true,
          config: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      vi.mocked(query).mockResolvedValue({
        rows: mockRows,
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await service.getChannelsByType('email');

      expect(result).toHaveLength(2);
      expect(result.every((c) => c.channel === 'email')).toBe(true);
    });
  });

  describe('updateChannel', () => {
    it('should update channel name', async () => {
      const existingRow = {
        id: 'test-id',
        name: 'Old Name',
        channel: 'email',
        enabled: true,
        config: {},
        created_at: new Date(),
        updated_at: new Date(),
      };

      const updatedRow = {
        ...existingRow,
        name: 'New Name',
      };

      // First call for initializeCache, second for getChannel, third for UPDATE
      vi.mocked(query)
        .mockResolvedValueOnce({
          rows: [existingRow],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [existingRow],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [updatedRow],
          rowCount: 1,
          command: 'UPDATE',
          oid: 0,
          fields: [],
        });

      const result = await service.updateChannel('test-id', { name: 'New Name' });

      expect(result).toBeDefined();
      expect(result?.name).toBe('New Name');
    });

    it('should return null when channel not found', async () => {
      vi.mocked(query).mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await service.updateChannel('non-existent', { name: 'New Name' });

      expect(result).toBeNull();
    });

    it('should disable channel', async () => {
      const existingRow = {
        id: 'test-id',
        name: 'Test',
        channel: 'email',
        enabled: true,
        config: {},
        created_at: new Date(),
        updated_at: new Date(),
      };

      const updatedRow = {
        ...existingRow,
        enabled: false,
      };

      // First call for initializeCache, second for getChannel, third for UPDATE
      vi.mocked(query)
        .mockResolvedValueOnce({
          rows: [existingRow],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [existingRow],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [updatedRow],
          rowCount: 1,
          command: 'UPDATE',
          oid: 0,
          fields: [],
        });

      const result = await service.updateChannel('test-id', { enabled: false });

      expect(result).toBeDefined();
      expect(result?.enabled).toBe(false);
    });
  });

  describe('deleteChannel', () => {
    it('should delete channel and return true', async () => {
      vi.mocked(query).mockResolvedValue({
        rows: [{ id: 'test-id' }],
        rowCount: 1,
        command: 'DELETE',
        oid: 0,
        fields: [],
      });

      const result = await service.deleteChannel('test-id');

      expect(result).toBe(true);
    });

    it('should return false when channel not found', async () => {
      vi.mocked(query).mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'DELETE',
        oid: 0,
        fields: [],
      });

      const result = await service.deleteChannel('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('testChannel', () => {
    it('should return error when channel not found', async () => {
      vi.mocked(query).mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await service.testChannel('non-existent');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Channel not found');
    });

    it('should validate email config', async () => {
      const mockRow = {
        id: 'email-id',
        name: 'Test Email',
        channel: 'email',
        enabled: true,
        config: {
          smtpHost: 'smtp.test.com',
          fromAddress: 'test@test.com',
          toAddresses: ['user@test.com'],
        },
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(query).mockResolvedValue({
        rows: [mockRow],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await service.testChannel('email-id');

      expect(result.success).toBe(true);
    });

    it('should return validation error for invalid email config', async () => {
      const mockRow = {
        id: 'email-id',
        name: 'Test Email',
        channel: 'email',
        enabled: true,
        config: {}, // Missing required fields
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(query).mockResolvedValue({
        rows: [mockRow],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await service.testChannel('email-id');

      expect(result.success).toBe(false);
      expect(result.message).toContain('SMTP host is required');
    });

    it('should validate webhook URL', async () => {
      const mockRow = {
        id: 'webhook-id',
        name: 'Test Webhook',
        channel: 'webhook',
        enabled: true,
        config: { url: 'invalid-url' },
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(query).mockResolvedValue({
        rows: [mockRow],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await service.testChannel('webhook-id');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid webhook URL');
    });
  });

  describe('validateConfig', () => {
    it('should validate telegram config', async () => {
      const mockRow = {
        id: 'telegram-id',
        name: 'Test Telegram',
        channel: 'telegram',
        enabled: true,
        config: { botToken: 'token123', chatIds: ['123456'] },
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(query).mockResolvedValue({
        rows: [mockRow],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await service.testChannel('telegram-id');

      expect(result.success).toBe(true);
    });

    it('should validate pagerduty config', async () => {
      const mockRow = {
        id: 'pagerduty-id',
        name: 'Test PagerDuty',
        channel: 'pagerduty',
        enabled: true,
        config: { integrationKey: 'key123' },
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(query).mockResolvedValue({
        rows: [mockRow],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await service.testChannel('pagerduty-id');

      expect(result.success).toBe(true);
    });
  });
});
