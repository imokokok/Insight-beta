import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT } from './route';
import { verifyAdmin } from '@/server/adminAuth';
import {
  readOracleConfig,
  writeOracleConfig,
  validateOracleConfigPatch,
  redactOracleConfig,
  type OracleConfig,
} from '@/server/oracle';

// Mock all dependencies
vi.mock('@/server/oracle', () => {
  const config: OracleConfig = {
    rpcUrl: 'https://rpc.example',
    contractAddress: '0xabc',
    chain: 'Local',
    startBlock: 0,
    maxBlockRange: 10000,
    votingPeriodHours: 72,
    confirmationBlocks: 12,
  };
  return {
    readOracleConfig: vi.fn(async () => config),
    writeOracleConfig: vi.fn(async (_patch: Partial<OracleConfig>) => ({
      ...config,
      ..._patch,
    })),
    validateOracleConfigPatch: vi.fn((next: Partial<OracleConfig>) => next),
    redactOracleConfig: vi.fn(() => ({
      ...config,
      rpcUrl: '',
    })),
    getConfigEncryptionStatus: vi.fn(async () => ({
      enabled: false,
      keyLength: 0,
      canEncrypt: false,
      canDecrypt: false,
    })),
  };
});

vi.mock('@/server/observability', () => ({
  appendAuditLog: vi.fn(async () => {}),
}));

vi.mock('@/server/apiResponse', async () => {
  const actual =
    await vi.importActual<typeof import('@/server/apiResponse')>('@/server/apiResponse');
  return {
    ...actual,
    rateLimit: vi.fn(async () => null),
    requireAdmin: vi.fn(async () => null),
    getAdminActor: vi.fn(() => 'test-actor'),
    invalidateCachedJson: vi.fn(async () => {}),
    handleApi: async (_request: Request, fn: () => unknown | Promise<unknown>) => {
      try {
        return await fn();
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'unknown_error';
        // Handle JSON parse errors
        if (msg.includes('Unexpected token')) {
          return {
            ok: false,
            error: { code: 'invalid_request_body', details: { message: 'Failed to parse JSON' } },
          };
        }
        // Handle ValidationError from @/lib/errors - message contains the actual error message
        // The metadata is stored in error.metadata, not error.details
        if (msg === 'Request body must be a non-null object') {
          const metadata = (error as Error & { metadata?: Record<string, unknown> }).metadata;
          return {
            ok: false,
            error: {
              code: 'invalid_request_body',
              details: metadata?.details || { message: 'Request body must be a non-null object' },
            },
          };
        }
        if (msg === 'No valid configuration fields provided') {
          const metadata = (error as Error & { metadata?: Record<string, unknown> }).metadata;
          return {
            ok: false,
            error: {
              code: 'no_valid_fields',
              details: metadata?.details || { message: 'No valid configuration fields provided' },
            },
          };
        }
        if (msg === 'invalid_body' || msg === 'invalid_request_body') {
          const details = (error as Error & { details?: Record<string, unknown> }).details;
          return details
            ? { ok: false, error: { code: 'invalid_request_body', details } }
            : { ok: false, error: { code: 'invalid_request_body' } };
        }
        if (msg === 'forbidden') {
          return { ok: false, error: { code: 'forbidden' } };
        }
        if (msg === 'no_valid_fields') {
          const details = (error as Error & { details?: Record<string, unknown> }).details;
          return details
            ? { ok: false, error: { code: 'no_valid_fields', details } }
            : { ok: false, error: { code: 'no_valid_fields' } };
        }
        if (msg === 'invalid_rpc_url') {
          const field = (error as Error & { field?: string }).field;
          return field
            ? { ok: false, error: { code: 'invalid_rpc_url', details: { field } } }
            : { ok: false, error: { code: 'invalid_rpc_url' } };
        }
        return { ok: false, error: { code: msg || 'unknown_error' } };
      }
    },
  };
});

vi.mock('@/server/adminAuth', () => ({
  verifyAdmin: vi.fn(async () => ({ ok: false })),
}));

