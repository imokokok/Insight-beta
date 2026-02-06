import crypto from 'node:crypto';

import { ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { maskInLog, redactSensitiveData } from '@/lib/security/encryption';
import { verifyAdmin } from '@/server/adminAuth';
import {
  getAdminActor,
  handleApi,
  invalidateCachedJson,
  rateLimit,
  requireAdmin,
} from '@/server/apiResponse';
import { cachedJson, createSafeCacheKey } from '@/server/apiResponse/cache';
import { appendAuditLog } from '@/server/observability';
import {
  readOracleConfig,
  redactOracleConfig,
  validateOracleConfigPatch,
  writeOracleConfig,
  getConfigEncryptionStatus,
  type OracleConfig,
} from '@/server/oracle';
import { generateRequestId } from '@/server/performance';

const ALLOWED_FIELDS: ReadonlyArray<keyof OracleConfig> = [
  'rpcUrl',
  'contractAddress',
  'chain',
  'startBlock',
  'maxBlockRange',
  'votingPeriodHours',
  'confirmationBlocks',
];

const SENSITIVE_FIELDS = ['rpcUrl', 'adminToken'];

const RATE_LIMITS = {
  GET: { key: 'oracle_config_get', limit: 240, windowMs: 60_000 },
  PUT: { key: 'oracle_config_put', limit: 30, windowMs: 60_000 },
} as const;

const CACHE_TTL_MS = 5 * 60 * 1000;

// 操作超时配置
const OPERATION_TIMEOUT_MS = 5000;

interface RequestContext {
  requestId: string;
  instanceId?: string;
  startTime: number;
  isAdmin: boolean;
}

function extractInstanceId(url: URL): string | undefined {
  return url.searchParams.get('instanceId') ?? undefined;
}

/**
 * 创建哈希缓存键，防止长参数导致键过长
 * 同时包含权限标识以防止信息泄露
 */
function createCacheKey(instanceId: string | undefined, isAdmin: boolean): string {
  const params = new URLSearchParams();
  if (instanceId) params.set('instanceId', instanceId);
  // 关键：添加权限标识到缓存键，防止信息泄露
  params.set('_role', isAdmin ? 'admin' : 'user');

  const baseKey = createSafeCacheKey('/api/oracle/config', params);

  // 对长键进行哈希处理
  if (baseKey.length > 128) {
    const hash = crypto.createHash('sha256').update(baseKey).digest('hex').slice(0, 32);
    return `oracle:config:${hash}`;
  }

  return baseKey;
}

/**
 * 带超时的 Promise 包装器
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Operation '${operation}' timed out after ${timeoutMs}ms`)),
        timeoutMs,
      ),
    ),
  ]);
}

function logConfigOperation(
  operation: 'fetch' | 'update',
  context: RequestContext,
  metadata?: Record<string, unknown>,
): void {
  const durationMs = Date.now() - context.startTime;
  const baseLog = {
    requestId: context.requestId,
    instanceId: context.instanceId,
    durationMs,
    isAdmin: context.isAdmin,
  };

  // Mask sensitive data in logs
  const safeMetadata = metadata ? redactSensitiveData(metadata, SENSITIVE_FIELDS) : undefined;

  if (operation === 'fetch') {
    logger.debug('Oracle config fetched', { ...baseLog, ...safeMetadata });
  } else {
    logger.info('Oracle config updated', { ...baseLog, ...safeMetadata });
  }
}

function logConfigError(
  operation: 'fetch' | 'update',
  context: RequestContext,
  error: unknown,
  request?: Request,
): void {
  const durationMs = Date.now() - context.startTime;
  const errorInfo =
    error instanceof Error
      ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        }
      : { message: 'Unknown error', raw: String(error) };

  logger.error(`Oracle config ${operation.toUpperCase()} failed`, {
    requestId: context.requestId,
    instanceId: context.instanceId,
    durationMs,
    isAdmin: context.isAdmin,
    ...errorInfo,
    userAgent: request?.headers.get('user-agent'),
    url: request?.url,
  });
}

async function getConfigWithFallback(
  instanceId: string | undefined,
  isAdmin: boolean,
  context: RequestContext,
): Promise<OracleConfig> {
  const cacheKey = createCacheKey(instanceId, isAdmin);

  try {
    return await cachedJson<OracleConfig>(cacheKey, CACHE_TTL_MS, async () => {
      return instanceId ? await readOracleConfig(instanceId) : await readOracleConfig();
    });
  } catch (cacheError) {
    logger.warn('Cache read failed, falling back to direct DB read', {
      requestId: context.requestId,
      instanceId,
      isAdmin,
      error: cacheError instanceof Error ? cacheError.message : 'Unknown error',
    });

    return instanceId ? await readOracleConfig(instanceId) : await readOracleConfig();
  }
}

export async function GET(request: Request) {
  const context: RequestContext = {
    requestId: generateRequestId(),
    startTime: Date.now(),
    isAdmin: false,
  };

  try {
    return await handleApi(request, async () => {
      const limited = await rateLimit(request, RATE_LIMITS.GET);
      if (limited) return limited;

      const url = new URL(request.url);
      context.instanceId = extractInstanceId(url);

      // 先检查权限，确定缓存键
      const admin = await verifyAdmin(request, { strict: false, scope: 'oracle_config_write' });
      context.isAdmin = admin.ok;

      const config = await getConfigWithFallback(context.instanceId, context.isAdmin, context);
      const result = context.isAdmin ? config : redactOracleConfig(config);

      logConfigOperation('fetch', context, { cacheHit: true });
      return result;
    });
  } catch (error) {
    logConfigError('fetch', context, error, request);
    throw error;
  }
}

function validateRequestBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Request body must be a non-null object', {
      code: 'INVALID_REQUEST_BODY',
      details: { message: 'Request body must be a non-null object' },
    });
  }
  return body as Record<string, unknown>;
}

function extractAllowedFields(body: Record<string, unknown>): Partial<OracleConfig> {
  const safeBody = Object.fromEntries(
    ALLOWED_FIELDS.filter((field) => field in body).map((field) => [field, body[field]]),
  );

  if (Object.keys(safeBody).length === 0) {
    throw new ValidationError('No valid configuration fields provided', {
      code: 'NO_VALID_FIELDS',
      details: { message: 'No valid configuration fields provided', allowedFields: ALLOWED_FIELDS },
    });
  }

  return safeBody as Partial<OracleConfig>;
}

interface ConfigChangeDetails {
  instanceId?: string;
  fieldsUpdated: string[];
  previousValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  masked: boolean;
}

async function handleConfigUpdate(
  request: Request,
  context: RequestContext,
): Promise<OracleConfig> {
  const body = validateRequestBody(await request.json());
  const patch = validateOracleConfigPatch(extractAllowedFields(body));

  // Read previous config for audit
  const previousConfig = await readOracleConfig(context.instanceId);

  const updated = await writeOracleConfig(patch, context.instanceId);

  // Prepare audit details with masked sensitive data
  const fieldsUpdated = Object.keys(patch);
  const previousValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};

  for (const field of fieldsUpdated) {
    const key = field as keyof OracleConfig;
    previousValues[key] = previousConfig[key];
    newValues[key] = updated[key];
  }

  const auditDetails: ConfigChangeDetails = {
    instanceId: context.instanceId,
    fieldsUpdated,
    previousValues: redactSensitiveData(previousValues, SENSITIVE_FIELDS),
    newValues: redactSensitiveData(newValues, SENSITIVE_FIELDS),
    masked: true,
  };

  // 并行执行审计日志和缓存失效，带超时控制
  const auditPromise = withTimeout(
    appendAuditLog({
      actor: getAdminActor(request),
      action: 'oracle_config_updated',
      entityType: 'oracle',
      entityId: updated.contractAddress || null,
      details: auditDetails,
    }),
    OPERATION_TIMEOUT_MS,
    'audit_log',
  ).catch((error) => {
    logger.warn('Audit log operation timed out or failed', {
      requestId: context.requestId,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  // 精确失效缓存，避免误删，带超时控制
  const cacheInvalidationPromise = withTimeout(
    invalidateCachedJson(createCacheKey(context.instanceId, true)),
    OPERATION_TIMEOUT_MS,
    'cache_invalidation_admin',
  ).catch((error) => {
    logger.warn('Cache invalidation failed for admin cache', {
      requestId: context.requestId,
      instanceId: context.instanceId,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  // 同时失效用户缓存，带超时控制
  const userCacheInvalidationPromise = withTimeout(
    invalidateCachedJson(createCacheKey(context.instanceId, false)),
    OPERATION_TIMEOUT_MS,
    'cache_invalidation_user',
  ).catch((error) => {
    logger.warn('Cache invalidation failed for user cache', {
      requestId: context.requestId,
      instanceId: context.instanceId,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  await Promise.all([auditPromise, cacheInvalidationPromise, userCacheInvalidationPromise]);

  logConfigOperation('update', context, {
    fieldsUpdated,
    contractAddress: maskInLog(updated.contractAddress),
  });
  return updated;
}

export async function PUT(request: Request) {
  const context: RequestContext = {
    requestId: generateRequestId(),
    startTime: Date.now(),
    isAdmin: false,
  };

  try {
    return await handleApi(request, async () => {
      const limited = await rateLimit(request, RATE_LIMITS.PUT);
      if (limited) return limited;

      const auth = await requireAdmin(request, { strict: true, scope: 'oracle_config_write' });
      if (auth) return auth;

      context.isAdmin = true;

      const url = new URL(request.url);
      context.instanceId = extractInstanceId(url);

      try {
        return await handleConfigUpdate(request, context);
      } catch (updateError) {
        logConfigError('update', context, updateError, request);

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
    logConfigError('update', context, error, request);
    throw error;
  }
}

// Health check endpoint for config
export async function HEAD(request: Request) {
  return await handleApi(request, async () => {
    const limited = await rateLimit(request, RATE_LIMITS.GET);
    if (limited) return limited;

    const encryptionStatus = await getConfigEncryptionStatus();

    return {
      ok: true,
      encryption: encryptionStatus,
      timestamp: new Date().toISOString(),
    };
  });
}
