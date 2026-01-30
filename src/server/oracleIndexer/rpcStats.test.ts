/**
 * Oracle Indexer RPC Stats 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  readRpcStats,
  recordRpcOk,
  recordRpcFail,
  calculateBackoff,
  toSyncErrorCode,
} from './rpcStats';
import type { RpcStats } from './types';

describe('oracleIndexer/rpcStats', () => {
  let stats: RpcStats;

  beforeEach(() => {
    stats = {};
  });

  describe('readRpcStats', () => {
    it('should return empty object for null input', () => {
      expect(readRpcStats(null)).toEqual({});
    });

    it('should return empty object for non-object input', () => {
      expect(readRpcStats('string')).toEqual({});
      expect(readRpcStats(123)).toEqual({});
      expect(readRpcStats([])).toEqual({});
    });

    it('should return the input object for valid object', () => {
      const input = { url1: { ok: 1, fail: 0 } };
      expect(readRpcStats(input)).toEqual(input);
    });
  });

  describe('recordRpcOk', () => {
    it('should create new entry for new URL', () => {
      recordRpcOk(stats, 'https://rpc.example.com', 100);

      expect(stats['https://rpc.example.com']).toEqual({
        ok: 1,
        fail: 0,
        lastOkAt: expect.any(String),
        lastFailAt: null,
        avgLatencyMs: 100,
      });
    });

    it('should update existing entry', () => {
      recordRpcOk(stats, 'https://rpc.example.com', 100);
      recordRpcOk(stats, 'https://rpc.example.com', 200);

      const entry = stats['https://rpc.example.com']!;
      expect(entry.ok).toBe(2);
      expect(entry.avgLatencyMs).toBe(120); // 100 * 0.8 + 200 * 0.2
    });

    it('should calculate moving average correctly', () => {
      recordRpcOk(stats, 'https://rpc.example.com', 100);
      recordRpcOk(stats, 'https://rpc.example.com', 200);
      recordRpcOk(stats, 'https://rpc.example.com', 300);

      const entry = stats['https://rpc.example.com']!;
      // 100 -> 100, 200 -> 120, 300 -> 156
      expect(entry.avgLatencyMs).toBe(156);
    });
  });

  describe('recordRpcFail', () => {
    it('should create new entry for new URL', () => {
      recordRpcFail(stats, 'https://rpc.example.com');

      expect(stats['https://rpc.example.com']).toEqual({
        ok: 0,
        fail: 1,
        lastOkAt: null,
        lastFailAt: expect.any(String),
        avgLatencyMs: null,
      });
    });

    it('should update existing entry', () => {
      recordRpcFail(stats, 'https://rpc.example.com');
      recordRpcFail(stats, 'https://rpc.example.com');

      const entry = stats['https://rpc.example.com']!;
      expect(entry.fail).toBe(2);
    });

    it('should preserve existing stats', () => {
      recordRpcOk(stats, 'https://rpc.example.com', 100);
      recordRpcFail(stats, 'https://rpc.example.com');

      const entry = stats['https://rpc.example.com']!;
      expect(entry.ok).toBe(1);
      expect(entry.fail).toBe(1);
      expect(entry.avgLatencyMs).toBe(100);
    });
  });

  describe('calculateBackoff', () => {
    it('should calculate exponential backoff', () => {
      expect(calculateBackoff(0, 1000)).toBeGreaterThanOrEqual(1000);
      expect(calculateBackoff(1, 1000)).toBeGreaterThanOrEqual(2000);
      expect(calculateBackoff(2, 1000)).toBeGreaterThanOrEqual(4000);
    });

    it('should cap at max backoff', () => {
      // With jitter, the backoff can exceed the cap slightly
      // So we test that the base backoff is capped
      const backoff = calculateBackoff(10, 1000);
      expect(backoff).toBeGreaterThanOrEqual(10000);
      // Jitter adds up to 30%, so max is 13000
      expect(backoff).toBeLessThanOrEqual(13000);
    });

    it('should add jitter', () => {
      const backoff1 = calculateBackoff(1, 1000);
      const backoff2 = calculateBackoff(1, 1000);
      expect(backoff1).not.toBe(backoff2);
    });
  });

  describe('toSyncErrorCode', () => {
    it('should return contract_not_found for specific error', () => {
      const error = new Error('contract_not_found');
      expect(toSyncErrorCode(error)).toBe('contract_not_found');
    });

    it('should return rpc_unreachable for network errors', () => {
      const networkErrors = [
        new Error('failed to fetch'),
        new Error('fetch failed'),
        new Error('ECONNREFUSED'),
        new Error('timeout'),
        new Error('timed out'),
        new Error('socket hang up'),
        new Error('aborted'),
      ];

      networkErrors.forEach((error) => {
        expect(toSyncErrorCode(error)).toBe('rpc_unreachable');
      });
    });

    it('should return sync_failed for other errors', () => {
      const error = new Error('some other error');
      expect(toSyncErrorCode(error)).toBe('sync_failed');
    });

    it('should handle non-Error objects', () => {
      expect(toSyncErrorCode('string error')).toBe('sync_failed');
      expect(toSyncErrorCode(null)).toBe('sync_failed');
      expect(toSyncErrorCode(undefined)).toBe('sync_failed');
    });
  });
});
