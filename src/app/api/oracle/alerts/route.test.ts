import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZodError } from 'zod';
import { GET } from './route';
import { rateLimit, cachedJson, requireAdmin } from '@/server/apiResponse';
import * as observability from '@/server/observability';

vi.mock('@/server/observability', () => ({
  listAlerts: vi.fn(),
}));

vi.mock('@/server/oracle', () => ({
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
    try {
      const fn =
        typeof arg1 === 'function'
          ? (arg1 as () => unknown | Promise<unknown>)
          : (arg2 as () => unknown | Promise<unknown>);
      const data = await fn();
      return { ok: true, data };
    } catch (e: unknown) {
      if (e instanceof ZodError) return { ok: false, error: 'invalid_request_body' };
      const message = e instanceof Error ? e.message : String(e);
      return { ok: false, error: message };
    }
  },
}));

describe('GET /api/oracle/alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns alerts list', async () => {
    const listAlertsMock = vi.mocked(observability.listAlerts);
    listAlertsMock.mockResolvedValue({ items: [], total: 0, nextCursor: null });

    const request = new Request(
      'http://localhost:3000/api/oracle/alerts?status=Open&severity=warning&limit=10',
    );
    type ApiMockResponse<T> = { ok: true; data: T } | { ok: false; error: string };
    const response = (await GET(request)) as unknown as ApiMockResponse<{
      items: unknown[];
      total: number;
      nextCursor: number | null;
    }>;

    expect(response.ok).toBe(true);
    expect(observability.listAlerts).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'Open',
        severity: 'warning',
        limit: 10,
      }),
    );
    expect(rateLimit).toHaveBeenCalledWith(request, {
      key: 'alerts_get',
      limit: 120,
      windowMs: 60_000,
    });
    expect(cachedJson).toHaveBeenCalledWith(
      'oracle_api:/api/oracle/alerts?status=Open&severity=warning&limit=10',
      10_000,
      expect.any(Function),
    );
  });

  it('handles sync param', async () => {
    const { ensureOracleSynced } = await import('@/server/oracle');
    vi.mocked(observability.listAlerts).mockResolvedValue({
      items: [],
      total: 0,
      nextCursor: null,
    });

    const request = new Request('http://localhost:3000/api/oracle/alerts?sync=1', {
      headers: { 'x-admin-token': 'test' },
    });
    await GET(request);

    expect(ensureOracleSynced).toHaveBeenCalled();
    expect(requireAdmin).toHaveBeenCalledWith(request, {
      strict: true,
      scope: 'oracle_sync_trigger',
    });
  });

  it('rejects invalid query params', async () => {
    const badReq = new Request('http://localhost:3000/api/oracle/alerts?status=Unknown&limit=-1');
    const response = (await GET(badReq)) as { ok: boolean; error?: unknown };
    expect(response.ok).toBe(false);
    expect(response.error).toBe('invalid_request_body');
  });
});
