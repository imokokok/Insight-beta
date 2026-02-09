import { afterEach, describe, expect, it, vi } from 'vitest';

// Mock env module using vi.hoisted
const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    NODE_ENV: 'test' as const,
    INSIGHT_ALLOW_PRIVATE_RPC_URLS: '',
  },
}));

vi.mock('@/lib/config/env', () => ({
  env: mockEnv,
}));

import { validateOracleConfigPatch } from './oracleConfig';

describe('oracleConfig rpcUrl SSRF guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects private rpcUrl when INSIGHT_ALLOW_PRIVATE_RPC_URLS is not set', () => {
    mockEnv.INSIGHT_ALLOW_PRIVATE_RPC_URLS = '';
    expect(() => validateOracleConfigPatch({ rpcUrl: 'http://localhost:8545' })).toThrowError(
      'invalid_rpc_url',
    );
    expect(() => validateOracleConfigPatch({ rpcUrl: 'http://127.0.0.1:8545' })).toThrowError(
      'invalid_rpc_url',
    );
    expect(() => validateOracleConfigPatch({ rpcUrl: 'http://10.0.0.10:8545' })).toThrowError(
      'invalid_rpc_url',
    );
  });

  it('allows private rpcUrl when INSIGHT_ALLOW_PRIVATE_RPC_URLS is enabled', () => {
    mockEnv.INSIGHT_ALLOW_PRIVATE_RPC_URLS = 'true';
    expect(() => validateOracleConfigPatch({ rpcUrl: 'http://localhost:8545' })).not.toThrow();
    expect(() => validateOracleConfigPatch({ rpcUrl: 'http://127.0.0.1:8545' })).not.toThrow();
  });

  it('rejects rpcUrl with basic auth credentials', () => {
    expect(() =>
      validateOracleConfigPatch({ rpcUrl: 'https://user:pass@rpc.example' }),
    ).toThrowError('invalid_rpc_url');
  });
});
