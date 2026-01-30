import pg from 'pg';
import { env } from '@/lib/config/env';
import crypto from 'node:crypto';
import { logger } from '@/lib/logger';
import { DATABASE_CONFIG } from '@/lib/config/constants';

const { Pool } = pg;

const globalForDb = globalThis as unknown as {
  conn: pg.Pool | undefined;
};

type DbAlertRule = {
  id: string;
  enabled: boolean;
  event: string;
  severity: 'info' | 'warning' | 'critical';
  silencedUntil?: string | null;
  params?: Record<string, unknown>;
  channels?: Array<'webhook' | 'email' | 'telegram'>;
  recipient?: string | null;
};

const globalForDbAlerts = globalThis as unknown as {
  insightDbAlertRulesCache?: { loadedAtMs: number; rules: DbAlertRule[] } | null | undefined;
  insightDbAlertRulesInflight?: Promise<DbAlertRule[]> | null | undefined;
  insightDbAlertCooldown?: Map<string, number> | undefined;
  insightDbAlertDepth?: number | undefined;
};

const dbAlertCooldown = globalForDbAlerts.insightDbAlertCooldown ?? new Map<string, number>();
if (process.env.NODE_ENV !== 'production') {
  globalForDbAlerts.insightDbAlertCooldown = dbAlertCooldown;
}

async function withDbAlertDepth<T>(fn: () => Promise<T>): Promise<T> {
  const depth = globalForDbAlerts.insightDbAlertDepth ?? 0;
  globalForDbAlerts.insightDbAlertDepth = depth + 1;
  try {
    return await fn();
  } finally {
    globalForDbAlerts.insightDbAlertDepth = depth;
  }
}

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

export function getDatabaseUrl() {
  return getDbUrl();
}

export function hasDatabase() {
  return Boolean(getDbUrl());
}

const poolConfig = {
  connectionString: getDbUrl() || undefined,
  max: Math.max(
    10,
    Math.min(100, Number(process.env.INSIGHT_DB_POOL_SIZE) || DATABASE_CONFIG.DEFAULT_POOL_SIZE),
  ),
  min: Math.max(2, Math.min(10, Number(process.env.INSIGHT_DB_MIN_POOL) || 5)),
  idleTimeoutMillis: Math.max(
    10000,
    Number(process.env.INSIGHT_DB_IDLE_TIMEOUT) || DATABASE_CONFIG.DEFAULT_IDLE_TIMEOUT,
  ),
  connectionTimeoutMillis: Math.max(
    DATABASE_CONFIG.DEFAULT_CONNECTION_TIMEOUT,
    Number(process.env.INSIGHT_DB_CONNECTION_TIMEOUT) || 10000,
  ),
  // Add acquire timeout to prevent indefinite waiting for connections
  acquireTimeoutMillis: Math.max(5000, Number(process.env.INSIGHT_DB_ACQUIRE_TIMEOUT) || 10000),
  maxUses: Math.max(
    1000,
    Number(process.env.INSIGHT_DB_MAX_USES) || DATABASE_CONFIG.DEFAULT_MAX_USES,
  ),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
  statement_timeout: Math.max(5000, Number(process.env.INSIGHT_DB_STATEMENT_TIMEOUT) || 30000),
  // Performance optimizations
  query_timeout: Math.max(5000, Number(process.env.INSIGHT_DB_QUERY_TIMEOUT) || 30000),
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  // Application name for monitoring
  application_name: `insight-${process.env.NODE_ENV || 'development'}`,
  // Enable prepared statements caching
  preparedStatements: true,
};

export const db = globalForDb.conn ?? new Pool(poolConfig);

if (process.env.NODE_ENV !== 'production') globalForDb.conn = db;

interface DatabaseError extends Error {
  message: string;
  code?: string;
  stack?: string;
}

interface PoolClient {
  on(event: string, listener: (...args: unknown[]) => void): void;
}

if (typeof (db as unknown as { on?: unknown }).on === 'function') {
  (db as unknown as PoolClient).on('error', (err: unknown) => {
    const errorObj = err instanceof Error ? (err as DatabaseError) : { message: String(err) };
    logger.error('Unexpected database pool error', {
      error: errorObj.message,
      code: (errorObj as DatabaseError).code,
    });
  });
  (db as unknown as PoolClient).on('connect', () => {
    logger.debug('New database connection established');
  });
}

export async function query<T extends pg.QueryResultRow>(
  text: string,
  params?: (string | number | boolean | Date | null | undefined | string[] | number[])[],
) {
  if (!getDbUrl()) {
    throw new Error('missing_database_url');
  }
  const startedAt = Date.now();
  try {
    const client = await Promise.race([
      db.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('database_connection_timeout')), 5000),
      ),
    ]);
    try {
      const res = await client.query<T>(text, params);
      const durationMs = Date.now() - startedAt;
      if ((globalForDbAlerts.insightDbAlertDepth ?? 0) <= 0 && durationMs >= 5) {
        void maybeAlertDatabaseSlowQuery({ text, durationMs }).catch(() => void 0);
      }
      return res;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'database_connection_timeout') {
      throw new Error('database_connection_timeout');
    }
    throw error;
  }
}