// Import mocked modules after vi.mock
import { rateLimit, requireAdmin, getAdminActor, invalidateCachedJson } from '@/server/apiResponse';
import { appendAuditLog } from '@/server/observability';

describe('GET /api/oracle/config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns full config for admin', async () => {
    vi.mocked(verifyAdmin).mockResolvedValueOnce({
      ok: true,
      role: 'root',
      tokenId: 'test',
    });

    const request = new Request('http://localhost:3000/api/oracle/config');
    const response = (await GET(request)) as unknown as OracleConfig;

    expect(rateLimit).toHaveBeenCalledWith(request, {
      key: 'oracle_config_get',
      limit: 240,
      windowMs: 60_000,
    });
    expect(verifyAdmin).toHaveBeenCalledWith(request, {
      strict: false,
      scope: 'oracle_config_write',
    });
    expect(readOracleConfig).toHaveBeenCalled();
    expect(response.rpcUrl).toBe('https://rpc.example');
  });

  it('passes instanceId through when provided', async () => {
    vi.mocked(verifyAdmin).mockResolvedValueOnce({
      ok: true,
      role: 'root',
      tokenId: 'test',
    });

    const request = new Request('http://localhost:3000/api/oracle/config?instanceId=foo');
    await GET(request);

    expect(readOracleConfig).toHaveBeenCalledWith('foo');
  });

  it('returns redacted config for non-admin', async () => {
    const request = new Request('http://localhost:3000/api/oracle/config');
    const response = (await GET(request)) as unknown as OracleConfig;

    expect(rateLimit).toHaveBeenCalledWith(request, {
      key: 'oracle_config_get',
      limit: 240,
      windowMs: 60_000,
    });
    expect(verifyAdmin).toHaveBeenCalledWith(request, {
      strict: false,
      scope: 'oracle_config_write',
    });
    expect(redactOracleConfig).toHaveBeenCalled();
    expect(response.rpcUrl).toBe('');
  });

  it('returns rate limited when GET is over limit', async () => {
    const request = new Request('http://localhost:3000/api/oracle/config');
    vi.mocked(rateLimit).mockResolvedValueOnce({
      ok: false,
      error: { code: 'rate_limited' },
    } as unknown as Awaited<ReturnType<typeof rateLimit>>);

    const response = (await GET(request)) as { ok: boolean; error?: unknown };
    expect(response.ok).toBe(false);
    expect(response.error).toEqual({ code: 'rate_limited' });
  });
});

