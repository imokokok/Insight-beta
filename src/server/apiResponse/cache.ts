import {
  deleteJsonKey,
  listJsonKeys,
  readJsonFile,
  writeJsonFile,
} from "@/server/kvStore";

type ApiCacheRecord<T> = { expiresAtMs: number; value: T };

const globalForApiCache = globalThis as unknown as {
  insightApiCache?: Map<string, ApiCacheRecord<unknown>> | undefined;
};

const insightApiCache =
  globalForApiCache.insightApiCache ??
  new Map<string, ApiCacheRecord<unknown>>();
if (process.env.NODE_ENV !== "production")
  globalForApiCache.insightApiCache = insightApiCache;

export async function cachedJson<T>(
  key: string,
  ttlMs: number,
  compute: () => Promise<T> | T,
): Promise<T> {
  const now = Date.now();
  const mem = insightApiCache.get(key);
  if (mem && mem.expiresAtMs > now) return mem.value as T;

  const storeKey = `api_cache/v1/${key}`;
  let stored: ApiCacheRecord<T> | null = null;
  try {
    stored = await readJsonFile<ApiCacheRecord<T> | null>(storeKey, null);
  } catch {
    stored = null;
  }
  if (
    stored &&
    typeof stored === "object" &&
    typeof (stored as ApiCacheRecord<unknown>).expiresAtMs === "number" &&
    (stored as ApiCacheRecord<unknown>).expiresAtMs > now
  ) {
    insightApiCache.set(key, stored as ApiCacheRecord<unknown>);
    return (stored as ApiCacheRecord<T>).value;
  }

  const value = await compute();
  const record: ApiCacheRecord<T> = { expiresAtMs: now + ttlMs, value };
  insightApiCache.set(key, record as ApiCacheRecord<unknown>);
  await writeJsonFile(storeKey, record).catch(() => null);
  return value;
}

export async function invalidateCachedJson(prefix: string) {
  if (!prefix) {
    insightApiCache.clear();
  } else {
    for (const key of insightApiCache.keys()) {
      if (key.startsWith(prefix)) insightApiCache.delete(key);
    }
  }

  const storePrefix = `api_cache/v1/${prefix}`;
  for (;;) {
    const page = await listJsonKeys({
      prefix: storePrefix,
      limit: 1000,
      offset: 0,
    }).catch(() => null);
    const items = page?.items ?? [];
    if (items.length === 0) break;
    await Promise.all(items.map((i) => deleteJsonKey(i.key).catch(() => null)));
    if (items.length < 1000) break;
  }
}
