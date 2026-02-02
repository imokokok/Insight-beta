/**
 * Notifications Module
 *
 * 通知服务模块 - 统一导出
 */

// Types
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
} from './types';

// Utilities
export {
  getSeverityColor,
  getSeverityLabel,
  formatPlainText,
  formatMarkdown,
  formatEmailBody,
  truncateText,
  sleep,
  fetchWithTimeout,
} from './utils';

// Channel implementations
export { sendEmailNotification } from './email';
export { sendSMSNotification } from './sms';

// Notification Service
export { NotificationService } from './notificationService';
