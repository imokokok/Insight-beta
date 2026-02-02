/**
 * Webhook Module - Webhook 通知模块
 *
 * 支持配置变更通知、签名验证、重试机制
 */

import type { WebhookConfig, WebhookEvent, WebhookPayload } from '@/lib/types/oracleTypes';
import { logger } from '@/lib/logger';
import { hasDatabase, query } from '../db';
import crypto from 'node:crypto';

interface DbWebhookRow {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string | null;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Webhook 签名生成
 */
export function generateWebhookSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * 发送 Webhook 通知
 */
async function sendWebhookNotification(
  webhook: WebhookConfig,
  event: WebhookEvent,
  data: unknown,
): Promise<{ success: boolean; error?: string }> {
  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const payloadString = JSON.stringify(payload);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Webhook-Event': event,
    'X-Webhook-Timestamp': payload.timestamp,
  };

  // 如果配置了 secret，添加签名
  if (webhook.secret) {
    const signature = generateWebhookSignature(payloadString, webhook.secret);
    headers['X-Webhook-Signature'] = `sha256=${signature}`;
    payload.signature = signature;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 秒超时

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 触发配置变更 Webhook 通知
 */
export async function notifyConfigChange(event: WebhookEvent, data: unknown): Promise<void> {
  if (!hasDatabase()) return;

  try {
    // 获取所有启用的 webhook
    const webhooks = await listWebhookConfigs();
    const matchingWebhooks = webhooks.filter((w) => w.enabled && w.events.includes(event));

    if (matchingWebhooks.length === 0) return;

    // 并行发送通知
    const results = await Promise.allSettled(
      matchingWebhooks.map((webhook) => sendWebhookNotification(webhook, event, data)),
    );

    // 记录结果
    results.forEach((result, index) => {
      const webhook = matchingWebhooks[index];
      if (webhook) {
        if (result.status === 'rejected' || !result.value.success) {
          logger.warn('Webhook notification failed', {
            webhookId: webhook.id,
            webhookName: webhook.name,
            event,
            error: result.status === 'rejected' ? String(result.reason) : result.value.error,
          });
        } else {
          logger.debug('Webhook notification sent', {
            webhookId: webhook.id,
            webhookName: webhook.name,
            event,
          });
        }
      }
    });
  } catch (error) {
    logger.error('Failed to send webhook notifications', {
      event,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * 列出所有 Webhook 配置
 */
export async function listWebhookConfigs(): Promise<WebhookConfig[]> {
  if (!hasDatabase()) return [];

  const res = await query<DbWebhookRow>('SELECT * FROM webhook_configs ORDER BY created_at DESC');

  return res.rows.map((row) => ({
    id: row.id,
    name: row.name,
    url: row.url,
    events: row.events as WebhookEvent[],
    secret: row.secret || undefined,
    enabled: row.enabled,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));
}

/**
 * 获取单个 Webhook 配置
 */
export async function getWebhookConfig(id: string): Promise<WebhookConfig | null> {
  if (!hasDatabase()) return null;

  const res = await query<DbWebhookRow>('SELECT * FROM webhook_configs WHERE id = $1', [id]);

  if (!res.rows[0]) return null;

  const row = res.rows[0];
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    events: row.events as WebhookEvent[],
    secret: row.secret || undefined,
    enabled: row.enabled,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/**
 * 创建 Webhook 配置
 */
export async function createWebhookConfig(
  config: Omit<WebhookConfig, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<WebhookConfig> {
  if (!hasDatabase()) {
    throw new Error('Database not available');
  }

  const id = crypto.randomUUID();
  const now = new Date();

  await query(
    `INSERT INTO webhook_configs (id, name, url, events, secret, enabled, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, config.name, config.url, config.events, config.secret || null, config.enabled, now, now],
  );

  return {
    ...config,
    id,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/**
 * 更新 Webhook 配置
 */
export async function updateWebhookConfig(
  id: string,
  updates: Partial<Omit<WebhookConfig, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<WebhookConfig | null> {
  if (!hasDatabase()) return null;

  const sets: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    sets.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.url !== undefined) {
    sets.push(`url = $${paramIndex++}`);
    values.push(updates.url);
  }
  if (updates.events !== undefined) {
    sets.push(`events = $${paramIndex++}`);
    values.push(updates.events);
  }
  if (updates.secret !== undefined) {
    sets.push(`secret = $${paramIndex++}`);
    values.push(updates.secret || null);
  }
  if (updates.enabled !== undefined) {
    sets.push(`enabled = $${paramIndex++}`);
    values.push(updates.enabled);
  }

  sets.push(`updated_at = $${paramIndex++}`);
  values.push(new Date());
  values.push(id);

  const res = await query<DbWebhookRow>(
    `UPDATE webhook_configs SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values as (string | number | boolean | string[] | Date | null)[],
  );

  if (!res.rows[0]) return null;

  const row = res.rows[0];
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    events: row.events as WebhookEvent[],
    secret: row.secret || undefined,
    enabled: row.enabled,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/**
 * 删除 Webhook 配置
 */
export async function deleteWebhookConfig(id: string): Promise<boolean> {
  if (!hasDatabase()) return false;

  const res = await query('DELETE FROM webhook_configs WHERE id = $1 RETURNING id', [id]);

  return res.rows.length > 0;
}
