/**
 * 批量配置更新 API
 * POST /api/oracle/config/batch
 */

import { logger } from '@/lib/logger';
import type { OracleConfig } from '@/lib/types/oracleTypes';
import { handleApi, rateLimit, requireAdmin, getAdminActor } from '@/server/apiResponse';
import { appendAuditLog } from '@/server/observability';
import { validateOracleConfigPatch } from '@/server/oracle';
import { batchUpdateOracleConfigs } from '@/server/oracleConfigEnhanced';
import type { BatchConfigUpdate, BatchUpdateResult } from '@/server/oracleConfigEnhanced';
import { generateRequestId } from '@/server/performance';

const RATE_LIMIT = { key: 'oracle_config_batch', limit: 10, windowMs: 60_000 };

interface BatchUpdateRequest {
  updates: Array<{
    instanceId: string;
    config: Partial<OracleConfig>;
  }>;
  options?: {
    continueOnError?: boolean;
    useTransaction?: boolean;
  };
}

function validateBatchRequest(body: unknown): BatchUpdateRequest {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw Object.assign(new Error('invalid_request_body'), {
      status: 400,
      details: { message: 'Request body must be an object' },
    });
  }

  const { updates, options } = body as Record<string, unknown>;

  if (!Array.isArray(updates) || updates.length === 0) {
    throw Object.assign(new Error('invalid_updates'), {
      status: 400,
      details: { message: 'updates must be a non-empty array' },
    });
  }

  if (updates.length > 100) {
    throw Object.assign(new Error('too_many_updates'), {
      status: 400,
      details: { message: 'Maximum 100 updates per batch', received: updates.length },
    });
  }

  const validatedUpdates: BatchConfigUpdate[] = [];

  for (let i = 0; i < updates.length; i++) {
    const update = updates[i];
    if (!update || typeof update !== 'object') {
      throw Object.assign(new Error('invalid_update_item'), {
        status: 400,
        details: { message: `Update at index ${i} must be an object`, index: i },
      });
    }

    const { instanceId, config } = update as Record<string, unknown>;

    if (typeof instanceId !== 'string' || !instanceId.trim()) {
      throw Object.assign(new Error('invalid_instance_id'), {
        status: 400,
        details: { message: `instanceId at index ${i} must be a non-empty string`, index: i },
      });
    }

    if (!config || typeof config !== 'object') {
      throw Object.assign(new Error('invalid_config'), {
        status: 400,
        details: { message: `config at index ${i} must be an object`, index: i },
      });
    }

    // 验证配置字段
    try {
      const validatedConfig = validateOracleConfigPatch(config as Partial<OracleConfig>);
      validatedUpdates.push({
        instanceId: instanceId.trim(),
        config: validatedConfig,
      });
    } catch (error) {
      throw Object.assign(new Error('config_validation_failed'), {
        status: 400,
        details: {
          message: `Config validation failed at index ${i}`,
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  return {
    updates: validatedUpdates,
    options: {
      continueOnError: (options as Record<string, unknown>)?.continueOnError !== false,
      useTransaction: (options as Record<string, unknown>)?.useTransaction !== false,
    },
  };
}

export async function POST(request: Request) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    return await handleApi(request, async () => {
      // 速率限制
      const limited = await rateLimit(request, RATE_LIMIT);
      if (limited) return limited;

      // 权限验证
      const auth = await requireAdmin(request, { strict: true, scope: 'oracle_config_write' });
      if (auth) return auth;

      // 解析和验证请求体
      const body = await request.json();
      const { updates, options } = validateBatchRequest(body);

      logger.info('Starting batch config update', {
        requestId,
        count: updates.length,
        instanceIds: updates.map((u) => u.instanceId),
      });

      // 执行批量更新
      const result: BatchUpdateResult = await batchUpdateOracleConfigs(updates, options);

      const durationMs = Date.now() - startTime;

      // 记录审计日志
      await appendAuditLog({
        actor: getAdminActor(request),
        action: 'oracle_config_batch_updated',
        entityType: 'oracle',
        entityId: null,
        details: {
          requestId,
          count: updates.length,
          successCount: result.success.length,
          failedCount: result.failed.length,
          successIds: result.success,
          failedDetails: result.failed,
          durationMs,
        },
      });

      logger.info('Batch config update completed', {
        requestId,
        durationMs,
        successCount: result.success.length,
        failedCount: result.failed.length,
      });

      return {
        success: result.failed.length === 0,
        data: result,
        meta: {
          requestId,
          durationMs,
          totalCount: updates.length,
        },
      };
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('Batch config update failed', {
      requestId,
      durationMs,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