export async function getClient() {
  if (!getDbUrl()) {
    throw new Error('missing_database_url');
  }
  return db.connect();
}

function getAlertCooldownKey(event: string, fingerprint: string) {
  return `${event}:${fingerprint}`;
}

async function getAlertRulesCached(): Promise<DbAlertRule[]> {
  const now = Date.now();
  const cached = globalForDbAlerts.insightDbAlertRulesCache;
  if (cached && now - cached.loadedAtMs < 5_000) return cached.rules;
  if (globalForDbAlerts.insightDbAlertRulesInflight)
    return globalForDbAlerts.insightDbAlertRulesInflight;

  const p = withDbAlertDepth(() => import('@/server/observability').then((m) => m.readAlertRules()))
    .then((rules) => {
      globalForDbAlerts.insightDbAlertRulesCache = { loadedAtMs: now, rules };
      return rules;
    })
    .catch(() => {
      globalForDbAlerts.insightDbAlertRulesCache = {
        loadedAtMs: now,
        rules: [],
      };
      return [];
    })
    .finally(() => {
      globalForDbAlerts.insightDbAlertRulesInflight = null;
    });

  globalForDbAlerts.insightDbAlertRulesInflight = p;
  return p;
}

function toQueryFingerprint(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const hash = crypto.createHash('sha1').update(normalized).digest('hex');
  return hash.slice(0, 16);
}

function extractOperation(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const first = normalized.split(' ', 1)[0] || 'QUERY';
  return first.toUpperCase();
}

function extractTable(text: string): string | null {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const from = /\bfrom\s+([a-zA-Z0-9_."']+)/i.exec(normalized)?.[1];
  if (from) return from.replace(/['"]/g, '');
  const into = /\binto\s+([a-zA-Z0-9_."']+)/i.exec(normalized)?.[1];
  if (into) return into.replace(/['"]/g, '');
  const update = /\bupdate\s+([a-zA-Z0-9_."']+)/i.exec(normalized)?.[1];
  if (update) return update.replace(/['"]/g, '');
  return null;
}

async function createAlertIfNeeded(
  rule: DbAlertRule,
  fingerprint: string,
  title: string,
  message: string,
  entityId: string | null,
) {
  const now = Date.now();
  const cooldownKey = getAlertCooldownKey(rule.event, fingerprint);
  const lastAt = dbAlertCooldown.get(cooldownKey) ?? 0;
  if (now - lastAt < 30_000) return;
  dbAlertCooldown.set(cooldownKey, now);

  const silencedUntilRaw = (rule.silencedUntil ?? '').trim();
  const silencedUntilMs = silencedUntilRaw ? Date.parse(silencedUntilRaw) : NaN;
  const silenced = Number.isFinite(silencedUntilMs) && silencedUntilMs > now;

  const depth = globalForDbAlerts.insightDbAlertDepth ?? 0;
  globalForDbAlerts.insightDbAlertDepth = depth + 1;
  try {
    const { createOrTouchAlert } = await import('@/server/observability');
    await createOrTouchAlert({
      fingerprint,
      type: rule.event,
      severity: rule.severity,
      title,
      message,
      entityType: 'db',
      entityId,
      notify: silenced
        ? { channels: [] }
        : {
            channels: rule.channels,
            recipient: rule.recipient ?? undefined,
          },
    });
  } finally {
    globalForDbAlerts.insightDbAlertDepth = depth;
  }
}

async function maybeAlertDatabaseSlowQuery(input: { text: string; durationMs: number }) {
  const rules = await getAlertRulesCached();
  const slowRules = rules.filter((r) => r.enabled && r.event === 'database_slow_query');
  if (slowRules.length === 0) return;

  const op = extractOperation(input.text);
  const table = extractTable(input.text);
  const fingerprintHash = toQueryFingerprint(input.text);

  for (const rule of slowRules) {
    const thresholdMs = Number(
      (rule.params as { thresholdMs?: unknown } | undefined)?.thresholdMs ?? 200,
    );

    if (!Number.isFinite(thresholdMs) || thresholdMs <= 0) continue;
    if (input.durationMs < thresholdMs) continue;

    const fingerprint = `${rule.id}:${fingerprintHash}`;
    logger.warn('db_slow_query', {
      op,
      table,
      fingerprint: fingerprintHash,
      durationMs: input.durationMs,
      thresholdMs,
    });
    const message = `${op}${table ? ` ${table}` : ''} took ${input.durationMs}ms (threshold ${thresholdMs}ms)`;

    await createAlertIfNeeded(rule, fingerprint, 'Database slow query', message, table ?? op);
  }
}
