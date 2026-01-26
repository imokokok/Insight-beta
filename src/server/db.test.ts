import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';

const client = {
  query: vi.fn(),
  release: vi.fn(),
};

async function waitFor(
  condition: () => boolean,
  opts?: { timeoutMs?: number; intervalMs?: number },
) {
  const timeoutMs = opts?.timeoutMs ?? 200;
  const intervalMs = opts?.intervalMs ?? 1;
  const startedAt = Date.now();
  while (true) {
    if (condition()) return;
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('waitFor_timeout');
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

vi.mock('pg', () => {
  class Pool {
    connect = vi.fn(async () => client);
    constructor() {}
  }
  return { default: { Pool }, Pool };
});

vi.mock('@/lib/config/env', () => ({
  env: {
    SUPABASE_URL: '',
    SUPABASE_SERVICE_ROLE_KEY: '',
  },
}));

vi.mock('@/lib/logger', () => ({
  withLogContext: vi.fn((_: unknown, fn: () => unknown) => fn()),
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const readAlertRules = vi.fn();
const createOrTouchAlert = vi.fn();

vi.mock('@/server/observability', () => ({
  readAlertRules,
  createOrTouchAlert,
}));

import { query } from '@/server/db';

describe('db query slow query alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgres://localhost/test';
    const g = globalThis as unknown as {
      insightDbAlertRulesCache?: unknown;
      insightDbAlertRulesInflight?: unknown;
      insightDbAlertCooldown?: Map<string, number>;
      insightDbAlertDepth?: number;
    };
    g.insightDbAlertRulesCache = null;
    g.insightDbAlertRulesInflight = null;
    g.insightDbAlertDepth = 0;
    g.insightDbAlertCooldown?.clear();
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
  });

  it('emits alert when duration exceeds rule threshold', async () => {
    readAlertRules.mockResolvedValue([
      {
        id: 'database_slow_query',
        enabled: true,
        event: 'database_slow_query',
        severity: 'warning',
        params: { thresholdMs: 200 },
        channels: [],
      },
    ]);

    let now = 60_000;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => now);

    client.query.mockImplementationOnce(async () => {
      now = 60_300;
      return { rows: [{ ok: 1 }], rowCount: 1 };
    });

    const sql = 'SELECT * FROM users WHERE id = $1';
    const res = await query(sql, ['1']);
    expect(res.rows[0]?.ok).toBe(1);

    await waitFor(() => vi.mocked(createOrTouchAlert).mock.calls.length > 0);

    const normalized = sql.replace(/\s+/g, ' ').trim();
    const hash = crypto.createHash('sha1').update(normalized).digest('hex').slice(0, 16);
    expect(createOrTouchAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'database_slow_query',
        severity: 'warning',
        title: 'Database slow query',
        fingerprint: `database_slow_query:${hash}`,
      }),
    );

    nowSpy.mockRestore();
  });

  it('does not emit alert when duration is below threshold', async () => {
    readAlertRules.mockResolvedValue([
      {
        id: 'database_slow_query',
        enabled: true,
        event: 'database_slow_query',
        severity: 'warning',
        params: { thresholdMs: 200 },
        channels: [],
      },
    ]);

    let now = 60_000;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => now);

    client.query.mockImplementationOnce(async () => {
      now = 60_120;
      return { rows: [{ ok: 1 }], rowCount: 1 };
    });

    await query('SELECT 1 as ok');
    await new Promise((r) => setTimeout(r, 10));

    expect(createOrTouchAlert).not.toHaveBeenCalled();
    nowSpy.mockRestore();
  });
});
