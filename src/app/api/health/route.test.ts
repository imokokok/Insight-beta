import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AlertRule } from '@/server/observability';
import { GET } from './route';

vi.mock('@/server/apiResponse', () => ({
  rateLimit: vi.fn(async () => null),
  handleApi: async (_request: Request, fn: () => unknown | Promise<unknown>) => {
    return await fn();
  },
  error: (value: unknown, status?: number) => ({
    ok: false as const,
    error: value,
    status: status ?? 500,
  }),
  requireAdmin: vi.fn(async () => null),
}));

const { query, hasDatabase } = vi.hoisted(() => ({
  query: vi.fn(),
  hasDatabase: vi.fn(),
}));
vi.mock('@/server/db', () => ({
  query,
  hasDatabase,
}));

const { readJsonFile } = vi.hoisted(() => ({
  readJsonFile: vi.fn(),
}));
vi.mock('@/server/kvStore', () => ({
  readJsonFile,
}));

vi.mock('@/lib/config/env', () => ({
  env: {
    get INSIGHT_DISABLE_EMBEDDED_WORKER() {
      return (process.env.INSIGHT_DISABLE_EMBEDDED_WORKER ?? '').trim();
    },
    get INSIGHT_DEMO_MODE() {
      return (process.env.INSIGHT_DEMO_MODE ?? '').trim();
    },
    get INSIGHT_SLO_MAX_LAG_BLOCKS() {
      return (process.env.INSIGHT_SLO_MAX_LAG_BLOCKS ?? '').trim();
    },
    get INSIGHT_SLO_MAX_SYNC_STALENESS_MINUTES() {
      return (process.env.INSIGHT_SLO_MAX_SYNC_STALENESS_MINUTES ?? '').trim();
    },
    get INSIGHT_WEBHOOK_URL() {
      return (process.env.INSIGHT_WEBHOOK_URL ?? '').trim();
    },
    get INSIGHT_SMTP_HOST() {
      return (process.env.INSIGHT_SMTP_HOST ?? '').trim();
    },
    get INSIGHT_SMTP_PORT() {
      return (process.env.INSIGHT_SMTP_PORT ?? '').trim();
    },
    get INSIGHT_SMTP_USER() {
      return (process.env.INSIGHT_SMTP_USER ?? '').trim();
    },
    get INSIGHT_SMTP_PASS() {
      return (process.env.INSIGHT_SMTP_PASS ?? '').trim();
    },
    get INSIGHT_FROM_EMAIL() {
      return (process.env.INSIGHT_FROM_EMAIL ?? '').trim();
    },
    get INSIGHT_DEFAULT_EMAIL() {
      return (process.env.INSIGHT_DEFAULT_EMAIL ?? '').trim();
    },
    get INSIGHT_TELEGRAM_BOT_TOKEN() {
      return (process.env.INSIGHT_TELEGRAM_BOT_TOKEN ?? '').trim();
    },
    get INSIGHT_TELEGRAM_CHAT_ID() {
      return (process.env.INSIGHT_TELEGRAM_CHAT_ID ?? '').trim();
    },
  },
  getEnvReport: () => ({ ok: true, issues: [] }),
}));

const { readAlertRules } = vi.hoisted(() => ({
  readAlertRules: vi.fn<() => Promise<AlertRule[]>>(async () => []),
}));
vi.mock('@/server/observability', () => ({
  readAlertRules,
}));

