import crypto from 'crypto';
import { deleteJsonKey, listJsonKeys, readJsonFile, writeJsonFile } from '@/server/kvStore';
import { logger } from '@/lib/logger';

type ApiCacheRecord<T> = { expiresAtMs: number; value: T };

const globalForApiCache = globalThis as unknown as {
  insightApiCache?: Map<string, ApiCacheRecord<unknown>> | undefined;
};

const insightApiCache =
  globalForApiCache.insightApiCache ?? new Map<string, ApiCacheRecord<unknown>>();
if (process.env.NODE_ENV !== 'production') globalForApiCache.insightApiCache = insightApiCache;

const SENSITIVE_PARAM_PATTERNS = [
  /token/i,
  /key/i,
  /secret/i,
  /password/i,
  /auth/i,
  /credential/i,
  /signature/i,
  /nonce/i,
  /api_/i,
  /access_/i,
];

function isSensitiveParam(paramName: string): boolean {
  return SENSITIVE_PARAM_PATTERNS.some((pattern) => pattern.test(paramName));
}

export function createSafeCacheKey(pathname: string, searchParams: URLSearchParams): string {
  const filteredParams: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    if (!isSensitiveParam(key)) {
      filteredParams[key] = value;
    }
  }
  const sortedParams = Object.keys(filteredParams)
    .sort()
    .map((key) => `${key}=${filteredParams[key]}`)
    .join('&');
  const paramHash = crypto
    .createHash('sha256')
    .update(sortedParams)
    .digest('hex')
    .slice(0, 16);
  return `api:${pathname}:${paramHash}`;
}

export async function cachedJson<T>(
  key: string,
  ttlMs: number,
  compute: () => Promise<T> | T,
): Promise<T> {
  const now = Date.now();
  const mem = insightApiCache.get(key);
  if (mem && mem.expiresAtMs > now) return mem.value as T;

  const storeKey = `api_cache/v1/${key}`;
  let stored: unknown = null;
  try {
    stored = await readJsonFile<unknown>(storeKey, null);
  } catch {
    stored = null;
  }

  if (isValidCacheRecord(stored, now)) {
    insightApiCache.set(key, stored);
    return stored.value as T;
  }

  const value = await compute();
  const record: ApiCacheRecord<T> = { expiresAtMs: now + ttlMs, value };
  insightApiCache.set(key, record as ApiCacheRecord<unknown>);
  try {
    await writeJsonFile(storeKey, record);
  } catch (writeError) {
    logger.warn('Failed to write API cache to persistent storage', {
      key: storeKey,
      error: writeError instanceof Error ? writeError.message : String(writeError),
    });
  }
  return value;
}

function isValidCacheRecord(value: unknown, now: number): value is ApiCacheRecord<unknown> {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (typeof record.expiresAtMs !== 'number') return false;
  if (record.expiresAtMs <= now) return false;
  return true;
}

export async function invalidateCachedJson(prefix: string): Promise<{ memoryDeleted: number; diskDeleted: number }> {
  let memoryDeleted = 0;
  if (!prefix) {
    memoryDeleted = insightApiCache.size;
    insightApiCache.clear();
  } else {
    for (const key of insightApiCache.keys()) {
      if (key.startsWith(prefix)) {
        insightApiCache.delete(key);
        memoryDeleted++;
      }
    }
  }

  let diskDeleted = 0;
  const storePrefix = `api_cache/v1/${prefix}`;
  for (;;) {
    let page;
    try {
      page = await listJsonKeys({
        prefix: storePrefix,
        limit: 1000,
        offset: 0,
      });
    } catch (listError) {
      logger.warn('Failed to list cache keys for invalidation', {
        prefix: storePrefix,
        error: listError instanceof Error ? listError.message : String(listError),
      });
      break;
    }
    const items = page?.items ?? [];
    if (items.length === 0) break;

    const deleteResults = await Promise.allSettled(
      items.map((i) => deleteJsonKey(i.key)),
    );
    diskDeleted += deleteResults.filter((r) => r.status === 'fulfilled').length;

    for (const result of deleteResults) {
      if (result.status === 'rejected') {
        logger.warn('Failed to delete cache key', {
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        });
      }
    }

    if (items.length < 1000) break;
  }

  return { memoryDeleted, diskDeleted };
}
