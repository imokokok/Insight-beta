import pg from "pg";
import { env } from "@/lib/env";

const { Pool } = pg;

const globalForDb = globalThis as unknown as {
  conn: pg.Pool | undefined;
};

function getDbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  // Fallback to Supabase connection string if available, as it is a postgres URL
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    // Note: This is a best-effort guess. Usually Supabase provides a separate DB URL.
    // If users only have REST URL, this won't work.
    // But provision-supabase.mjs used SUPABASE_DB_URL.
    if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  }
  return null;
}

export const db = globalForDb.conn ?? new Pool({
  connectionString: getDbUrl() || undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

if (process.env.NODE_ENV !== "production") globalForDb.conn = db;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function query<T extends pg.QueryResultRow>(text: string, params?: any[]) {
  const client = await db.connect();
  try {
    const res = await client.query<T>(text, params);
    return res;
  } finally {
    client.release();
  }
}

export async function getClient() {
  return db.connect();
}
