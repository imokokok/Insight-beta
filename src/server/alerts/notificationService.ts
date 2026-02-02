/**
 * Enterprise Alert Notification Service
 *
 * 企业级告警通知服务
 * 支持多渠道通知：邮件、短信、Webhook、Slack、Discord、Telegram
 *
 * @deprecated 此文件已拆分为模块化结构，请从 @/server/alerts/notifications 导入
 *
 * 新的导入方式：
 * - import { NotificationService } from '@/server/alerts/notifications'
 * - import { sendEmailNotification } from '@/server/alerts/notifications/email'
 * - import type { AlertNotification } from '@/server/alerts/notifications/types'
 *
 * 此文件保留用于向后兼容，将在未来版本中移除
 */

import { logger } from '@/lib/logger';

// Import from new modular structure
import {
  NotificationService,
  sendEmailNotification,
  sendSMSNotification,
  getSeverityColor,
  getSeverityLabel,
  formatPlainText,
  formatMarkdown,
  formatEmailBody,
  truncateText,
  sleep,
  fetchWithTimeout,
} from './notifications';

import type {
  NotificationChannel,
  AlertSeverity,
  AlertNotification,
  NotificationResult,
  EmailConfig,
  SMSConfig,
  WebhookConfig,
  SlackConfig,
  DiscordConfig,
  TelegramConfig,
  PagerDutyConfig,
  NotificationConfig,
} from './notifications';

// Re-export for backward compatibility
export {
  NotificationService,
  sendEmailNotification,
  sendSMSNotification,
  getSeverityColor,
  getSeverityLabel,
  formatPlainText,
  formatMarkdown,
  formatEmailBody,
  truncateText,
  sleep,
  fetchWithTimeout,
};

export type {
  NotificationChannel,
  AlertSeverity,
  AlertNotification,
  NotificationResult,
  EmailConfig,
  SMSConfig,
  WebhookConfig,
  SlackConfig,
  DiscordConfig,
  TelegramConfig,
  PagerDutyConfig,
  NotificationConfig,
};

// Re-export from new modular structure
export * from './notifications';

// 导出单例实例（向后兼容）
export const notificationService = new NotificationService();

logger.debug('notificationService loaded (using modular structure)');