vi.mock('@/server/oracle', () => ({
  listOracleInstances: vi.fn(async () => [
    {
      id: 'default',
      name: 'Default',
      enabled: true,
      chain: 'Local',
      contractAddress: '0xabc',
    },
  ]),
  getOracleEnv: vi.fn(async () => ({
    rpcUrl: 'https://rpc.example',
    contractAddress: '0xabc',
    chain: 'Local',
  })),
  getSyncState: vi.fn(async () => ({
    lastProcessedBlock: 0n,
    latestBlock: 0n,
    safeBlock: 0n,
    lastSuccessProcessedBlock: 0n,
    consecutiveFailures: 0,
    rpcActiveUrl: null,
    rpcStats: null,
    sync: {
      lastAttemptAt: null,
      lastSuccessAt: null,
      lastDurationMs: null,
      lastError: null,
    },
    chain: 'Local',
    contractAddress: '0xabc',
    owner: null,
  })),
}));

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.INSIGHT_DISABLE_EMBEDDED_WORKER;
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns liveness ok', async () => {
    const request = new Request('http://localhost:3000/api/health?probe=liveness');
    const res = (await GET(request)) as unknown as {
      status: string;
      probe: string;
    };
    expect(res.status).toBe('ok');
    expect(res.probe).toBe('liveness');
  });

  it('returns readiness 503 when database disconnected', async () => {
    hasDatabase.mockReturnValue(true);
    query.mockRejectedValueOnce(new Error('db_down'));
    readJsonFile.mockResolvedValueOnce({ at: new Date().toISOString() });

    const request = new Request('http://localhost:3000/api/health?probe=readiness');
    const res = (await GET(request)) as unknown as {
      ok: false;
      error: unknown;
      status: number;
    };
    expect(res.ok).toBe(false);
    expect(res.status).toBe(503);
    expect(res.error).toEqual({ code: 'not_ready' });
  });

  it('returns readiness 503 when worker heartbeat is stale', async () => {
    hasDatabase.mockReturnValue(false);
    const staleAt = new Date(Date.now() - 5 * 60_000).toISOString();
    readJsonFile.mockResolvedValueOnce({ at: staleAt });

    const request = new Request('http://localhost:3000/api/health?probe=readiness');
    const res = (await GET(request)) as unknown as {
      ok: false;
      error: unknown;
      status: number;
    };
    expect(res.ok).toBe(false);
    expect(res.status).toBe(503);
    expect(res.error).toEqual({ code: 'not_ready' });
  });

  it('returns readiness ok when worker is disabled', async () => {
    process.env.INSIGHT_DISABLE_EMBEDDED_WORKER = 'true';
    hasDatabase.mockReturnValue(false);

    const request = new Request('http://localhost:3000/api/health?probe=readiness');
    const res = (await GET(request)) as unknown as {
      status: string;
      probe: string;
    };
    expect(res.status).toBe('ok');
    expect(res.probe).toBe('readiness');
  });

  it('returns readiness 503 when SLO breached in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('INSIGHT_SLO_MAX_LAG_BLOCKS', '1');
    hasDatabase.mockReturnValue(false);
    readJsonFile.mockResolvedValueOnce({ at: new Date().toISOString() });
    const { getSyncState } = await import('@/server/oracle');
    vi.mocked(getSyncState).mockResolvedValueOnce({
      lastProcessedBlock: 0n,
      latestBlock: 10n,
      safeBlock: 0n,
      lastSuccessProcessedBlock: 0n,
      consecutiveFailures: 0,
      rpcActiveUrl: null,
      rpcStats: null,
      sync: {
        lastAttemptAt: null,
        lastSuccessAt: null,
        lastDurationMs: null,
        lastError: null,
      },
      chain: 'Local',
      contractAddress: '0xabc',
      owner: null,
    });

    const request = new Request('http://localhost:3000/api/health?probe=readiness');
    const res = (await GET(request)) as unknown as {
      ok: false;
      error: unknown;
      status: number;
    };
    expect(res.ok).toBe(false);
    expect(res.status).toBe(503);
    expect(res.error).toEqual({ code: 'not_ready' });
  });

  it('returns validation degraded when database disconnected', async () => {
    hasDatabase.mockReturnValue(true);
    query.mockRejectedValueOnce(new Error('db_down'));
    readJsonFile.mockResolvedValueOnce({ at: new Date().toISOString() });

    const request = new Request('http://localhost:3000/api/health?probe=validation');
    const res = (await GET(request)) as unknown as {
      status: string;
      probe: string;
      issues: string[];
      database: string;
    };
    expect(res.status).toBe('degraded');
    expect(res.probe).toBe('validation');
    expect(res.issues).toContain('database_disconnected');
    expect(res.database).toBe('disconnected');
  });

  it('returns validation degraded when demo mode enabled in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('INSIGHT_DEMO_MODE', 'true');
    hasDatabase.mockReturnValue(false);
    readJsonFile.mockResolvedValueOnce({ at: new Date().toISOString() });

    const request = new Request('http://localhost:3000/api/health?probe=validation');
    const res = (await GET(request)) as unknown as {
      status: string;
      probe: string;
      issues: string[];
    };
    expect(res.status).toBe('degraded');
    expect(res.probe).toBe('validation');
    expect(res.issues).toContain('demo_mode_enabled');
  });

  it('returns validation degraded when alert channels missing in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    hasDatabase.mockReturnValue(false);
    readJsonFile.mockResolvedValueOnce({ at: new Date().toISOString() });
    readAlertRules.mockResolvedValueOnce([
      {
        id: 'sync_error',
        name: 'Sync Error',
        enabled: true,
        event: 'sync_error',
        severity: 'critical',
        channels: ['webhook', 'email', 'telegram'],
        recipient: 'ops@example.com',
      },
    ]);

    const request = new Request('http://localhost:3000/api/health?probe=validation');
    const res = (await GET(request)) as unknown as {
      status: string;
      issues: string[];
    };
    expect(res.status).toBe('degraded');
    expect(res.issues).toContain('INSIGHT_WEBHOOK_URL: required_for_webhook_alerts');
    expect(res.issues).toContain('INSIGHT_SMTP: required_for_email_alerts');
    expect(res.issues).toContain('INSIGHT_TELEGRAM: required_for_telegram_alerts');
  });
});
