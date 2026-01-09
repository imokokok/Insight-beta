import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import * as oracleStore from '@/server/oracleStore';
import type { Assertion } from '@/lib/oracleTypes';

// Mock oracleStore
vi.mock('@/server/oracleStore', () => ({
  listAssertions: vi.fn(),
}));

// Mock oracleIndexer
vi.mock('@/server/oracleIndexer', () => ({
  ensureOracleSynced: vi.fn(),
}));

// Mock apiResponse to just return the data or response
vi.mock('@/server/apiResponse', () => ({
  handleApi: async (fn: () => unknown | Promise<unknown>) => {
    try {
      const data = await fn();
      return { ok: true, data };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return { ok: false, error: message };
    }
  },
}));

describe('GET /api/oracle/assertions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns assertions list', async () => {
    const mockItems: Assertion[] = [
      {
        id: '0x1',
        chain: 'Local',
        asserter: '0xabc',
        protocol: 'Test',
        market: 'Test market',
        assertion: 'test',
        assertedAt: new Date().toISOString(),
        livenessEndsAt: new Date().toISOString(),
        status: 'Pending',
        bondUsd: 1,
        txHash: '0xtx'
      }
    ];
    const listAssertionsMock = vi.mocked(oracleStore.listAssertions);
    listAssertionsMock.mockResolvedValue({
      items: mockItems,
      total: 1,
      nextCursor: null
    });

    const request = new Request('http://localhost:3000/api/oracle/assertions?limit=10');
    type ApiMockResponse<T> = { ok: true; data: T } | { ok: false; error: string };
    const response = (await GET(request)) as unknown as ApiMockResponse<{
      items: Assertion[];
      total: number;
      nextCursor: number | null;
    }>;

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.data.items).toEqual(mockItems);
    }
    expect(oracleStore.listAssertions).toHaveBeenCalledWith(expect.objectContaining({
      limit: 10
    }));
  });

  it('filters by chain', async () => {
    vi.mocked(oracleStore.listAssertions).mockResolvedValue({ items: [], total: 0, nextCursor: null });

    const request = new Request('http://localhost:3000/api/oracle/assertions?chain=Optimism');
    await GET(request);

    expect(oracleStore.listAssertions).toHaveBeenCalledWith(expect.objectContaining({
      chain: 'Optimism'
    }));
  });

  it('handles sync param', async () => {
    const { ensureOracleSynced } = await import('@/server/oracleIndexer');
    vi.mocked(oracleStore.listAssertions).mockResolvedValue({ items: [], total: 0, nextCursor: null });

    const request = new Request('http://localhost:3000/api/oracle/assertions?sync=1');
    await GET(request);

    expect(ensureOracleSynced).toHaveBeenCalled();
  });
});