describe('PUT /api/oracle/config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates config when authorized', async () => {
    const configPatch: Partial<OracleConfig> = {
      rpcUrl: 'https://new-rpc',
      maxBlockRange: 20000,
    };
    const request = new Request('http://localhost:3000/api/oracle/config', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(configPatch),
    });

    const response = (await PUT(request)) as unknown as OracleConfig;

    expect(rateLimit).toHaveBeenCalledWith(request, {
      key: 'oracle_config_put',
      limit: 30,
      windowMs: 60_000,
    });
    expect(requireAdmin).toHaveBeenCalledWith(request, {
      strict: true,
      scope: 'oracle_config_write',
    });
    expect(validateOracleConfigPatch).toHaveBeenCalledWith(configPatch);
    expect(writeOracleConfig).toHaveBeenCalledWith(configPatch, undefined);
    expect(getAdminActor).toHaveBeenCalledWith(request);
    expect(appendAuditLog).toHaveBeenCalledWith({
      actor: 'test-actor',
      action: 'oracle_config_updated',
      entityType: 'oracle',
      entityId: '0xabc',
      details: expect.objectContaining({
        fieldsUpdated: ['rpcUrl', 'maxBlockRange'],
        previousValues: expect.any(Object),
        newValues: expect.any(Object),
        masked: true,
      }),
    });
    expect(invalidateCachedJson).toHaveBeenCalledTimes(2);
    expect(response.contractAddress).toBe('0xabc');
  });

  it('passes instanceId through when provided', async () => {
    const configPatch: Partial<OracleConfig> = {
      rpcUrl: 'https://new-rpc',
    };
    const request = new Request('http://localhost:3000/api/oracle/config?instanceId=foo', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(configPatch),
    });

    await PUT(request);

    expect(writeOracleConfig).toHaveBeenCalledWith(configPatch, 'foo');
  });

  it('rejects malformed json body', async () => {
    const request = new Request('http://localhost:3000/api/oracle/config', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: 'not-json',
    });

    const response = (await PUT(request)) as { ok: boolean; error?: unknown };
    expect(response.ok).toBe(false);
    expect(response.error).toEqual({
      code: 'invalid_request_body',
      details: { message: 'Failed to parse JSON' },
    });
  });

  it('rejects non-object body', async () => {
    const request = new Request('http://localhost:3000/api/oracle/config', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(['not', 'object']),
    });

    const response = (await PUT(request)) as { ok: boolean; error?: unknown };
    expect(response.ok).toBe(false);
    expect(response.error).toEqual({
      code: 'invalid_request_body',
      details: { message: 'Request body must be a non-null object' },
    });
  });

  it('rejects empty object body (no valid fields)', async () => {
    const request = new Request('http://localhost:3000/api/oracle/config', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ unknownField: 'value' }),
    });

    const response = (await PUT(request)) as { ok: boolean; error?: unknown };
    expect(response.ok).toBe(false);
    expect(response.error).toMatchObject({
      code: 'no_valid_fields',
      details: {
        message: 'No valid configuration fields provided',
        allowedFields: expect.any(Array),
      },
    });
  });

  it('returns rate limited when PUT is over limit', async () => {
    const request = new Request('http://localhost:3000/api/oracle/config', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    vi.mocked(rateLimit).mockResolvedValueOnce({
      ok: false,
      error: { code: 'rate_limited' },
    } as unknown as Awaited<ReturnType<typeof rateLimit>>);

    const response = (await PUT(request)) as { ok: boolean; error?: unknown };
    expect(response.ok).toBe(false);
    expect(response.error).toEqual({ code: 'rate_limited' });
  });

  it('returns error when not authorized', async () => {
    const request = new Request('http://localhost:3000/api/oracle/config', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    vi.mocked(requireAdmin).mockResolvedValueOnce({
      ok: false,
      error: { code: 'forbidden' },
    } as unknown as Awaited<ReturnType<typeof requireAdmin>>);

    const response = (await PUT(request)) as { ok: boolean; error?: unknown };
    expect(response.ok).toBe(false);
    expect(response.error).toEqual({ code: 'forbidden' });
  });

  it('returns field-specific validation error', async () => {
    const request = new Request('http://localhost:3000/api/oracle/config', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rpcUrl: 'bad' }),
    });

    vi.mocked(validateOracleConfigPatch).mockImplementationOnce(() => {
      const err = Object.assign(new Error('invalid_rpc_url'), {
        field: 'rpcUrl',
      });
      throw err;
    });

    const response = (await PUT(request)) as { ok: boolean; error?: unknown };
    expect(response.ok).toBe(false);
    expect(response.error).toEqual({
      code: 'invalid_rpc_url',
      details: { field: 'rpcUrl' },
    });
  });

  it('returns generic validation error when no field is present', async () => {
    const request = new Request('http://localhost:3000/api/oracle/config', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rpcUrl: 'bad' }),
    });

    vi.mocked(validateOracleConfigPatch).mockImplementationOnce(() => {
      throw new Error('invalid_rpc_url');
    });

    const response = (await PUT(request)) as { ok: boolean; error?: unknown };
    expect(response.ok).toBe(false);
    expect(response.error).toEqual({ code: 'invalid_rpc_url' });
  });

  it('filters out non-allowed fields', async () => {
    const configPatch = {
      rpcUrl: 'https://new-rpc',
      maxBlockRange: 20000,
      adminToken: 'should-be-filtered',
      unknownField: 'should-be-filtered',
    };

    const request = new Request('http://localhost:3000/api/oracle/config', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(configPatch),
    });

    await PUT(request);

    expect(validateOracleConfigPatch).toHaveBeenCalledWith({
      rpcUrl: 'https://new-rpc',
      maxBlockRange: 20000,
    });
  });
});
