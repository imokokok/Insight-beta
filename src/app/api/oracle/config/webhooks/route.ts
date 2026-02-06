/**
 * Webhook 配置管理 API
 * GET    /api/oracle/config/webhooks     - 列出所有 webhook
 * POST   /api/oracle/config/webhooks     - 创建 webhook
 * PUT    /api/oracle/config/webhooks/[id] - 更新 webhook
 * DELETE /api/oracle/config/webhooks/[id] - 删除 webhook
 */

import { logger } from '@/lib/logger';
import { handleApi, rateLimit, requireAdmin, getAdminActor } from '@/server/apiResponse';
import { appendAuditLog } from '@/server/observability';
import {
  listWebhookConfigs,
  getWebhookConfig,
  createWebhookConfig,
  updateWebhookConfig,
  deleteWebhookConfig,
  ensureEnhancedSchema,
} from '@/server/oracleConfigEnhanced';
import type { WebhookEvent } from '@/server/oracleConfigEnhanced';
import { generateRequestId } from '@/server/performance';

const RATE_LIMITS = {
  GET: { key: 'oracle_config_webhooks_get', limit: 120, windowMs: 60_000 },
  POST: { key: 'oracle_config_webhooks_post', limit: 20, windowMs: 60_000 },
  PUT: { key: 'oracle_config_webhooks_put', limit: 20, windowMs: 60_000 },
  DELETE: { key: 'oracle_config_webhooks_delete', limit: 10, windowMs: 60_000 },
};

const VALID_WEBHOOK_EVENTS: WebhookEvent[] = [
  'config.created',
  'config.updated',
  'config.deleted',
  'config.batch_updated',
  'template.applied',
];

interface CreateWebhookRequest {
  name: string;
  url: string;
  events: WebhookEvent[];
  secret?: string;
  enabled: boolean;
}

interface UpdateWebhookRequest {
  name?: string;
  url?: string;
  events?: WebhookEvent[];
  secret?: string;
  enabled?: boolean;
}

function validateCreateRequest(body: unknown): CreateWebhookRequest {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw Object.assign(new Error('invalid_request_body'), {
      status: 400,
      details: { message: 'Request body must be an object' },
    });
  }

  const { name, url, events, secret, enabled } = body as Record<string, unknown>;

  if (typeof name !== 'string' || !name.trim()) {
    throw Object.assign(new Error('invalid_name'), {
      status: 400,
      details: { message: 'name must be a non-empty string' },
    });
  }

  if (typeof url !== 'string' || !url.trim()) {
    throw Object.assign(new Error('invalid_url'), {
      status: 400,
      details: { message: 'url must be a non-empty string' },
    });
  }

  // 验证 URL 格式
  try {
    new URL(url);
  } catch {
    throw Object.assign(new Error('invalid_url_format'), {
      status: 400,
      details: { message: 'url must be a valid URL' },
    });
  }

  if (!Array.isArray(events) || events.length === 0) {
    throw Object.assign(new Error('invalid_events'), {
      status: 400,
      details: { message: 'events must be a non-empty array' },
    });
  }

  // 验证事件类型
  for (const event of events) {
    if (!VALID_WEBHOOK_EVENTS.includes(event as WebhookEvent)) {
      throw Object.assign(new Error('invalid_event_type'), {
        status: 400,
        details: {
          message: `Invalid event type: ${event}`,
          validEvents: VALID_WEBHOOK_EVENTS,
        },
      });
    }
  }

  return {
    name: name.trim(),
    url: url.trim(),
    events: events as WebhookEvent[],
    secret: typeof secret === 'string' ? secret : undefined,
    enabled: enabled !== false, // 默认启用
  };
}

function validateUpdateRequest(body: unknown): UpdateWebhookRequest {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw Object.assign(new Error('invalid_request_body'), {
      status: 400,
      details: { message: 'Request body must be an object' },
    });
  }

  const { name, url, events, secret, enabled } = body as Record<string, unknown>;
  const updates: UpdateWebhookRequest = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      throw Object.assign(new Error('invalid_name'), {
        status: 400,
        details: { message: 'name must be a non-empty string' },
      });
    }
    updates.name = name.trim();
  }

  if (url !== undefined) {
    if (typeof url !== 'string' || !url.trim()) {
      throw Object.assign(new Error('invalid_url'), {
        status: 400,
        details: { message: 'url must be a non-empty string' },
      });
    }
    // 验证 URL 格式
    try {
      new URL(url);
    } catch {
      throw Object.assign(new Error('invalid_url_format'), {
        status: 400,
        details: { message: 'url must be a valid URL' },
      });
    }
    updates.url = url.trim();
  }

  if (events !== undefined) {
    if (!Array.isArray(events) || events.length === 0) {
      throw Object.assign(new Error('invalid_events'), {
        status: 400,
        details: { message: 'events must be a non-empty array' },
      });
    }

    // 验证事件类型
    for (const event of events) {
      if (!VALID_WEBHOOK_EVENTS.includes(event as WebhookEvent)) {
        throw Object.assign(new Error('invalid_event_type'), {
          status: 400,
          details: {
            message: `Invalid event type: ${event}`,
            validEvents: VALID_WEBHOOK_EVENTS,
          },
        });
      }
    }
    updates.events = events as WebhookEvent[];
  }

  if (secret !== undefined && secret !== null) {
    updates.secret = typeof secret === 'string' ? secret : undefined;
  }

  if (enabled !== undefined) {
    updates.enabled = enabled === true;
  }

  return updates;
}

