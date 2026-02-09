/**
 * Oracle Indexer RPC Client 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock env module before importing rpcClient
vi.mock('@/lib/config/env', () => ({
  env: {
    INSIGHT_RPC_TIMEOUT_MS: '',
    INSIGHT_DEPENDENCY_TIMEOUT_MS: '',
  },
}));

import { env } from '@/lib/config/env';
import { getRpcTimeoutMs, cleanupClientCache, redactRpcUrl, pickNextRpcUrl } from './rpcClient';

describe('oracleIndexer/rpcClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanupClientCache();
    // Reset mock env
    (env as { INSIGHT_RPC_TIMEOUT_MS: string | number }).INSIGHT_RPC_TIMEOUT_MS = '';
    (env as { INSIGHT_DEPENDENCY_TIMEOUT_MS: string | number }).INSIGHT_DEPENDENCY_TIMEOUT_MS = '';
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getRpcTimeoutMs', () => {
    it('should return default timeout when no env var set', () => {
      (env as { INSIGHT_RPC_TIMEOUT_MS: string | number }).INSIGHT_RPC_TIMEOUT_MS = '';
      (env as { INSIGHT_DEPENDENCY_TIMEOUT_MS: string | number }).INSIGHT_DEPENDENCY_TIMEOUT_MS =
        '';
      expect(getRpcTimeoutMs()).toBe(30000);
    });

    it('should return INSIGHT_RPC_TIMEOUT_MS when set', () => {
      (env as { INSIGHT_RPC_TIMEOUT_MS: string | number }).INSIGHT_RPC_TIMEOUT_MS = '60000';
      expect(getRpcTimeoutMs()).toBe(60000);
    });

    it('should return INSIGHT_DEPENDENCY_TIMEOUT_MS as fallback', () => {
      (env as { INSIGHT_DEPENDENCY_TIMEOUT_MS: string | number }).INSIGHT_DEPENDENCY_TIMEOUT_MS =
        '45000';
      expect(getRpcTimeoutMs()).toBe(45000);
    });

    it('should handle invalid values gracefully', () => {
      (env as { INSIGHT_RPC_TIMEOUT_MS: string | number }).INSIGHT_RPC_TIMEOUT_MS = 'invalid';
      expect(getRpcTimeoutMs()).toBe(30000);
    });
  });

  describe('redactRpcUrl', () => {
    it('should redact credentials from URL', () => {
      const url = 'https://user:pass@example.com/path';
      const redacted = redactRpcUrl(url);
      expect(redacted).not.toContain('user');
      expect(redacted).not.toContain('pass');
      expect(redacted).toContain('example.com');
    });

    it('should redact token-like path segments', () => {
      const url = 'https://example.com/v1/abc123def456ghi789';
      const redacted = redactRpcUrl(url);
      // URL encoding may encode <redacted> as %3Credacted%3E
      expect(redacted).toMatch(/<redacted>|%3Credacted%3E/);
    });

    it('should handle URLs without path', () => {
      const url = 'https://example.com';
      const redacted = redactRpcUrl(url);
      expect(redacted).toBe('https://example.com/');
    });

    it('should handle invalid URLs gracefully', () => {
      const url = 'not-a-valid-url';
      const redacted = redactRpcUrl(url);
      expect(redacted).toBe(url);
    });

    it('should truncate very long URLs', () => {
      const url = 'https://example.com/' + 'a'.repeat(200);
      const redacted = redactRpcUrl(url);
      expect(redacted.length).toBeLessThanOrEqual(143); // 140 + '...'
    });
  });

  describe('pickNextRpcUrl', () => {
    it('should return current URL if only one URL available', () => {
      const urls = ['https://rpc1.example.com'];
      expect(pickNextRpcUrl(urls, 'https://rpc1.example.com')).toBe('https://rpc1.example.com');
    });

    it('should pick next URL in rotation', () => {
      const urls = [
        'https://rpc1.example.com',
        'https://rpc2.example.com',
        'https://rpc3.example.com',
      ];
      expect(pickNextRpcUrl(urls, 'https://rpc1.example.com')).toBe('https://rpc2.example.com');
      expect(pickNextRpcUrl(urls, 'https://rpc2.example.com')).toBe('https://rpc3.example.com');
      expect(pickNextRpcUrl(urls, 'https://rpc3.example.com')).toBe('https://rpc1.example.com');
    });

    it('should return first URL if current not found', () => {
      const urls = ['https://rpc1.example.com', 'https://rpc2.example.com'];
      expect(pickNextRpcUrl(urls, 'https://unknown.example.com')).toBe('https://rpc1.example.com');
    });
  });
});
