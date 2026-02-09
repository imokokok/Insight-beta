import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import * as oracle from '@/server/oracle';
import { requireAdmin, error } from '@/server/apiResponse';
import type { Dispute } from '@/lib/types/oracleTypes';

vi.mock('@/server/oracle', () => ({
  listDisputes: vi.fn(),
  ensureOracleSynced: vi.fn(),
}));

vi.mock('@/server/apiResponse', () => ({
  rateLimit: vi.fn(() => null),
  cachedJson: vi.fn(
    async (_key: string, _ttlMs: number, compute: () => unknown | Promise<unknown>) => {
      return await compute();
    },
  ),
  getAdminActor: vi.fn(() => 'test'),
  requireAdmin: vi.fn(async (request: Request) => {
    const token = request.headers.get('x-admin-token')?.trim() ?? '';
    return token ? null : {};
  }),
  handleApi: async (arg1: unknown, arg2?: unknown) => {
    const fn =
      typeof arg1 === 'function'
        ? (arg1 as () => unknown | Promise<unknown>)
        : (arg2 as () => unknown | Promise<unknown>);
    const result = await fn();
    // If result is a Response (error case), parse it
    if (result instanceof Response) {
      const body = await result.json();
      return { ok: body.success, error: body.error?.code || body.error };
    }
    return { ok: true, data: result };
  },
  error: (message: string) => ({
    ok: false as const,
    error: message,
  }),
}));

describe('GET /api/oracle/disputes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns disputes list', async () => {
    const mockItems: Dispute[] = [
      {
        id: '0x1',
        chain: 'Local',
        assertionId: '0xassertion',
        market: 'Test market',
        disputeReason: 'reason',
        disputer: '0x0000000000000000000000000000000000000001',
        disputedAt: new Date().toISOString(),
        votingEndsAt: new Date().toISOString(),
        status: 'Voting',
        currentVotesFor: 0,
        currentVotesAgainst: 0,
        totalVotes: 0,
      },
    ];

    const listDisputesMock = vi.mocked(oracle.listDisputes);
    listDisputesMock.mockResolvedValue({
      items: mockItems,
      total: 1,
      nextCursor: null,
    });

    const request = new Request('http://localhost:3000/api/oracle/disputes?limit=10');
    type ApiMockResponse<T> = { ok: true; data: T } | { ok: false; error: string };
    const response = (await GET(request)) as unknown as ApiMockResponse<{
      items: Dispute[];
      total: number;
      nextCursor: number | null;
    }>;

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.data.items).toEqual(mockItems);
    }
    expect(oracle.listDisputes).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10,
      }),
    );
  });

  it('rejects invalid disputer address', async () => {
    const request = new Request(
      'http://localhost:3000/api/oracle/disputes?disputer=not_an_address',
    );
    type ApiMockResponse = { ok: true; data: unknown } | { ok: false; error: string };
    const response = (await GET(request)) as unknown as ApiMockResponse;

    expect(response.ok).toBe(false);
    if (!response.ok) {
      // The route returns 'invalid_request_params' with details containing 'invalid_address'
      expect(response.error).toBe('invalid_request_params');
    }
    expect(oracle.listDisputes).not.toHaveBeenCalled();
  });

  it('triggers sync when authorized', async () => {
    const request = new Request('http://localhost:3000/api/oracle/disputes?sync=1', {
      headers: { 'x-admin-token': 'valid_token' },
    });

    // Mock listDisputes to return empty list
    vi.mocked(oracle.listDisputes).mockResolvedValue({
      items: [],
      total: 0,
      nextCursor: null,
    });

    type ApiMockResponse = { ok: true; data: unknown } | { ok: false; error: string };
    const response = (await GET(request)) as unknown as ApiMockResponse;

    expect(response.ok).toBe(true);
    expect(oracle.ensureOracleSynced).toHaveBeenCalled();
  });

  it('requires admin for sync', async () => {
    // Mock requireAdmin to return error when no token
    vi.mocked(requireAdmin).mockResolvedValueOnce(error('unauthorized', 403));

    const request = new Request('http://localhost:3000/api/oracle/disputes?sync=1');
    // handleApi mock wraps the return value in { ok: true, data: ... }
    const response = (await GET(request)) as unknown as {
      ok: true;
      data: { ok: false; error: string };
    };

    expect(response.ok).toBe(true);
    expect(response.data).toEqual({ ok: false, error: 'unauthorized' });
    expect(oracle.ensureOracleSynced).not.toHaveBeenCalled();
  });

  it('passes filters to listDisputes', async () => {
    const request = new Request(
      'http://localhost:3000/api/oracle/disputes?status=Voting&chain=Arbitrum',
    );

    vi.mocked(oracle.listDisputes).mockResolvedValue({
      items: [],
      total: 0,
      nextCursor: null,
    });

    await GET(request);

    expect(oracle.listDisputes).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'Voting',
        chain: 'Arbitrum',
      }),
    );
  });
});
