import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { cachedJson, rateLimit } from '@/server/apiResponse';
import { verifyAdmin } from '@/server/adminAuth';
import type { OracleConfig } from '@/server/oracle';

vi.mock('@/server/oracle', () => {
  const config: OracleConfig = {
    rpcUrl: 'https://secret-rpc.example',
    contractAddress: '0xabc',
    chain: 'Local',
    startBlock: 0,
    maxBlockRange: 10_000,
    votingPeriodHours: 72,
    confirmationBlocks: 12,
  };
  return {
    getAssertion: vi.fn(async () => ({ id: 'a' })),
    getDisputeByAssertionId: vi.fn(async () => ({ id: 'd' })),
    readOracleConfig: vi.fn(async () => config),
    redactOracleConfig: vi.fn((c: OracleConfig) => ({ ...c, rpcUrl: '' })),
    getOracleEnv: vi.fn(async () => ({
      rpcUrl: 'https://rpc.example',
      contractAddress: '0xabc',
    })),
    getBondData: vi.fn(async () => ({ bondWei: '1', bondEth: '0.1' })),
  };
});

vi.mock('@/server/adminAuth', () => ({
  verifyAdmin: vi.fn(async () => ({ ok: false })),
}));

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
  error: (value: unknown, status?: number) => ({
    ok: false as const,
    error: value,
    status,
  }),
}));

describe('GET /api/oracle/assertions/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('caches only redacted response for non-admin', async () => {
    const req = new Request('http://localhost:3000/api/oracle/assertions/a');
    const response = (await GET(req, {
      params: Promise.resolve({ id: 'a' }),
    })) as unknown as { config: { rpcUrl: string } };

    expect(verifyAdmin).toHaveBeenCalled();
    expect(rateLimit).toHaveBeenCalledWith(req, {
      key: 'assertion_detail_get',
      limit: 120,
      windowMs: 60_000,
    });
    expect(cachedJson).toHaveBeenCalledWith(
      'oracle_api:/api/oracle/assertions/a',
      5_000,
      expect.any(Function),
    );
    expect(response.config.rpcUrl).toBe('');
  });

  it('does not cache full response for admin', async () => {
    vi.mocked(verifyAdmin).mockResolvedValueOnce({
      ok: true,
      role: 'root',
      tokenId: 't',
    });
    const req = new Request('http://localhost:3000/api/oracle/assertions/a');
    const response = (await GET(req, {
      params: Promise.resolve({ id: 'a' }),
    })) as unknown as { config: { rpcUrl: string } };

    expect(cachedJson).not.toHaveBeenCalled();
    expect(response.config.rpcUrl).toBe('https://secret-rpc.example');
  });
});
