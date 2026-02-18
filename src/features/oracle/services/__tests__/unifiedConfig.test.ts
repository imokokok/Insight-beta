/**
 * Unified Config Tests
 *
 * unifiedConfig.ts 模块的单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/database/db', () => ({
  query: vi.fn(),
}));

vi.mock('@/shared/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { query } from '@/lib/database/db';
import { logger } from '@/shared/logger';

// Import the module under test
import {
  createUnifiedInstance,
  getUnifiedInstance,
  listUnifiedInstances,
  updateUnifiedInstance,
  deleteUnifiedInstance,
  updateSyncState,
  recordSyncError,
  getSyncState,
  clearSyncError,
} from '../unifiedConfig';

describe('unifiedConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================================================
  // Instance Management Tests
  // ============================================================================

  describe('createUnifiedInstance', () => {
    it('should create a new unified instance', async () => {
      const mockRow = {
        id: 'test-id',
        name: 'Test Instance',
        protocol: 'chainlink',
        chain: 'ethereum',
        enabled: true,
        config: JSON.stringify({ rpcUrl: 'https://test.com' }),
        protocol_config: JSON.stringify({}),
        metadata: JSON.stringify({}),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(query).mockResolvedValueOnce({ rows: [mockRow] } as never);

      const result = await createUnifiedInstance({
        name: 'Test Instance',
        protocol: 'chainlink',
        chain: 'ethereum',
        config: {
          rpcUrl: 'https://test.com',
          chain: 'ethereum',
        },
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Instance');
      expect(result.protocol).toBe('chainlink');
      expect(result.chain).toBe('ethereum');
      expect(query).toHaveBeenCalledTimes(1);
    });

    it('should throw error when database insert fails', async () => {
      vi.mocked(query).mockRejectedValueOnce(new Error('DB error'));

      await expect(
        createUnifiedInstance({
          name: 'Test Instance',
          protocol: 'chainlink',
          chain: 'ethereum',
          config: {
            rpcUrl: 'https://test.com',
            chain: 'ethereum',
          },
        }),
      ).rejects.toThrow('DB error');
    });
  });

  describe('getUnifiedInstance', () => {
    it('should fetch instance from database', async () => {
      const mockRow = {
        id: 'test-id',
        name: 'DB Instance',
        protocol: 'chainlink',
        chain: 'ethereum',
        enabled: true,
        config: JSON.stringify({ rpcUrl: 'https://test.com' }),
        protocol_config: JSON.stringify({}),
        metadata: JSON.stringify({}),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(query).mockResolvedValueOnce({ rows: [mockRow] } as never);

      const result = await getUnifiedInstance('test-id');

      expect(result).toBeDefined();
      expect(result?.name).toBe('DB Instance');
      expect(query).toHaveBeenCalled();
    });

    it('should return null if instance not found', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never);

      const result = await getUnifiedInstance('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('listUnifiedInstances', () => {
    it('should return filtered instances', async () => {
      const mockRows = [
        {
          id: 'id-1',
          name: 'Instance 1',
          protocol: 'chainlink',
          chain: 'ethereum',
          enabled: true,
          config: JSON.stringify({}),
          protocol_config: JSON.stringify({}),
          metadata: JSON.stringify({}),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'id-2',
          name: 'Instance 2',
          protocol: 'pyth',
          chain: 'solana',
          enabled: false,
          config: JSON.stringify({}),
          protocol_config: JSON.stringify({}),
          metadata: JSON.stringify({}),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      vi.mocked(query).mockResolvedValueOnce({ rows: mockRows } as never);

      const result = await listUnifiedInstances({ protocol: 'chainlink' });

      expect(result).toHaveLength(2);
      expect(result[0]!.protocol).toBe('chainlink');
    });

    it('should return empty array when no instances match', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never);

      const result = await listUnifiedInstances({});

      expect(result).toEqual([]);
    });
  });

  describe('updateUnifiedInstance', () => {
    it('should update instance', async () => {
      const mockRow = {
        id: 'test-id',
        name: 'Updated Instance',
        protocol: 'chainlink',
        chain: 'ethereum',
        enabled: true,
        config: JSON.stringify({ rpcUrl: 'https://updated.com' }),
        protocol_config: JSON.stringify({}),
        metadata: JSON.stringify({}),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // First call for getUnifiedInstance (to check existence), second for the update return
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [mockRow] } as never) // getUnifiedInstance
        .mockResolvedValueOnce({ rows: [] } as never) // UPDATE
        .mockResolvedValueOnce({ rows: [mockRow] } as never); // final getUnifiedInstance

      const result = await updateUnifiedInstance('test-id', {
        name: 'Updated Instance',
        config: { rpcUrl: 'https://updated.com', chain: 'ethereum' },
      });

      expect(result).toBeDefined();
      expect(result?.name).toBe('Updated Instance');
    });

    it('should return null if instance not found', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never);

      const result = await updateUnifiedInstance('non-existent', { name: 'New Name' });

      expect(result).toBeNull();
    });
  });

  describe('deleteUnifiedInstance', () => {
    it('should delete instance', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'test-id' }] } as never);

      const result = await deleteUnifiedInstance('test-id');

      expect(result).toBe(true);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM unified_oracle_instances'),
        ['test-id'],
      );
    });

    it('should return false if instance not found', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never);

      const result = await deleteUnifiedInstance('non-existent');

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // Sync State Management Tests
  // ============================================================================

  describe('updateSyncState', () => {
    it('should update sync state successfully', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ protocol: 'chainlink', chain: 'ethereum' }] } as never)
        .mockResolvedValueOnce({ rows: [] } as never);

      await updateSyncState('test-instance', {
        status: 'healthy',
        lastSyncAt: new Date(),
        lastProcessedBlock: 1000,
        latestBlock: 1005,
        lagBlocks: 5,
      });

      expect(query).toHaveBeenCalledTimes(2);
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should handle instance not found gracefully', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never);

      await updateSyncState('non-existent', { status: 'error' });

      expect(logger.warn).toHaveBeenCalledWith(
        'Cannot update sync state: instance non-existent not found',
      );
    });

    it('should throw error on database failure', async () => {
      vi.mocked(query).mockRejectedValueOnce(new Error('DB error'));

      await expect(updateSyncState('test-instance', { status: 'healthy' })).rejects.toThrow(
        'DB error',
      );
    });
  });

  describe('recordSyncError', () => {
    it('should record sync error and update state', async () => {
      // Mock calls: 1) get instance info (skipped when protocol provided)
      // 2) insert error log, 3) updateSyncState (2 queries), 4) update consecutive failures
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ protocol: 'chainlink', chain: 'ethereum' }] } as never)
        .mockResolvedValueOnce({ rows: [] } as never)
        .mockResolvedValueOnce({ rows: [] } as never)
        .mockResolvedValueOnce({ rows: [] } as never)
        .mockResolvedValueOnce({ rows: [] } as never);

      await recordSyncError('test-instance', 'Connection timeout', 'chainlink');

      expect(query).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should fetch instance info if protocol not provided', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ protocol: 'pyth', chain: 'solana' }] } as never)
        .mockResolvedValueOnce({ rows: [] } as never)
        .mockResolvedValueOnce({ rows: [] } as never)
        .mockResolvedValueOnce({ rows: [] } as never);

      await recordSyncError('test-instance', 'API error');

      expect(query).toHaveBeenCalledWith(expect.stringContaining('SELECT protocol, chain'), [
        'test-instance',
      ]);
    });
  });

  describe('getSyncState', () => {
    it('should return sync state', async () => {
      const mockState = {
        status: 'healthy',
        last_sync_at: new Date(),
        last_sync_duration_ms: 1500,
        consecutive_failures: 0,
        error_message: null,
      };

      vi.mocked(query).mockResolvedValueOnce({ rows: [mockState] } as never);

      const result = await getSyncState('test-instance');

      expect(result).toBeDefined();
      expect(result?.status).toBe('healthy');
      expect(result?.consecutiveFailures).toBe(0);
    });

    it('should return null if sync state not found', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never);

      const result = await getSyncState('non-existent');

      expect(result).toBeNull();
    });

    it('should return null on database error', async () => {
      vi.mocked(query).mockRejectedValueOnce(new Error('DB error'));

      const result = await getSyncState('test-instance');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('clearSyncError', () => {
    it('should clear sync error successfully', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never);

      await clearSyncError('test-instance');

      expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE unified_sync_state'), [
        'test-instance',
      ]);
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should throw error on database failure', async () => {
      vi.mocked(query).mockRejectedValueOnce(new Error('DB error'));

      await expect(clearSyncError('test-instance')).rejects.toThrow('DB error');
    });
  });
});
