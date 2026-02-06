/**
 * Sync Framework Tests
 *
 * Oracle 同步框架测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sleep } from '@/lib/utils';
import {
  syncManager,
  createPriceFeedRecord,
  withTimeout,
  withRetry,
  DEFAULT_SYNC_CONFIG,
  type SyncContext,
} from './syncFramework';
import { query } from '@/server/db';
import { getUnifiedInstance } from '@/server/oracle/unifiedConfig';

// Mock dependencies
vi.mock('@/server/db', () => ({
  query: vi.fn(),
}));

vi.mock('@/server/oracle/unifiedConfig', () => ({
  getUnifiedInstance: vi.fn(),
  updateSyncState: vi.fn(),
  recordSyncError: vi.fn(),
}));

describe('Sync Framework', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    syncManager.stopAllSyncs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('SyncManager', () => {
    it('should register sync function for protocol', () => {
      const mockSyncFn = vi.fn().mockResolvedValue([]);

      syncManager.registerSyncFunction('chainlink', mockSyncFn);

      // Should not throw when registering
      expect(() => syncManager.registerSyncFunction('pyth', mockSyncFn)).not.toThrow();
    });

    it('should throw error when starting sync for unregistered protocol', async () => {
      vi.mocked(getUnifiedInstance).mockResolvedValue({
        id: 'test-instance',
        name: 'Test Instance',
        protocol: 'flux',
        chain: 'ethereum',
        config: {},
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Awaited<ReturnType<typeof getUnifiedInstance>>);

      // flux protocol is not registered, so it should throw
      await expect(syncManager.startSync('test-instance')).rejects.toThrow(
        'No sync function registered for protocol: flux',
      );
    });

    it('should throw error when instance not found', async () => {
      vi.mocked(getUnifiedInstance).mockResolvedValue(null);

      await expect(syncManager.startSync('non-existent')).rejects.toThrow(
        'Instance non-existent not found',
      );
    });

    it('should warn when sync already running', async () => {
      const mockSyncFn = vi.fn().mockResolvedValue([]);
      syncManager.registerSyncFunction('chainlink', mockSyncFn);

      vi.mocked(getUnifiedInstance).mockResolvedValue({
        id: 'test-instance',
        protocol: 'chainlink',
        chain: 'ethereum',
        config: { rpcUrl: 'http://localhost:8545' },
      } as Awaited<ReturnType<typeof getUnifiedInstance>>);

      vi.mocked(query).mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Start first sync
      await syncManager.startSync('test-instance');

      // Try to start again - should warn but not throw
      await expect(syncManager.startSync('test-instance')).resolves.not.toThrow();

      syncManager.stopSync('test-instance');
    });

    it('should stop sync correctly', async () => {
      const mockSyncFn = vi.fn().mockResolvedValue([]);
      syncManager.registerSyncFunction('chainlink', mockSyncFn);

      vi.mocked(getUnifiedInstance).mockResolvedValue({
        id: 'test-instance',
        protocol: 'chainlink',
        chain: 'ethereum',
        config: { rpcUrl: 'http://localhost:8545' },
      } as Awaited<ReturnType<typeof getUnifiedInstance>>);

      vi.mocked(query).mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await syncManager.startSync('test-instance');
      expect(syncManager.getRunningSyncs()).toContain('test-instance');

      syncManager.stopSync('test-instance');
      expect(syncManager.getRunningSyncs()).not.toContain('test-instance');
    });

    it('should stop all syncs', async () => {
      const mockSyncFn = vi.fn().mockResolvedValue([]);
      syncManager.registerSyncFunction('chainlink', mockSyncFn);

      vi.mocked(getUnifiedInstance).mockResolvedValue({
        id: 'test-instance',
        protocol: 'chainlink',
        chain: 'ethereum',
        config: { rpcUrl: 'http://localhost:8545' },
      } as Awaited<ReturnType<typeof getUnifiedInstance>>);

      vi.mocked(query).mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await syncManager.startSync('instance-1');
      await syncManager.startSync('instance-2');

      expect(syncManager.getRunningSyncs()).toHaveLength(2);

      syncManager.stopAllSyncs();
      expect(syncManager.getRunningSyncs()).toHaveLength(0);
    });

    it('should get sync state', async () => {
      const mockSyncFn = vi.fn().mockResolvedValue([]);
      syncManager.registerSyncFunction('chainlink', mockSyncFn);

      vi.mocked(getUnifiedInstance).mockResolvedValue({
        id: 'test-instance',
        protocol: 'chainlink',
        chain: 'ethereum',
        config: { rpcUrl: 'http://localhost:8545' },
      } as Awaited<ReturnType<typeof getUnifiedInstance>>);

      vi.mocked(query).mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const state = syncManager.getSyncState('test-instance');
      expect(state).toBeUndefined();

      await syncManager.startSync('test-instance');
      const stateAfterStart = syncManager.getSyncState('test-instance');
      expect(stateAfterStart).toBeDefined();
      expect(stateAfterStart?.isRunning).toBe(false);

      syncManager.stopSync('test-instance');
    });
  });

  describe('createPriceFeedRecord', () => {
    it('should create price feed record with correct structure', () => {
      const context: SyncContext = {
        instanceId: 'test-instance',
        protocol: 'chainlink',
        chain: 'ethereum',
        rpcUrl: 'http://localhost:8545',
        config: {},
      };

      const record = createPriceFeedRecord(
        context,
        'ETH/USD',
        'ETH',
        'USD',
        2000.5,
        12345678,
        0.95,
        { source: 'test' },
      );

      expect(record).toMatchObject({
        protocol: 'chainlink',
        chain: 'ethereum',
        instanceId: 'test-instance',
        symbol: 'ETH/USD',
        baseAsset: 'ETH',
        quoteAsset: 'USD',
        price: 2000.5,
        blockNumber: 12345678,
        confidence: 0.95,
        source: 'chainlink',
        metadata: { source: 'test' },
      });
      expect(record.timestamp).toBeInstanceOf(Date);
    });

    it('should create record without optional metadata', () => {
      const context: SyncContext = {
        instanceId: 'test-instance',
        protocol: 'pyth',
        chain: 'solana',
        rpcUrl: 'http://localhost:8899',
        config: {},
      };

      const record = createPriceFeedRecord(context, 'BTC/USD', 'BTC', 'USD', 50000, null, 0.99);

      expect(record.metadata).toBeUndefined();
      expect(record.blockNumber).toBeNull();
    });
  });

  describe('sleep', () => {
    it('should delay execution', async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(45); // Allow small margin
    });
  });

  describe('withTimeout', () => {
    it('should resolve if promise completes before timeout', async () => {
      const promise = Promise.resolve('success');
      const result = await withTimeout(promise, 1000, 'Timeout');

      expect(result).toBe('success');
    });

    it('should reject if promise takes longer than timeout', async () => {
      const promise = sleep(200).then(() => 'success');

      await expect(withTimeout(promise, 50, 'Operation timed out')).rejects.toThrow(
        'Operation timed out',
      );
    });
  });

  describe('withRetry', () => {
    it('should return result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValue('success');

      const onRetry = vi.fn();
      const result = await withRetry(fn, { maxRetries: 3, retryDelayMs: 10, onRetry });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
      expect(onRetry).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Persistent error'));

      await expect(withRetry(fn, { maxRetries: 2, retryDelayMs: 10 })).rejects.toThrow(
        'Persistent error',
      );
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValue('success');

      const start = Date.now();
      await withRetry(fn, { maxRetries: 3, retryDelayMs: 50 });
      const elapsed = Date.now() - start;

      // First retry after 50ms, second after 100ms = ~150ms total
      expect(elapsed).toBeGreaterThanOrEqual(140);
    });
  });

  describe('DEFAULT_SYNC_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_SYNC_CONFIG).toEqual({
        defaultIntervalMs: 60_000,
        maxRetries: 3,
        retryDelayMs: 5_000,
        batchSize: 20,
      });
    });
  });
});
