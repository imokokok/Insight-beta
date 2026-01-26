import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';

vi.mock('@/server/kvStore', () => ({
  readJsonFile: vi.fn(),
  writeJsonFile: vi.fn(),
}));

function hashToken(token: string, salt: string) {
  return crypto.createHash('sha256').update(`${salt}:${token}`).digest('hex');
}

describe('adminAuth verifyAdmin', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('accepts env admin token', async () => {
    vi.stubEnv('INSIGHT_ADMIN_TOKEN', 'env-token');
    vi.stubEnv('INSIGHT_ADMIN_TOKEN_SALT', '');
    const { verifyAdmin } = await import('./adminAuth');
    const res = await verifyAdmin(
      new Request('http://localhost', {
        headers: { 'x-admin-token': 'env-token' },
      }),
      { strict: true, scope: 'admin_kv_write' },
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.role).toBe('root');
      expect(res.tokenId).toBe('env');
    }
  });

  it('rejects when token mismatches and no salt configured', async () => {
    vi.stubEnv('INSIGHT_ADMIN_TOKEN', 'env-token');
    vi.stubEnv('INSIGHT_ADMIN_TOKEN_SALT', '');
    const { verifyAdmin } = await import('./adminAuth');
    const res = await verifyAdmin(
      new Request('http://localhost', {
        headers: { 'x-admin-token': 'wrong' },
      }),
      { strict: true, scope: 'admin_kv_write' },
    );
    expect(res.ok).toBe(false);
  });

  it('accepts stored token and enforces scope', async () => {
    vi.stubEnv('INSIGHT_ADMIN_TOKEN', '');
    vi.stubEnv('INSIGHT_ADMIN_TOKEN_SALT', 'test-salt-1234567890');
    const { readJsonFile } = await import('@/server/kvStore');
    const token = 'stored-token';
    const store = {
      version: 1 as const,
      tokens: [
        {
          id: 't1',
          label: 'token',
          role: 'viewer' as const,
          createdAt: new Date().toISOString(),
          createdByActor: 'test',
          revokedAt: null,
          hash: hashToken(token, 'test-salt-1234567890'),
        },
      ],
    };
    vi.mocked(readJsonFile).mockResolvedValueOnce(store);
    const { verifyAdmin } = await import('./adminAuth');

    const okRes = await verifyAdmin(
      new Request('http://localhost', {
        headers: { Authorization: `Bearer ${token}` },
      }),
      { strict: true, scope: 'audit_read' },
    );
    expect(okRes.ok).toBe(true);

    vi.mocked(readJsonFile).mockResolvedValueOnce(store);
    const deniedRes = await verifyAdmin(
      new Request('http://localhost', {
        headers: { Authorization: `Bearer ${token}` },
      }),
      { strict: true, scope: 'admin_kv_write' },
    );
    expect(deniedRes.ok).toBe(false);
  });
});
