/**
 * 配置差异对比 API
 * POST /api/oracle/config/diff - 对比两个配置
 */

import { handleApi, rateLimit, requireAdmin } from '@/server/apiResponse';
import { diffConfigs, formatConfigDiff, ensureEnhancedSchema } from '@/server/oracleConfigEnhanced';
import { generateRequestId } from '@/server/performance';
import { logger } from '@/lib/logger';
import type { OracleConfig } from '@/lib/types/oracleTypes';

const RATE_LIMIT = { key: 'oracle_config_diff', limit: 60, windowMs: 60_000 };

interface DiffRequest {
  oldConfig: Partial<OracleConfig>;
  newConfig: Partial<OracleConfig>;
  options?: {
    format?: 'json' | 'text';
  };
}

function validateRequest(body: unknown): DiffRequest {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw Object.assign(new Error('invalid_request_body'), {
      status: 400,
      details: { message: 'Request body must be an object' },
    });
  }

  const { oldConfig, newConfig, options } = body as Record<string, unknown>;

  if (!oldConfig || typeof oldConfig !== 'object') {
    throw Object.assign(new Error('invalid_old_config'), {
      status: 400,
      details: { message: 'oldConfig must be an object' },
    });
  }

  if (!newConfig || typeof newConfig !== 'object') {
    throw Object.assign(new Error('invalid_new_config'), {
      status: 400,
      details: { message: 'newConfig must be an object' },
    });
  }

  return {
    oldConfig: oldConfig as Partial<OracleConfig>,
    newConfig: newConfig as Partial<OracleConfig>,
    options: {
      format: (options as Record<string, unknown>)?.format as 'json' | 'text' | undefined,
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
      const { oldConfig, newConfig, options } = validateRequest(body);

      const diffs = diffConfigs(oldConfig, newConfig);
      const durationMs = Date.now() - startTime;

      logger.info('Config diff completed', {
        requestId,
        diffCount: diffs.length,
        durationMs,
      });

      const response: {
        diffs: ReturnType<typeof diffConfigs>;
        summary: {
          totalChanges: number;
          added: number;
          removed: number;
          modified: number;
        };
        formatted?: string;
        meta: { requestId: string; durationMs: number };
      } = {
        diffs,
        summary: {
          totalChanges: diffs.length,
          added: diffs.filter((d) => d.type === 'added').length,
          removed: diffs.filter((d) => d.type === 'removed').length,
          modified: diffs.filter((d) => d.type === 'modified').length,
        },
        meta: { requestId, durationMs },
      };

      if (options?.format === 'text') {
        response.formatted = formatConfigDiff(diffs);
      }

      return response;
    });
  } catch (error) {
    logger.error('Config diff failed', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
