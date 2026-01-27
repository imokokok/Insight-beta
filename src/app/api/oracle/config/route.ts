import {
  readOracleConfig,
  redactOracleConfig,
  validateOracleConfigPatch,
  writeOracleConfig,
  type OracleConfig,
} from '@/server/oracle';
import {
  getAdminActor,
  handleApi,
  invalidateCachedJson,
  rateLimit,
  requireAdmin,
} from '@/server/apiResponse';
import { appendAuditLog } from '@/server/observability';
import { verifyAdmin } from '@/server/adminAuth';
import { cachedJson, createSafeCacheKey } from '@/server/apiResponse/cache';
import { generateRequestId } from '@/server/performance';
import { logger } from '@/lib/logger';

const ALLOWED_FIELDS: Array<keyof OracleConfig> = [
  'rpcUrl',
  'contractAddress',
  'chain',
  'startBlock',
  'maxBlockRange',
  'votingPeriodHours',
  'confirmationBlocks',
];

const RATE_LIMITS = {
  GET: { key: 'oracle_config_get', limit: 240, windowMs: 60_000 },
  PUT: { key: 'oracle_config_put', limit: 30, windowMs: 60_000 },
} as const;

const CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET(request: Request) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    return await handleApi(request, async () => {
      const limited = await rateLimit(request, RATE_LIMITS.GET);
      if (limited) return limited;

      const url = new URL(request.url);
      const instanceId = url.searchParams.get('instanceId') ?? undefined;

      const cacheKey = createSafeCacheKey('/api/oracle/config', url.searchParams);

      try {
        const config = await cachedJson<OracleConfig>(cacheKey, CACHE_TTL_MS, async () => {
          const result = instanceId ? await readOracleConfig(instanceId) : await readOracleConfig();
          return result;
        });

        const admin = await verifyAdmin(request, { strict: false, scope: 'oracle_config_write' });
        const result = admin.ok ? config : redactOracleConfig(config);

        const durationMs = Date.now() - startTime;
        logger.debug('Oracle config fetched', {
          requestId,
          instanceId,
          cacheHit: true,
          durationMs,
        });

        return result;
      } catch (cacheError) {
        logger.warn('Cache read failed, falling back to direct DB read', {
          requestId,
          instanceId,
          error: cacheError instanceof Error ? cacheError.message : 'Unknown error',
        });
        const config = instanceId ? await readOracleConfig(instanceId) : await readOracleConfig();

        const admin = await verifyAdmin(request, { strict: false, scope: 'oracle_config_write' });
        return admin.ok ? config : redactOracleConfig(config);
      }
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('Oracle config GET failed', {
      requestId,
      durationMs,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function PUT(request: Request) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    return await handleApi(request, async () => {
      const limited = await rateLimit(request, RATE_LIMITS.PUT);
      if (limited) return limited;

      const auth = await requireAdmin(request, { strict: true, scope: 'oracle_config_write' });
      if (auth) return auth;

      const url = new URL(request.url);
      const instanceId = url.searchParams.get('instanceId') ?? undefined;

      try {
        const body = await request.json();
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          throw Object.assign(new Error('invalid_request_body'), { status: 400 });
        }

        const safeBody = Object.fromEntries(
          ALLOWED_FIELDS.filter((f) => f in body).map((f) => [f, body[f]]),
        ) as Partial<OracleConfig>;

        const patch = validateOracleConfigPatch(safeBody);

        if (Object.keys(patch).length === 0) {
          throw Object.assign(new Error('no_valid_fields'), { status: 400 });
        }

        const updated = await writeOracleConfig(patch, instanceId ?? undefined);

        await Promise.all([
          appendAuditLog({
            actor: getAdminActor(request),
            action: 'oracle_config_updated',
            entityType: 'oracle',
            entityId: updated.contractAddress || null,
            details: patch,
          }),
          invalidateCachedJson('oracle_api:/api/oracle').catch(() => {}),
        ]);

        const durationMs = Date.now() - startTime;
        logger.info('Oracle config updated', {
          requestId,
          instanceId,
          fieldsUpdated: Object.keys(patch),
          durationMs,
        });

        return updated;
      } catch (updateError) {
        const durationMs = Date.now() - startTime;
        logger.error('Oracle config update failed', {
          requestId,
          durationMs,
          error: updateError instanceof Error ? updateError.message : 'Unknown error',
        });
        if (updateError instanceof SyntaxError) {
          throw Object.assign(new Error('invalid_request_body'), {
            status: 400,
            details: { message: 'Failed to parse JSON' },
          });
        }
        throw updateError;
      }
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('Oracle config PUT failed', {
      requestId,
      durationMs,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
