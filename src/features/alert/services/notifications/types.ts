/**
 * Notification Types
 *
 * 通知服务类型定义
 */

export type NotificationChannel =
  | 'email'
  | 'sms'
  | 'webhook'
  | 'slack'
  | 'discord'
  | 'telegram'
  | 'pagerduty';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface AlertNotification {
  id: string;
  alertId: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  details: Record<string, unknown>;
  timestamp: Date;
  protocol?: string;
  chain?: string;
  symbol?: string;
}

export interface NotificationResult {
  success: boolean;
  channel: NotificationChannel;
  messageId?: string;
  error?: string;
  timestamp: Date;
  durationMs: number;
}

// ============================================================================
// Channel Configs
// ============================================================================

export interface EmailConfig {
  type: 'email';
  smtpHost: string;
  smtpPort: number;
  username: string;
  password: string;
  fromAddress: string;
  toAddresses: string[];
  useTLS: boolean;
}

export interface SMSConfig {
  type: 'sms';
  provider: 'twilio' | 'aws_sns' | 'aliyun';
  accountSid?: string;
  authToken?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  fromNumber: string;
  toNumbers: string[];
  templateCode?: string;
}

export interface WebhookConfig {
  type: 'webhook';
  url: string;
  method: 'POST' | 'PUT';
  headers: Record<string, string>;
  timeoutMs: number;
  retryCount: number;
}

export interface SlackConfig {
  type: 'slack';
  webhookUrl: string;
  channel?: string;
  username?: string;
  iconEmoji?: string;
}

export interface DiscordConfig {
  type: 'discord';
  webhookUrl: string;
  username?: string;
  avatarUrl?: string;
}

export interface TelegramConfig {
  type: 'telegram';
  botToken: string;
  chatIds: string[];
  parseMode: 'HTML' | 'Markdown';
}

export interface PagerDutyConfig {
  type: 'pagerduty';
  integrationKey: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
}

export type NotificationConfig =
  | EmailConfig
  | SMSConfig
  | WebhookConfig
  | SlackConfig
  | DiscordConfig
  | TelegramConfig
  | PagerDutyConfig;