// GET /api/oracle/config/webhooks
export async function GET(request: Request) {
  const requestId = generateRequestId();

  try {
    return await handleApi(request, async () => {
      const limited = await rateLimit(request, RATE_LIMITS.GET);
      if (limited) return limited;

      const auth = await requireAdmin(request, { strict: true, scope: 'oracle_config_write' });
      if (auth) return auth;

      await ensureEnhancedSchema();

      // 从 URL 中提取 webhook ID（如果有）
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const webhookId = pathParts[pathParts.length - 1];

      if (webhookId && webhookId !== 'webhooks') {
        // 获取单个 webhook
        const webhook = await getWebhookConfig(webhookId);
        if (!webhook) {
          throw Object.assign(new Error('webhook_not_found'), {
            status: 404,
            details: { message: 'Webhook not found', webhookId },
          });
        }
        return { webhook };
      }

      // 获取所有 webhooks
      const webhooks = await listWebhookConfigs();
      return { webhooks, count: webhooks.length };
    });
  } catch (error) {
    logger.error('Failed to get webhooks', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// POST /api/oracle/config/webhooks
export async function POST(request: Request) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    return await handleApi(request, async () => {
      const limited = await rateLimit(request, RATE_LIMITS.POST);
      if (limited) return limited;

      const auth = await requireAdmin(request, { strict: true, scope: 'oracle_config_write' });
      if (auth) return auth;

      await ensureEnhancedSchema();

      const body = await request.json();
      const data = validateCreateRequest(body);

      const webhook = await createWebhookConfig(data);

      const durationMs = Date.now() - startTime;

      await appendAuditLog({
        actor: getAdminActor(request),
        action: 'webhook_config_created',
        entityType: 'webhook_config',
        entityId: webhook.id,
        details: {
          requestId,
          webhookId: webhook.id,
          webhookName: webhook.name,
          events: webhook.events,
          durationMs,
        },
      });

      logger.info('Webhook config created', {
        requestId,
        webhookId: webhook.id,
        webhookName: webhook.name,
        events: webhook.events,
        durationMs,
      });

      return {
        webhook,
        meta: { requestId, durationMs },
      };
    });
  } catch (error) {
    logger.error('Failed to create webhook', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// PUT /api/oracle/config/webhooks/[id]
export async function PUT(request: Request) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    return await handleApi(request, async () => {
      const limited = await rateLimit(request, RATE_LIMITS.PUT);
      if (limited) return limited;

      const auth = await requireAdmin(request, { strict: true, scope: 'oracle_config_write' });
      if (auth) return auth;

      await ensureEnhancedSchema();

      // 从 URL 中提取 webhook ID
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const webhookId = pathParts[pathParts.length - 1];

      if (!webhookId || webhookId === 'webhooks') {
        throw Object.assign(new Error('invalid_webhook_id'), {
          status: 400,
          details: { message: 'Webhook ID is required' },
        });
      }

      const body = await request.json();
      const updates = validateUpdateRequest(body);

      const webhook = await updateWebhookConfig(webhookId, updates);

      if (!webhook) {
        throw Object.assign(new Error('webhook_not_found'), {
          status: 404,
          details: { message: 'Webhook not found', webhookId },
        });
      }

      const durationMs = Date.now() - startTime;

      await appendAuditLog({
        actor: getAdminActor(request),
        action: 'webhook_config_updated',
        entityType: 'webhook_config',
        entityId: webhook.id,
        details: {
          requestId,
          webhookId: webhook.id,
          updates: Object.keys(updates),
          durationMs,
        },
      });

      logger.info('Webhook config updated', {
        requestId,
        webhookId: webhook.id,
        webhookName: webhook.name,
        durationMs,
      });

      return {
        webhook,
        meta: { requestId, durationMs },
      };
    });
  } catch (error) {
    logger.error('Failed to update webhook', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// DELETE /api/oracle/config/webhooks/[id]
export async function DELETE(request: Request) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    return await handleApi(request, async () => {
      const limited = await rateLimit(request, RATE_LIMITS.DELETE);
      if (limited) return limited;

      const auth = await requireAdmin(request, { strict: true, scope: 'oracle_config_write' });
      if (auth) return auth;

      await ensureEnhancedSchema();

      // 从 URL 中提取 webhook ID
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const webhookId = pathParts[pathParts.length - 1];

      if (!webhookId || webhookId === 'webhooks') {
        throw Object.assign(new Error('invalid_webhook_id'), {
          status: 400,
          details: { message: 'Webhook ID is required' },
        });
      }

      const deleted = await deleteWebhookConfig(webhookId);

      if (!deleted) {
        throw Object.assign(new Error('webhook_not_found'), {
          status: 404,
          details: { message: 'Webhook not found', webhookId },
        });
      }

      const durationMs = Date.now() - startTime;

      await appendAuditLog({
        actor: getAdminActor(request),
        action: 'webhook_config_deleted',
        entityType: 'webhook_config',
        entityId: webhookId,
        details: {
          requestId,
          webhookId,
          durationMs,
        },
      });

      logger.info('Webhook config deleted', {
        requestId,
        webhookId,
        durationMs,
      });

      return {
        success: true,
        meta: { requestId, durationMs },
      };
    });
  } catch (error) {
    logger.error('Failed to delete webhook', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
