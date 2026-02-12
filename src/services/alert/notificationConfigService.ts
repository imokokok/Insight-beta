/**
 * Notification Channel Configuration Service
 *
 * 通知渠道配置管理服务
 * 支持从数据库加载和管理通知渠道配置
 */

import { logger } from '@/shared/logger';
import { query } from '@/infrastructure/database/db';

import type {
  NotificationChannel,
  EmailConfig,
  SMSConfig,
  WebhookConfig,
  SlackConfig,
  DiscordConfig,
  TelegramConfig,
  PagerDutyConfig,
  NotificationConfig,
} from './notifications';

// ============================================================================
// Types
// ============================================================================

export interface NotificationChannelConfig {
  id: string;
  name: string;
  channel: NotificationChannel;
  enabled: boolean;
  config: NotificationConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateChannelInput {
  name: string;
  channel: NotificationChannel;
  config: NotificationConfig;
  enabled?: boolean;
}

export interface UpdateChannelInput {
  name?: string;
  config?: Partial<NotificationConfig>;
  enabled?: boolean;
}

// ============================================================================
// Database Schema
// ============================================================================

export const NOTIFICATION_CHANNELS_TABLE = `
CREATE TABLE IF NOT EXISTS notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  channel VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_channels_channel ON notification_channels(channel);
CREATE INDEX IF NOT EXISTS idx_notification_channels_enabled ON notification_channels(enabled);
`;

// ============================================================================
// Configuration Service
// ============================================================================

export class NotificationConfigService {
  private channelCache: Map<string, NotificationChannelConfig> = new Map();
  private cacheInitialized = false;

  /**
   * 确保数据库表存在
   */
  async ensureSchema(): Promise<void> {
    try {
      await query(NOTIFICATION_CHANNELS_TABLE);
      logger.info('Notification channels schema ensured');
    } catch (error) {
      logger.error('Failed to ensure notification channels schema', { error });
      throw error;
    }
  }

  /**
   * 初始化缓存
   */
  async initializeCache(): Promise<void> {
    if (this.cacheInitialized) return;

    try {
      await this.ensureSchema();
      await this.reloadCache();
      this.cacheInitialized = true;
      logger.info('Notification config cache initialized', {
        count: this.channelCache.size,
      });
    } catch (error) {
      logger.error('Failed to initialize notification config cache', { error });
      throw error;
    }
  }

