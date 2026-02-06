import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import * as oracle from '@/server/oracle';
import type { Assertion } from '@/lib/types/oracleTypes';

vi.mock('@/server/oracle', () => ({
  listAssertions: vi.fn(),
  ensureOracleSynced: vi.fn(),
}));

// Mock rateLimit to allow requests
vi.mock('@/server/apiResponse/rateLimit', () => ({
  rateLimit: vi.fn(() => null),
}));

// Mock admin check
vi.mock('@/server/apiResponse/admin', () => ({
  requireAdmin: vi.fn(() => null),
}));

// Mock cron auth
vi.mock('@/server/cronAuth', () => ({
  isCronAuthorized: vi.fn(() => false),
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
        txHash: '0xtx',
      },
    ];
    const listAssertionsMock = vi.mocked(oracle.listAssertions);
    listAssertionsMock.mockResolvedValue({
      items: mockItems,
      total: 1,
      nextCursor: null,
    });

    const request = new Request('http://localhost:3000/api/oracle/assertions?limit=10');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.data.items).toEqual(mockItems);
    expect(oracle.listAssertions).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10,
      }),
      undefined,
    );
  });

  it('filters by chain', async () => {
    vi.mocked(oracle.listAssertions).mockResolvedValue({
      items: [],
      total: 0,
      nextCursor: null,
    });

    const request = new Request('http://localhost:3000/api/oracle/assertions?chain=Optimism');
    await GET(request);

    expect(oracle.listAssertions).toHaveBeenCalledWith(
      expect.objectContaining({
        chain: 'Optimism',
      }),
      undefined,
    );
  });

  it('handles sync param', async () => {
    const { ensureOracleSynced } = await import('@/server/oracle');
    vi.mocked(oracle.listAssertions).mockResolvedValue({
      items: [],
      total: 0,
      nextCursor: null,
    });

    const request = new Request('http://localhost:3000/api/oracle/assertions?sync=1', {
      headers: { 'x-admin-token': 'test' },
    });
    await GET(request);

    expect(ensureOracleSynced).toHaveBeenCalled();
  });

  it('rejects invalid asserter address', async () => {
    const request = new Request(
      'http://localhost:3000/api/oracle/assertions?asserter=not_an_address',
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(oracle.listAssertions).not.toHaveBeenCalled();
  });
});
