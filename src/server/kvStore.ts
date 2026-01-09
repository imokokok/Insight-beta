import { query } from "./db";

export async function readJsonFile<T>(key: string, defaultValue: T): Promise<T> {
  const result = await query("SELECT value FROM kv_store WHERE key = $1", [key]);
  if (result.rows.length === 0) return defaultValue;
  return result.rows[0].value as T;
}

export async function writeJsonFile<T>(key: string, value: T): Promise<void> {
  await query(
    `INSERT INTO kv_store (key, value, updated_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP)
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
    [key, JSON.stringify(value)]
  );
}

export async function deleteJsonKey(key: string): Promise<void> {
  await query("DELETE FROM kv_store WHERE key = $1", [key]);
}

export async function listJsonKeys({ prefix, limit, offset }: { prefix?: string; limit?: number; offset?: number }) {
  let sql = "SELECT key, value, updated_at FROM kv_store";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any[] = [];
  const conditions: string[] = [];

  if (prefix) {
    conditions.push(`key LIKE $${params.length + 1}`);
    params.push(`${prefix}%`);
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  sql += " ORDER BY key ASC";

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
    items: result.rows.map(row => ({
      key: row.key,
      value: row.value,
      updatedAt: row.updated_at
    })),
    total: result.rowCount || 0 // Approximate for now
  };
}