  /**
   * 重新加载缓存
   */
  async reloadCache(): Promise<void> {
    try {
      const result = await query(
        `SELECT * FROM notification_channels WHERE enabled = true ORDER BY created_at DESC`,
      );

      this.channelCache.clear();
      for (const row of result.rows) {
        const config: NotificationChannelConfig = {
          id: row.id,
          name: row.name,
          channel: row.channel,
          enabled: row.enabled,
          config: row.config as NotificationConfig,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
        this.channelCache.set(row.id, config);
      }

      logger.debug('Notification config cache reloaded', {
        count: this.channelCache.size,
      });
    } catch (error) {
      logger.error('Failed to reload notification config cache', { error });
      throw error;
    }
  }

  /**
   * 获取所有渠道配置
   */
  async getAllChannels(): Promise<NotificationChannelConfig[]> {
    await this.initializeCache();
    return Array.from(this.channelCache.values());
  }

  /**
   * 按类型获取渠道配置
   */
  async getChannelsByType(channel: NotificationChannel): Promise<NotificationChannelConfig[]> {
    await this.initializeCache();
    return Array.from(this.channelCache.values()).filter((c) => c.channel === channel && c.enabled);
  }

  /**
   * 获取单个渠道配置
   */
  async getChannel(id: string): Promise<NotificationChannelConfig | null> {
    await this.initializeCache();
    return this.channelCache.get(id) || null;
  }

  /**
   * 创建渠道配置
   */
  async createChannel(input: CreateChannelInput): Promise<NotificationChannelConfig> {
    try {
      const result = await query(
        `INSERT INTO notification_channels (name, channel, enabled, config, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING *`,
        [input.name, input.channel, input.enabled ?? true, JSON.stringify(input.config)],
      );

      const row = result.rows[0];
      if (!row) {
        throw new Error('Failed to create notification channel: no row returned');
      }

      const config: NotificationChannelConfig = {
        id: row.id as string,
        name: row.name as string,
        channel: row.channel as NotificationChannel,
        enabled: row.enabled as boolean,
        config: row.config as NotificationConfig,
        createdAt: row.created_at as Date,
        updatedAt: row.updated_at as Date,
      };

      // Update cache
      this.channelCache.set(config.id, config);

      logger.info('Notification channel created', { id: config.id, name: config.name });
      return config;
    } catch (error) {
      logger.error('Failed to create notification channel', { error, input });
      throw error;
    }
  }

  /**
   * 更新渠道配置
   */
  async updateChannel(
    id: string,
    input: UpdateChannelInput,
  ): Promise<NotificationChannelConfig | null> {
    try {
      const existing = await this.getChannel(id);
      if (!existing) return null;

      const updates: string[] = [];
      const values: (string | boolean)[] = [];
      let paramIndex = 1;

      if (input.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(input.name);
      }
      if (input.enabled !== undefined) {
        updates.push(`enabled = $${paramIndex++}`);
        values.push(input.enabled);
      }
      if (input.config !== undefined) {
        // Merge with existing config
        const mergedConfig = { ...existing.config, ...input.config };
        updates.push(`config = $${paramIndex++}`);
        values.push(JSON.stringify(mergedConfig));
      }

      if (updates.length === 0) return existing;

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const result = await query(
        `UPDATE notification_channels SET ${updates.join(', ')}
         WHERE id = $${paramIndex} RETURNING *`,
        values,
      );

      const row = result.rows[0];
      if (!row) return null;

      const config: NotificationChannelConfig = {
        id: row.id as string,
        name: row.name as string,
        channel: row.channel as NotificationChannel,
        enabled: row.enabled as boolean,
        config: row.config as NotificationConfig,
        createdAt: row.created_at as Date,
        updatedAt: row.updated_at as Date,
      };

      // Update cache
      if (config.enabled) {
        this.channelCache.set(config.id, config);
      } else {
        this.channelCache.delete(config.id);
      }

      logger.info('Notification channel updated', { id, name: config.name });
      return config;
    } catch (error) {
      logger.error('Failed to update notification channel', { error, id, input });
      throw error;
    }
  }

  /**
   * 删除渠道配置
   */
  async deleteChannel(id: string): Promise<boolean> {
    try {
      const result = await query('DELETE FROM notification_channels WHERE id = $1 RETURNING id', [
        id,
      ]);

      const deleted = result.rowCount !== null && result.rowCount > 0;
      if (deleted) {
        this.channelCache.delete(id);
        logger.info('Notification channel deleted', { id });
      }

      return deleted;
    } catch (error) {
      logger.error('Failed to delete notification channel', { error, id });
      throw error;
    }
  }

  /**
   * 测试渠道配置
   */
  async testChannel(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const channel = await this.getChannel(id);
      if (!channel) {
        return { success: false, message: 'Channel not found' };
      }

      // Here you would actually test the channel by sending a test notification
      // For now, just validate the configuration
      const validation = this.validateConfig(channel.channel, channel.config);
      if (!validation.valid) {
        return { success: false, message: validation.message };
      }

      return { success: true, message: 'Configuration is valid' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 验证配置
   */
  private validateConfig(
    channel: NotificationChannel,
    config: NotificationConfig,
  ): { valid: boolean; message: string } {
    switch (channel) {
      case 'email': {
        const emailConfig = config as EmailConfig;
        if (!emailConfig.smtpHost) return { valid: false, message: 'SMTP host is required' };
        if (!emailConfig.fromAddress) return { valid: false, message: 'From address is required' };
        if (!emailConfig.toAddresses || emailConfig.toAddresses.length === 0) {
          return { valid: false, message: 'At least one recipient is required' };
        }
        return { valid: true, message: 'Valid' };
      }

      case 'sms': {
        const smsConfig = config as SMSConfig;
        if (!smsConfig.provider) return { valid: false, message: 'SMS provider is required' };
        if (!smsConfig.fromNumber) return { valid: false, message: 'From number is required' };
        if (!smsConfig.toNumbers || smsConfig.toNumbers.length === 0) {
          return { valid: false, message: 'At least one recipient is required' };
        }
        return { valid: true, message: 'Valid' };
      }

      case 'webhook': {
        const webhookConfig = config as WebhookConfig;
        if (!webhookConfig.url) return { valid: false, message: 'Webhook URL is required' };
        try {
          new URL(webhookConfig.url);
        } catch {
          return { valid: false, message: 'Invalid webhook URL' };
        }
        return { valid: true, message: 'Valid' };
      }

      case 'slack': {
        const slackConfig = config as SlackConfig;
        if (!slackConfig.webhookUrl) return { valid: false, message: 'Webhook URL is required' };
        try {
          new URL(slackConfig.webhookUrl);
        } catch {
          return { valid: false, message: 'Invalid webhook URL' };
        }
        return { valid: true, message: 'Valid' };
      }

      case 'discord': {
        const discordConfig = config as DiscordConfig;
        if (!discordConfig.webhookUrl) return { valid: false, message: 'Webhook URL is required' };
        try {
          new URL(discordConfig.webhookUrl);
        } catch {
          return { valid: false, message: 'Invalid webhook URL' };
        }
        return { valid: true, message: 'Valid' };
      }

      case 'telegram': {
        const telegramConfig = config as TelegramConfig;
        if (!telegramConfig.botToken) return { valid: false, message: 'Bot token is required' };
        if (!telegramConfig.chatIds || telegramConfig.chatIds.length === 0) {
          return { valid: false, message: 'At least one chat ID is required' };
        }
        return { valid: true, message: 'Valid' };
      }

      case 'pagerduty': {
        const pagerDutyConfig = config as PagerDutyConfig;
        if (!pagerDutyConfig.integrationKey) {
          return { valid: false, message: 'Integration key is required' };
        }
        return { valid: true, message: 'Valid' };
      }

      default:
        return { valid: false, message: 'Unknown channel type' };
    }
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; initialized: boolean } {
    return {
      size: this.channelCache.size,
      initialized: this.cacheInitialized,
    };
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.channelCache.clear();
    this.cacheInitialized = false;
    logger.info('Notification config cache cleared');
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const notificationConfigService = new NotificationConfigService();
