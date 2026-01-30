/**
 * 配置克隆 API
 * POST /api/oracle/config/clone - 克隆配置到新的实例
 */

import { handleApi, rateLimit, requireAdmin } from '@/server/apiResponse';
import { cloneConfig, ensureEnhancedSchema } from '@/server/oracleConfigEnhanced';
import { appendAuditLog } from '@/server/observability';
import { getAdminActor } from '@/server/apiResponse';
import { generateRequestId } from '@/server/performance';
import { logger } from '@/lib/logger';
import type { OracleConfig } from '@/lib/types/oracleTypes';

const RATE_LIMIT = { key: 'oracle_config_clone', limit: 20, windowMs: 60_000 };

interface CloneRequest {
  sourceInstanceId: string;
  targetInstanceId: string;
  options?: {
    overwriteExisting?: boolean;
    customConfig?: Partial<OracleConfig>;
  };
}

function validateRequest(body: unknown): CloneRequest {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw Object.assign(new Error('invalid_request_body'), {
      status: 400,
      details: { message: 'Request body must be an object' },
    });
  }

  const { sourceInstanceId, targetInstanceId, options } = body as Record<string, unknown>;

  if (typeof sourceInstanceId !== 'string' || !sourceInstanceId.trim()) {
    throw Object.assign(new Error('invalid_source_instance_id'), {
      status: 400,
      details: { message: 'sourceInstanceId must be a non-empty string' },
    });
  }

  if (typeof targetInstanceId !== 'string' || !targetInstanceId.trim()) {
    throw Object.assign(new Error('invalid_target_instance_id'), {
      status: 400,
      details: { message: 'targetInstanceId must be a non-empty string' },
    });
  }

  if (sourceInstanceId === targetInstanceId) {
    throw Object.assign(new Error('same_instance'), {
      status: 400,
      details: { message: 'source and target instance IDs must be different' },
    });
  }

  return {
    sourceInstanceId: sourceInstanceId.trim(),
    targetInstanceId: targetInstanceId.trim(),
    options: {
      overwriteExisting: (options as Record<string, unknown>)?.overwriteExisting === true,
      customConfig: (options as Record<string, unknown>)?.customConfig as
        | Partial<OracleConfig>
        | undefined,
    },
  };
}

export async function POST(request: Request) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    return await handleApi(request, async () => {
      const limited = await rateLimit(request, RATE_LIMIT);
      if (limited) return limited;

      const auth = await requireAdmin(request, { strict: true, scope: 'oracle_config_write' });
      if (auth) return auth;

      await ensureEnhancedSchema();

      const body = await request.json();
      const { sourceInstanceId, targetInstanceId, options } = validateRequest(body);

      const result = await cloneConfig(sourceInstanceId, targetInstanceId, {
        overwriteExisting: options?.overwriteExisting,
        customConfig: options?.customConfig,
      });

      if (!result.success) {
        throw Object.assign(new Error('clone_failed'), {
          status: 400,
          details: { message: result.error || 'Clone operation failed' },
        });
      }

      const durationMs = Date.now() - startTime;

      await appendAuditLog({
        actor: getAdminActor(request),
        action: 'oracle_config_cloned',
        entityType: 'oracle',
        entityId: targetInstanceId,
        details: {
          requestId,
          sourceInstanceId,
          targetInstanceId,
          durationMs,
        },
      });

      logger.info('Config clone completed', {
        requestId,
        sourceInstanceId,
        targetInstanceId,
        durationMs,
      });

      return {
        success: true,
        sourceInstanceId,
        targetInstanceId,
        meta: { requestId, durationMs },
      };
    });
  } catch (error) {
    logger.error('Config clone failed', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
