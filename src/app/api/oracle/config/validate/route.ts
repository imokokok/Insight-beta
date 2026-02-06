/**
 * 配置验证 API
 * POST /api/oracle/config/validate - 验证配置有效性
 */

import { logger } from '@/lib/logger';
import type { OracleConfig } from '@/lib/types/oracleTypes';
import { handleApi, rateLimit, requireAdmin } from '@/server/apiResponse';
import { validateOracleConfig, ensureEnhancedSchema } from '@/server/oracleConfigEnhanced';
import { generateRequestId } from '@/server/performance';

const RATE_LIMIT = { key: 'oracle_config_validate', limit: 60, windowMs: 60_000 };

interface ValidateRequest {
  config: Partial<OracleConfig>;
  options?: {
    checkConnectivity?: boolean;
    strictMode?: boolean;
  };
}

function validateRequest(body: unknown): ValidateRequest {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw Object.assign(new Error('invalid_request_body'), {
      status: 400,
      details: { message: 'Request body must be an object' },
    });
  }

  const { config, options } = body as Record<string, unknown>;

  if (!config || typeof config !== 'object') {
    throw Object.assign(new Error('invalid_config'), {
      status: 400,
      details: { message: 'config must be an object' },
    });
  }

  return {
    config: config as Partial<OracleConfig>,
    options: {
      checkConnectivity: (options as Record<string, unknown>)?.checkConnectivity === true,
      strictMode: (options as Record<string, unknown>)?.strictMode === true,
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
      const { config, options } = validateRequest(body);

      const result = await validateOracleConfig(config, options);

      const durationMs = Date.now() - startTime;

      logger.info('Config validation completed', {
        requestId,
        valid: result.valid,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
        durationMs,
      });

      return {
        valid: result.valid,
        errors: result.errors,
        warnings: result.warnings,
        summary: {
          totalChecks: result.errors.length + result.warnings.length + (result.valid ? 1 : 0),
          passed: result.valid,
        },
        meta: { requestId, durationMs },
      };
    });
  } catch (error) {
    logger.error('Config validation failed', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
