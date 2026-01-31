import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PoolClient } from 'pg';

const { hasDatabase, getClient } = vi.hoisted(() => ({
  hasDatabase: vi.fn<() => boolean>(),
  getClient: vi.fn(),
}));

const { logger } = vi.hoisted(() => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/config/env', () => ({
  env: {
    INSIGHT_WORKER_ID: 'test-worker',
    INSIGHT_DISABLE_EMBEDDED_WORKER: 'true',
  },
}));

vi.mock('@/lib/logger', () => ({ logger }));

vi.mock('./oracleIndexer', () => ({
  ensureOracleSynced: vi.fn(async () => ({ updated: false, state: {} })),
  getOracleEnv: vi.fn(async () => ({ rpcUrl: '', contractAddress: '' })),
  isOracleSyncing: vi.fn(() => false),
}));

vi.mock('@/server/db', () => ({
  hasDatabase,
  getClient,
  query: vi.fn(),
}));

vi.mock('@/server/observability', () => ({
  createOrTouchAlert: vi.fn(),
  pruneStaleAlerts: vi.fn(async () => ({ resolved: 0 })),
  readAlertRules: vi.fn(async () => []),
}));

vi.mock('@/server/oracle', () => ({
  getSyncState: vi.fn(async () => ({
    lastProcessedBlock: 0n,
    latestBlock: null,
    safeBlock: null,
    lastSuccessProcessedBlock: null,
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
    contractAddress: null,
    owner: null,
  })),
  listOracleInstances: vi.fn(async () => [
    {
      id: 'default',
      name: 'Default',
      enabled: true,
      chain: 'Local',
      contractAddress: '',
    },
  ]),
  readOracleState: vi.fn(async () => ({})),
}));

vi.mock('@/server/kvStore', () => ({
  writeJsonFile: vi.fn(async () => void 0),
}));

vi.mock('@/server/oracle/priceFetcher', () => ({
  fetchCurrentPrice: vi.fn(),
}));

vi.mock('viem', () => ({
  createPublicClient: vi.fn(),
  http: vi.fn(),
  formatEther: vi.fn(),
  parseAbi: vi.fn(() => []),
}));

import { tickWorkerOnce, tryAcquireWorkerLock } from './worker';

describe('worker advisory lock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.oracleMonitorWorkerLockClient = undefined;
    global.oracleMonitorWorkerLockKey = undefined;
  });

  it('returns true when database is disabled', async () => {
    hasDatabase.mockReturnValue(false);
    const ok = await tryAcquireWorkerLock();
    expect(ok).toBe(true);
    expect(getClient).not.toHaveBeenCalled();
  });

  it('returns true when lock client already exists', async () => {
    hasDatabase.mockReturnValue(true);
    global.oracleMonitorWorkerLockClient = {
      query: vi.fn(),
      release: vi.fn(),
    } as unknown as PoolClient;
    const ok = await tryAcquireWorkerLock();
    expect(ok).toBe(true);
    expect(getClient).not.toHaveBeenCalled();
  });

  it('returns false and releases client when lock not acquired', async () => {
    hasDatabase.mockReturnValue(true);
    const client = {
      query: vi.fn(async () => ({ rows: [{ ok: false }] })),
      release: vi.fn(),
    };
    getClient.mockResolvedValue(client);

    const ok = await tryAcquireWorkerLock();
    expect(ok).toBe(false);
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(global.oracleMonitorWorkerLockClient).toBeUndefined();
    expect(global.oracleMonitorWorkerLockKey).toBeUndefined();
  });

  it('returns false and releases client when query throws', async () => {
    hasDatabase.mockReturnValue(true);
    const client = {
      query: vi.fn(async () => {
        throw new Error('db_down');
      }),
      release: vi.fn(),
    };
    getClient.mockResolvedValue(client);

    const ok = await tryAcquireWorkerLock();
    expect(ok).toBe(false);
    expect(logger.error).toHaveBeenCalledWith('Failed to acquire worker lock', expect.any(Object));
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(global.oracleMonitorWorkerLockClient).toBeUndefined();
  });

  it('stores lock client and key when acquired', async () => {
    hasDatabase.mockReturnValue(true);
    const client = {
      query: vi.fn(async () => ({ rows: [{ ok: true }] })),
      release: vi.fn(),
    };
    getClient.mockResolvedValue(client);

    const ok = await tryAcquireWorkerLock();
    expect(ok).toBe(true);
    expect(global.oracleMonitorWorkerLockClient).toBe(client as unknown as PoolClient);
    expect(global.oracleMonitorWorkerLockKey).toMatch(/^\d+$/);
    expect(client.release).not.toHaveBeenCalled();
  });
});

describe('worker alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.oracleMonitorWorkerTickInProgress = undefined;
    global.oracleMonitorWorkerLastError = undefined;
  });

  it('emits sync_error missing_config when oracle config is missing', async () => {
    hasDatabase.mockReturnValue(false);

    const { readAlertRules, createOrTouchAlert } = await import('@/server/observability');
    (readAlertRules as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'rule-1',
        enabled: true,
        event: 'sync_error',
        severity: 'critical',
        channels: ['webhook'],
        recipient: null,
      },
    ]);

    const { getOracleEnv } = await import('./oracleIndexer');
    (getOracleEnv as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      rpcUrl: '',
      contractAddress: '',
    });

    await tickWorkerOnce();

    expect(createOrTouchAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'sync_error',
        title: 'Oracle sync error',
        message: 'missing_config',
      }),
    );
  });

  it('attempts recovery when sync is stale during backoff', async () => {
    hasDatabase.mockReturnValue(false);
    const now = new Date();
    const lastAttemptAt = now.toISOString();
    const lastSuccessAt = new Date(now.getTime() - 10_000).toISOString();

    const { readAlertRules } = await import('@/server/observability');
    (readAlertRules as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'rule-1',
        enabled: true,
        event: 'stale_sync',
        severity: 'warning',
        channels: ['webhook'],
        recipient: null,
        params: { maxAgeMs: 1000 },
      },
    ]);

    const { getOracleEnv, ensureOracleSynced } = await import('./oracleIndexer');
    (getOracleEnv as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      rpcUrl: 'https://rpc.example',
      contractAddress: '0x1111111111111111111111111111111111111111',
    });

    const { getSyncState } = await import('@/server/oracle');
    const state = {
      lastProcessedBlock: 100n,
      latestBlock: 120n,
      safeBlock: 118n,
      lastSuccessProcessedBlock: 100n,
      consecutiveFailures: 3,
      rpcActiveUrl: 'https://rpc.example',
      rpcStats: null,
      sync: {
        lastAttemptAt,
        lastSuccessAt,
        lastDurationMs: 1000,
        lastError: 'rpc_unreachable',
      },
      chain: 'Local',
      contractAddress: '0x1111111111111111111111111111111111111111',
      owner: null,
    };
    (getSyncState as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(state)
      .mockResolvedValueOnce(state);

    await tickWorkerOnce();

    expect(ensureOracleSynced).toHaveBeenCalledTimes(1);
  });
});
