/**
 * 配置版本管理 API
 * GET  /api/oracle/config/versions?instanceId=xxx     - 获取版本历史
 * POST /api/oracle/config/versions/rollback           - 回滚到指定版本
 */

import { handleApi, rateLimit, requireAdmin } from '@/server/apiResponse';
import {
  getConfigVersions,
  rollbackConfigVersion,
  ensureEnhancedSchema,
} from '@/server/oracleConfigEnhanced';
import { appendAuditLog } from '@/server/observability';
import { getAdminActor } from '@/server/apiResponse';
import { generateRequestId } from '@/server/performance';
import { logger } from '@/lib/logger';

const RATE_LIMITS = {
  GET: { key: 'oracle_config_versions_get', limit: 120, windowMs: 60_000 },
  POST: { key: 'oracle_config_versions_rollback', limit: 10, windowMs: 60_000 },
};

// GET /api/oracle/config/versions
export async function GET(request: Request) {
  const requestId = generateRequestId();

  try {
    return await handleApi(request, async () => {
      const limited = await rateLimit(request, RATE_LIMITS.GET);
      if (limited) return limited;

      const auth = await requireAdmin(request, { strict: true, scope: 'oracle_config_write' });
      if (auth) return auth;

      await ensureEnhancedSchema();

      const url = new URL(request.url);
      const instanceId = url.searchParams.get('instanceId');
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const offset = parseInt(url.searchParams.get('offset') || '0', 10);

      if (!instanceId) {
        throw Object.assign(new Error('missing_instance_id'), {
          status: 400,
          details: { message: 'instanceId query parameter is required' },
        });
      }

      const { versions, total } = await getConfigVersions(instanceId, { limit, offset });

      return {
        versions,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + versions.length < total,
        },
        meta: { requestId },
      };
    });
  } catch (error) {
    logger.error('Failed to get config versions', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// POST /api/oracle/config/versions/rollback
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
      const { instanceId, version, reason } = body as {
        instanceId: string;
        version: number;
        reason?: string;
      };

      if (!instanceId || typeof version !== 'number') {
        throw Object.assign(new Error('invalid_request'), {
          status: 400,
          details: { message: 'instanceId and version are required' },
        });
      }

      const config = await rollbackConfigVersion(instanceId, version, {
        reason,
        createdBy: getAdminActor(request),
      });

      if (!config) {
        throw Object.assign(new Error('version_not_found'), {
          status: 404,
          details: { message: 'Version not found', instanceId, version },
        });
      }

      const durationMs = Date.now() - startTime;

      await appendAuditLog({
        actor: getAdminActor(request),
        action: 'config_version_rollback',
        entityType: 'oracle',
        entityId: instanceId,
        details: {
          requestId,
          instanceId,
          version,
          reason,
          durationMs,
        },
      });

      logger.info('Config version rollback completed', {
        requestId,
        instanceId,
        version,
        durationMs,
      });

      return {
        success: true,
        config,
        meta: { requestId, durationMs },
      };
    });
  } catch (error) {
    logger.error('Failed to rollback config version', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
