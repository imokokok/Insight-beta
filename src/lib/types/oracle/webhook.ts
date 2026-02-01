/**
 * Webhook Types - Webhook 相关类型定义
 */

export type WebhookEvent =
  | 'config.created'
  | 'config.updated'
  | 'config.deleted'
  | 'config.batch_updated'
  | 'template.applied';

export type WebhookConfig = {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  secret?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WebhookPayload = {
  event: WebhookEvent;
  timestamp: string;
  data: unknown;
  signature?: string;
};
