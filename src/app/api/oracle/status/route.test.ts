import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { rateLimit, cachedJson } from '@/server/apiResponse';
import { verifyAdmin } from '@/server/adminAuth';
import {
  readOracleConfig,
  readOracleState,
  getSyncState,
  isOracleSyncing,
  redactOracleConfig,
} from '@/server/oracle';

vi.mock('@/server/oracle', () => {
  const config = {
    rpcUrl: 'https://rpc.example',
    contractAddress: '0xabc',
    chain: 'mainnet',
  };
  const state = {
    chain: 'mainnet',
    contractAddress: '0xabc',
    lastProcessedBlock: BigInt(100),
    assertions: { a: {}, b: {} },
    disputes: { c: {} },
    sync: {
      lastAttemptAt: null,
      lastSuccessAt: '2020-01-01T00:00:00.000Z',
      lastDurationMs: 123,
      lastError: null,
    },
  };
  const syncState = {
    latestBlock: BigInt(110),
    safeBlock: BigInt(108),
    lastProcessedBlock: BigInt(100),
    consecutiveFailures: 3,
    rpcActiveUrl: 'https://rpc.active',
    rpcStats: { latencyMs: 10 },
    sync: state.sync,
  };
  return {
    readOracleConfig: vi.fn(async () => config),
    readOracleState: vi.fn(async () => state),
    getSyncState: vi.fn(async () => syncState),
    getOracleEnv: vi.fn(async () => ({
      rpcUrl: config.rpcUrl,
      contractAddress: config.contractAddress,
      chain: config.chain,
    })),
    isOracleSyncing: vi.fn(() => true),
    getOwnerData: vi.fn(async () => ({
      owner: '0xowner',
      isContractOwner: true,
    })),
    redactOracleConfig: vi.fn(() => ({
      rpcUrl: null,
      contractAddress: '0xabc',
      chain: 'mainnet',
    })),
  };
});

vi.mock('@/server/apiResponse', () => ({
  rateLimit: vi.fn(async () => null),
  cachedJson: vi.fn(
    async (_key: string, _ttlMs: number, compute: () => unknown | Promise<unknown>) => {
      return await compute();
    },
  ),
  handleApi: async (_request: Request, fn: () => unknown | Promise<unknown>) => {
    return await fn();
  },
}));

vi.mock('@/server/adminAuth', () => ({
  verifyAdmin: vi.fn(async () => ({ ok: false })),
}));

describe('GET /api/oracle/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns full config and state for admin', async () => {
    const verifyAdminMock = vi.mocked(verifyAdmin);
    const readOracleConfigMock = vi.mocked(readOracleConfig);
    const readOracleStateMock = vi.mocked(readOracleState);
    const getSyncStateMock = vi.mocked(getSyncState);
    const isOracleSyncingMock = vi.mocked(isOracleSyncing);

    verifyAdminMock.mockResolvedValueOnce({
      ok: true,
      role: 'root',
      tokenId: 'test',
    });

    const request = new Request('http://localhost:3000/api/oracle/status');
    const response = (await GET(request)) as unknown as {
      config: unknown;
      state: {
        chain: string;
        contractAddress: string;
        lastProcessedBlock: string;
        latestBlock: string | null;
        safeBlock: string | null;
        lagBlocks: string | null;
        consecutiveFailures: number;
        rpcActiveUrl: string | null;
        rpcStats: unknown;
        assertions: number;
        disputes: number;
        syncing: boolean;
        sync: unknown;
        configError: string | null;
        configErrors: string[];
        owner: string;
        ownerIsContract: boolean;
      };
    };

    expect(rateLimit).toHaveBeenCalledWith(request, {
      key: 'oracle_status_get',
      limit: 240,
      windowMs: 60_000,
    });
    expect(verifyAdmin).toHaveBeenCalledWith(request, {
      strict: false,
      scope: 'oracle_config_write',
    });
    expect(readOracleConfigMock).toHaveBeenCalled();
    expect(readOracleStateMock).toHaveBeenCalled();
    expect(getSyncStateMock).toHaveBeenCalled();
    expect(isOracleSyncingMock).toHaveBeenCalled();

    expect(response.state.chain).toBe('mainnet');
    expect(response.state.contractAddress).toBe('0xabc');
    expect(response.state.lastProcessedBlock).toBe('100');
    expect(response.state.latestBlock).toBe('110');
    expect(response.state.safeBlock).toBe('108');
    expect(response.state.lagBlocks).toBe('10');
    expect(response.state.consecutiveFailures).toBe(3);
    expect(response.state.rpcActiveUrl).toBe('https://rpc.active');
    expect(response.state.rpcStats).toEqual({ latencyMs: 10 });
    expect(response.state.assertions).toBe(2);
    expect(response.state.disputes).toBe(1);
    expect(response.state.syncing).toBe(true);
    expect(response.state.configError).toBe(null);
    expect(response.state.configErrors).toEqual([]);
    expect(response.state.owner).toBe(null);
    expect(response.state.ownerIsContract).toBe(null);
  });

  it('includes config error when lastError is contract_not_found', async () => {
    vi.mocked(verifyAdmin).mockResolvedValueOnce({
      ok: true,
      role: 'root',
      tokenId: 'test',
    });
    vi.mocked(readOracleState).mockResolvedValueOnce({
      chain: 'mainnet',
      contractAddress: '0xabc',
      lastProcessedBlock: BigInt(100),
      assertions: { a: {}, b: {} },
      disputes: { c: {} },
      sync: {
        lastAttemptAt: null,
        lastSuccessAt: '2020-01-01T00:00:00.000Z',
        lastDurationMs: 123,
        lastError: 'contract_not_found',
      },
    } as unknown as Awaited<ReturnType<typeof readOracleState>>);

    const request = new Request('http://localhost:3000/api/oracle/status');
    const response = (await GET(request)) as unknown as {
      state: { configError: string | null; configErrors: string[] };
    };

    expect(response.state.configError).toBe('contract_not_found');
    expect(response.state.configErrors).toEqual(['contract_not_found']);
  });

  it('returns redacted config for non-admin and caches response', async () => {
    const redactOracleConfigMock = vi.mocked(redactOracleConfig);
    const request = new Request('http://localhost:3000/api/oracle/status?foo=bar');
    const response = (await GET(request)) as unknown as {
      config: unknown;
      state: unknown;
    };

    expect(rateLimit).toHaveBeenCalledWith(request, {
      key: 'oracle_status_get',
      limit: 240,
      windowMs: 60_000,
    });
    expect(verifyAdmin).toHaveBeenCalledWith(request, {
      strict: false,
      scope: 'oracle_config_write',
    });
    expect(cachedJson).toHaveBeenCalledWith(
      'oracle_api:/api/oracle/status?foo=bar',
      2_000,
      expect.any(Function),
    );
    expect(redactOracleConfigMock).toHaveBeenCalled();
    expect(response.config).toEqual({
      rpcUrl: null,
      contractAddress: '0xabc',
      chain: 'mainnet',
    });
  });
});
