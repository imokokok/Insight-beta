/**
 * 配置搜索 API
 * GET /api/oracle/config/search - 搜索和过滤配置
 */

import { handleApi, rateLimit, requireAdmin } from '@/server/apiResponse';
import { searchConfigs, ensureEnhancedSchema } from '@/server/oracleConfigEnhanced';
import { generateRequestId } from '@/server/performance';
import { logger } from '@/lib/logger';

const RATE_LIMIT = { key: 'oracle_config_search', limit: 120, windowMs: 60_000 };

// GET /api/oracle/config/search
export async function GET(request: Request) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    return await handleApi(request, async () => {
      const limited = await rateLimit(request, RATE_LIMIT);
      if (limited) return limited;

      const auth = await requireAdmin(request, { strict: true, scope: 'oracle_config_write' });
      if (auth) return auth;

      await ensureEnhancedSchema();

      const url = new URL(request.url);

      // 解析查询参数
      const searchQuery = url.searchParams.get('q') || undefined;
      const chain = url.searchParams.get('chain') || undefined;
      const hasContractAddress = url.searchParams.has('hasContractAddress')
        ? url.searchParams.get('hasContractAddress') === 'true'
        : undefined;
      const sortBy =
        (url.searchParams.get('sortBy') as 'name' | 'createdAt' | 'updatedAt') || 'name';
      const sortOrder = (url.searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc';
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const offset = parseInt(url.searchParams.get('offset') || '0', 10);

      // 验证参数
      if (limit < 1 || limit > 100) {
        throw Object.assign(new Error('invalid_limit'), {
          status: 400,
          details: { message: 'limit must be between 1 and 100' },
        });
      }

      if (offset < 0) {
        throw Object.assign(new Error('invalid_offset'), {
          status: 400,
          details: { message: 'offset must be non-negative' },
        });
      }

      const { results, total } = await searchConfigs({
        query: searchQuery,
        chain,
        hasContractAddress,
        sortBy,
        sortOrder,
        limit,
        offset,
      });

      const durationMs = Date.now() - startTime;

      logger.info('Config search completed', {
        requestId,
        resultCount: results.length,
        total,
        durationMs,
      });

      return {
        results,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + results.length < total,
        },
        filters: {
          query: searchQuery,
          chain,
          hasContractAddress,
        },
        meta: { requestId, durationMs },
      };
    });
  } catch (error) {
    logger.error('Config search failed', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
