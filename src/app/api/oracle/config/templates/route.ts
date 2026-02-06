/**
 * 配置模板 API
 * GET    /api/oracle/config/templates     - 列出所有模板
 * POST   /api/oracle/config/templates     - 创建模板
 * GET    /api/oracle/config/templates/default - 获取默认模板
 */

import { logger } from '@/lib/logger';
import type { OracleConfig } from '@/lib/types/oracleTypes';
import { handleApi, rateLimit, requireAdmin, getAdminActor } from '@/server/apiResponse';
import { appendAuditLog } from '@/server/observability';
import {
  listConfigTemplates,
  getDefaultConfigTemplate,
  createConfigTemplate,
  updateConfigTemplate,
  deleteConfigTemplate,
  ensureEnhancedSchema,
} from '@/server/oracleConfigEnhanced';
import { generateRequestId } from '@/server/performance';

const RATE_LIMITS = {
  GET: { key: 'oracle_config_templates_get', limit: 120, windowMs: 60_000 },
  POST: { key: 'oracle_config_templates_post', limit: 20, windowMs: 60_000 },
  PUT: { key: 'oracle_config_templates_put', limit: 20, windowMs: 60_000 },
  DELETE: { key: 'oracle_config_templates_delete', limit: 10, windowMs: 60_000 },
};

interface CreateTemplateRequest {
  name: string;
  description?: string;
  config: Partial<OracleConfig>;
  isDefault: boolean;
}

interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  config?: Partial<OracleConfig>;
  isDefault?: boolean;
}

function validateCreateRequest(body: unknown): CreateTemplateRequest {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw Object.assign(new Error('invalid_request_body'), {
      status: 400,
      details: { message: 'Request body must be an object' },
    });
  }

  const { name, description, config, isDefault } = body as Record<string, unknown>;

  if (typeof name !== 'string' || !name.trim()) {
    throw Object.assign(new Error('invalid_name'), {
      status: 400,
      details: { message: 'name must be a non-empty string' },
    });
  }

  if (!config || typeof config !== 'object') {
    throw Object.assign(new Error('invalid_config'), {
      status: 400,
      details: { message: 'config must be an object' },
    });
  }

  return {
    name: name.trim(),
    description: typeof description === 'string' ? description : undefined,
    config: config as Partial<OracleConfig>,
    isDefault: isDefault === true,
  };
}

function validateUpdateRequest(body: unknown): UpdateTemplateRequest {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw Object.assign(new Error('invalid_request_body'), {
      status: 400,
      details: { message: 'Request body must be an object' },
    });
  }

  const { name, description, config, isDefault } = body as Record<string, unknown>;
  const updates: UpdateTemplateRequest = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      throw Object.assign(new Error('invalid_name'), {
        status: 400,
        details: { message: 'name must be a non-empty string' },
      });
    }
    updates.name = name.trim();
  }

  if (description !== undefined) {
    updates.description = typeof description === 'string' ? description : undefined;
  }

  if (config !== undefined) {
    if (!config || typeof config !== 'object') {
      throw Object.assign(new Error('invalid_config'), {
        status: 400,
        details: { message: 'config must be an object' },
      });
    }
    updates.config = config as Partial<OracleConfig>;
  }

  if (isDefault !== undefined) {
    updates.isDefault = isDefault === true;
  }

  return updates;
}

// GET /api/oracle/config/templates
export async function GET(request: Request) {
  const requestId = generateRequestId();

  try {
    return await handleApi(request, async () => {
      const limited = await rateLimit(request, RATE_LIMITS.GET);
      if (limited) return limited;

      // 确保 schema 存在
      await ensureEnhancedSchema();

      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const isDefaultEndpoint = pathParts[pathParts.length - 1] === 'default';

      if (isDefaultEndpoint) {
        const template = await getDefaultConfigTemplate();
        if (!template) {
          throw Object.assign(new Error('default_template_not_found'), {
            status: 404,
            details: { message: 'No default template configured' },
          });
        }
        return { template };
      }

      const templates = await listConfigTemplates();
      return { templates, count: templates.length };
    });
  } catch (error) {
    logger.error('Failed to list templates', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// POST /api/oracle/config/templates
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

      const template = await createConfigTemplate(data);

      const durationMs = Date.now() - startTime;

      await appendAuditLog({
        actor: getAdminActor(request),
        action: 'config_template_created',
        entityType: 'config_template',
        entityId: template.id,
        details: {
          requestId,
          templateId: template.id,
          templateName: template.name,
          isDefault: template.isDefault,
          durationMs,
        },
      });

      logger.info('Config template created', {
        requestId,
        templateId: template.id,
        templateName: template.name,
        durationMs,
      });

      return {
        template,
        meta: { requestId, durationMs },
      };
    });
  } catch (error) {
    logger.error('Failed to create template', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// PUT /api/oracle/config/templates/[id]
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

      // 从 URL 中提取模板 ID
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const templateId = pathParts[pathParts.length - 1];

      if (!templateId || templateId === 'templates') {
        throw Object.assign(new Error('invalid_template_id'), {
          status: 400,
          details: { message: 'Template ID is required' },
        });
      }

      const body = await request.json();
      const updates = validateUpdateRequest(body);

      const template = await updateConfigTemplate(templateId, updates);

      if (!template) {
        throw Object.assign(new Error('template_not_found'), {
          status: 404,
          details: { message: 'Template not found', templateId },
        });
      }

      const durationMs = Date.now() - startTime;

      await appendAuditLog({
        actor: getAdminActor(request),
        action: 'config_template_updated',
        entityType: 'config_template',
        entityId: template.id,
        details: {
          requestId,
          templateId: template.id,
          updates: Object.keys(updates),
          durationMs,
        },
      });

      logger.info('Config template updated', {
        requestId,
        templateId: template.id,
        durationMs,
      });

      return {
        template,
        meta: { requestId, durationMs },
      };
    });
  } catch (error) {
    logger.error('Failed to update template', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// DELETE /api/oracle/config/templates/[id]
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

      // 从 URL 中提取模板 ID
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const templateId = pathParts[pathParts.length - 1];

      if (!templateId || templateId === 'templates') {
        throw Object.assign(new Error('invalid_template_id'), {
          status: 400,
          details: { message: 'Template ID is required' },
        });
      }

      const deleted = await deleteConfigTemplate(templateId);

      if (!deleted) {
        throw Object.assign(new Error('template_not_found'), {
          status: 404,
          details: { message: 'Template not found', templateId },
        });
      }

      const durationMs = Date.now() - startTime;

      await appendAuditLog({
        actor: getAdminActor(request),
        action: 'config_template_deleted',
        entityType: 'config_template',
        entityId: templateId,
        details: {
          requestId,
          templateId,
          durationMs,
        },
      });

      logger.info('Config template deleted', {
        requestId,
        templateId,
        durationMs,
      });

      return {
        success: true,
        meta: { requestId, durationMs },
      };
    });
  } catch (error) {
    logger.error('Failed to delete template', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
