import { getMemoryStore, memoryNowIso } from '@/server/memoryBackend';

import { hasDatabase, query } from './db';

const MEMORY_MAX_KV_KEYS = 2000;

const SANITIZE_KEY_REGEX = /[^a-zA-Z0-9_\-/.]/g;

function sanitizePrefixForLike(prefix: string): string {
  return prefix.replace(SANITIZE_KEY_REGEX, '').replace(/%/g, '').replace(/_/g, '');
}

export async function readJsonFile<T>(key: string, defaultValue: T): Promise<T> {
  if (!hasDatabase()) {
    const mem = getMemoryStore();
    const item = mem.kv.get(key);
    if (!item) return defaultValue;
    return item.value as T;
  }
  const result = await query('SELECT value FROM kv_store WHERE key = $1', [key]);
  if (result.rows.length === 0) return defaultValue;
  const firstRow = result.rows[0];
  return firstRow?.value as T;
}

export async function writeJsonFile<T>(key: string, value: T): Promise<void> {
  if (!hasDatabase()) {
    const mem = getMemoryStore();
    mem.kv.set(key, { value, updatedAt: memoryNowIso() });
    const overflow = mem.kv.size - MEMORY_MAX_KV_KEYS;
    if (overflow > 0) {
      const candidates = Array.from(mem.kv.entries()).map(([k, v]) => ({
        key: k,
        updatedAtMs: new Date(v.updatedAt).getTime(),
      }));
      candidates.sort((a, b) => a.updatedAtMs - b.updatedAtMs);
      for (let i = 0; i < overflow; i++) {
        const k = candidates[i]?.key;
        if (k) mem.kv.delete(k);
      }
    }
    return;
  }
  await query(
    `INSERT INTO kv_store (key, value, updated_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP)
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
    [key, JSON.stringify(value)],
  );
}

export async function deleteJsonKey(key: string): Promise<void> {
  if (!hasDatabase()) {
    const mem = getMemoryStore();
    mem.kv.delete(key);
    return;
  }
  await query('DELETE FROM kv_store WHERE key = $1', [key]);
}

export async function listJsonKeys({
  prefix,
  limit,
  offset,
}: {
  prefix?: string;
  limit?: number;
  offset?: number;
}) {
  if (!hasDatabase()) {
    const mem = getMemoryStore();
    const keys = Array.from(mem.kv.keys()).sort((a, b) => a.localeCompare(b));
    const filtered = prefix ? keys.filter((k) => k.startsWith(prefix)) : keys;
    const start = Math.max(0, offset ?? 0);
    const end = limit ? start + limit : filtered.length;
    const slice = filtered.slice(start, end);
    return {
      items: slice.map((key) => {
        const item = mem.kv.get(key);
        if (!item) throw new Error(`Key ${key} not found in memory store`);
        return { key, value: item.value, updatedAt: item.updatedAt };
      }),
      total: filtered.length,
    };
  }
  let sql = 'SELECT key, value, updated_at FROM kv_store';
  const params: Array<string | number> = [];
  const conditions: string[] = [];

  if (prefix) {
    const sanitizedPrefix = sanitizePrefixForLike(prefix);
    conditions.push(`key LIKE $${params.length + 1}`);
    params.push(`${sanitizedPrefix}%`);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY key ASC';

  if (limit) {
    sql += ` LIMIT $${params.length + 1}`;
    params.push(limit);
  }

  if (offset) {
    sql += ` OFFSET $${params.length + 1}`;
    params.push(offset);
  }

  const result = await query(sql, params);
  return {
    items: result.rows.map((row) => ({
      key: row.key,
      value: row.value,
      updatedAt: row.updated_at,
    })),
    total: result.rowCount || 0, // Approximate for now
  };
}
