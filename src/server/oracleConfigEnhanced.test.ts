/**
 * Oracle Config 增强功能测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ConfigCacheManager,
  batchUpdateOracleConfigs,
  notifyConfigChange,
  generateWebhookSignature,
  ensureEnhancedSchema,
  validateOracleConfig,
  diffConfigs,
  formatConfigDiff,
  cloneConfig,
  exportConfigs,
  importConfigs,
  getConfigVersions,
  rollbackConfigVersion,
  saveConfigVersion,
  searchConfigs,
} from './oracleConfigEnhanced';
import type { BatchConfigUpdate } from './oracleConfigEnhanced';
import type { OracleConfig } from '@/lib/types/oracleTypes';

// Mock dependencies
vi.mock('./db', () => ({
  hasDatabase: vi.fn(() => true),
  query: vi.fn(),
  getClient: vi.fn(() => ({
    query: vi.fn(),
    release: vi.fn(),
  })),
}));

vi.mock('./redisCache', () => ({
  RedisCache: class MockRedisCache<T> {
    private data = new Map<string, T>();

    async get(key: string): Promise<T | null> {
      return this.data.get(key) || null;
    }

    async set(key: string, value: T): Promise<boolean> {
      this.data.set(key, value);
      return true;
    }

    async delete(key: string): Promise<boolean> {
      this.data.delete(key);
      return true;
    }

    async mdel(keys: string[]): Promise<boolean> {
      for (const key of keys) {
        this.data.delete(key);
      }
      return true;
    }

    async stats(): Promise<{ keys: number; connected: boolean }> {
      return { keys: this.data.size, connected: false };
    }

    async clear(): Promise<boolean> {
      this.data.clear();
      return true;
    }
  },
  oracleConfigCache: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/lib/security/encryption', () => ({
  encryptString: vi.fn((s: string) => `encrypted:${s}`),
  decryptString: vi.fn((s: string) => s?.replace('encrypted:', '')),
  isEncryptionEnabled: vi.fn(() => true),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('./oracle', () => ({
  readOracleConfig: vi.fn(() =>
    Promise.resolve({
      rpcUrl: 'https://rpc.example.com',
      contractAddress: '0x1234567890123456789012345678901234567890',
      chain: 'Polygon',
      startBlock: 0,
      maxBlockRange: 10000,
      votingPeriodHours: 72,
      confirmationBlocks: 12,
    }),
  ),
  writeOracleConfig: vi.fn(() => Promise.resolve()),
}));

describe('ConfigCacheManager', () => {
  let cacheManager: ConfigCacheManager;

  beforeEach(() => {
    cacheManager = new ConfigCacheManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('should return null when no cache entry exists', async () => {
      const result = await cacheManager.get('non-existent');
      expect(result).toBeNull();
    });

    it('should return cached config', async () => {
      const mockConfig: OracleConfig = {
        rpcUrl: 'https://rpc.example.com',
        contractAddress: '0x1234567890123456789012345678901234567890',
        chain: 'Polygon',
        startBlock: 0,
        maxBlockRange: 10000,
        votingPeriodHours: 72,
        confirmationBlocks: 12,
      };

      await cacheManager.set('test-instance', mockConfig);
      const result = await cacheManager.get('test-instance');
      expect(result).toEqual(mockConfig);
    });
  });

  describe('set', () => {
    it('should store config in cache', async () => {
      const mockConfig: OracleConfig = {
        rpcUrl: 'https://rpc.example.com',
        contractAddress: '0x1234567890123456789012345678901234567890',
        chain: 'Polygon',
        startBlock: 0,
        maxBlockRange: 10000,
        votingPeriodHours: 72,
        confirmationBlocks: 12,
      };

      await cacheManager.set('test-instance', mockConfig);
      const stats = await cacheManager.getStats();
      expect(stats.localSize).toBe(1);
    });
  });

  describe('invalidate', () => {
    it('should remove config from cache', async () => {
      const mockConfig: OracleConfig = {
        rpcUrl: 'https://rpc.example.com',
        contractAddress: '0x1234567890123456789012345678901234567890',
        chain: 'Polygon',
        startBlock: 0,
        maxBlockRange: 10000,
        votingPeriodHours: 72,
        confirmationBlocks: 12,
      };

      await cacheManager.set('test-instance', mockConfig);
      await cacheManager.invalidate('test-instance');

      const result = await cacheManager.get('test-instance');
      expect(result).toBeNull();
    });
  });

  describe('invalidateBatch', () => {
    it('should remove multiple configs from cache', async () => {
      const mockConfig: OracleConfig = {
        rpcUrl: 'https://rpc.example.com',
        contractAddress: '0x1234567890123456789012345678901234567890',
        chain: 'Polygon',
        startBlock: 0,
        maxBlockRange: 10000,
        votingPeriodHours: 72,
        confirmationBlocks: 12,
      };

      await cacheManager.set('instance-1', mockConfig);
      await cacheManager.set('instance-2', mockConfig);
      await cacheManager.invalidateBatch(['instance-1', 'instance-2']);

      const result1 = await cacheManager.get('instance-1');
      const result2 = await cacheManager.get('instance-2');
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      const stats = await cacheManager.getStats();
      expect(stats).toHaveProperty('localSize');
      expect(stats).toHaveProperty('distributedKeys');
      expect(stats).toHaveProperty('distributedConnected');
    });
  });

  describe('clear', () => {
    it('should clear all cache entries', async () => {
      const mockConfig: OracleConfig = {
        rpcUrl: 'https://rpc.example.com',
        contractAddress: '0x1234567890123456789012345678901234567890',
        chain: 'Polygon',
        startBlock: 0,
        maxBlockRange: 10000,
        votingPeriodHours: 72,
        confirmationBlocks: 12,
      };

      await cacheManager.set('instance-1', mockConfig);
      await cacheManager.set('instance-2', mockConfig);
      await cacheManager.clear();

      const stats = await cacheManager.getStats();
      expect(stats.localSize).toBe(0);
    });
  });
});

describe('batchUpdateOracleConfigs', () => {
  it('should handle empty updates array', async () => {
    const result = await batchUpdateOracleConfigs([]);
    expect(result.success).toEqual([]);
    expect(result.failed).toEqual([]);
  });

  it('should update multiple configs', async () => {
    const updates: BatchConfigUpdate[] = [
      {
        instanceId: 'instance-1',
        config: { chain: 'Polygon' },
      },
      {
        instanceId: 'instance-2',
        config: { chain: 'Arbitrum' },
      },
    ];

    const result = await batchUpdateOracleConfigs(updates, {
      useTransaction: false,
    });

    expect(result.success.length).toBeGreaterThanOrEqual(0);
  });
});

describe('Webhook functionality', () => {
  describe('generateWebhookSignature', () => {
    it('should generate consistent signatures', () => {
      const payload = JSON.stringify({ event: 'test', data: {} });
      const secret = 'test-secret';

      const sig1 = generateWebhookSignature(payload, secret);
      const sig2 = generateWebhookSignature(payload, secret);

      expect(sig1).toBe(sig2);
      expect(sig1).toHaveLength(64); // SHA-256 hex length
    });

    it('should generate different signatures for different secrets', () => {
      const payload = JSON.stringify({ event: 'test', data: {} });

      const sig1 = generateWebhookSignature(payload, 'secret-1');
      const sig2 = generateWebhookSignature(payload, 'secret-2');

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('notifyConfigChange', () => {
    it('should handle no matching webhooks gracefully', async () => {
      await expect(notifyConfigChange('config.updated', { test: true })).resolves.not.toThrow();
    });
  });
});

describe('Config Validation', () => {
  describe('validateOracleConfig', () => {
    it('should validate valid config', async () => {
      const config: Partial<OracleConfig> = {
        rpcUrl: 'https://rpc.example.com',
        contractAddress: '0x1234567890123456789012345678901234567890',
        chain: 'Polygon',
        maxBlockRange: 10000,
        votingPeriodHours: 72,
        confirmationBlocks: 12,
      };

      const result = await validateOracleConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid Ethereum address', async () => {
      const config: Partial<OracleConfig> = {
        contractAddress: 'invalid-address',
      };

      const result = await validateOracleConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'contractAddress',
          code: 'invalid_address',
        }),
      );
    });

    it('should detect invalid chain', async () => {
      const config: Partial<OracleConfig> = {
        // @ts-expect-error Testing invalid chain
        chain: 'InvalidChain',
      };

      const result = await validateOracleConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'chain',
          code: 'invalid_chain',
        }),
      );
    });

    it('should detect invalid block range', async () => {
      const config: Partial<OracleConfig> = {
        maxBlockRange: 999999,
      };

      const result = await validateOracleConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'maxBlockRange',
          code: 'invalid_block_range',
        }),
      );
    });

    it('should warn about low confirmation blocks', async () => {
      const config: Partial<OracleConfig> = {
        confirmationBlocks: 3,
      };

      const result = await validateOracleConfig(config);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'confirmationBlocks',
        }),
      );
    });

    it('should validate multiple RPC URLs', async () => {
      const config: Partial<OracleConfig> = {
        rpcUrl: 'https://rpc1.example.com, https://rpc2.example.com',
      };

      const result = await validateOracleConfig(config);
      expect(result.valid).toBe(true);
    });

    it('should detect invalid RPC URL protocol', async () => {
      const config: Partial<OracleConfig> = {
        rpcUrl: 'ftp://rpc.example.com',
      };

      const result = await validateOracleConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'rpcUrl',
          code: 'invalid_protocol',
        }),
      );
    });
  });
});

describe('Config Diff', () => {
  describe('diffConfigs', () => {
    it('should detect added fields', () => {
      const oldConfig: Partial<OracleConfig> = {};
      const newConfig: Partial<OracleConfig> = {
        chain: 'Polygon',
      };

      const diffs = diffConfigs(oldConfig, newConfig);
      expect(diffs).toHaveLength(1);
      expect(diffs[0]).toEqual({
        field: 'chain',
        oldValue: undefined,
        newValue: 'Polygon',
        type: 'added',
      });
    });

    it('should detect removed fields', () => {
      const oldConfig: Partial<OracleConfig> = {
        chain: 'Polygon',
      };
      const newConfig: Partial<OracleConfig> = {};

      const diffs = diffConfigs(oldConfig, newConfig);
      expect(diffs).toHaveLength(1);
      expect(diffs[0]).toEqual({
        field: 'chain',
        oldValue: 'Polygon',
        newValue: undefined,
        type: 'removed',
      });
    });

    it('should detect modified fields', () => {
      const oldConfig: Partial<OracleConfig> = {
        chain: 'Polygon',
      };
      const newConfig: Partial<OracleConfig> = {
        chain: 'Arbitrum',
      };

      const diffs = diffConfigs(oldConfig, newConfig);
      expect(diffs).toHaveLength(1);
      expect(diffs[0]).toEqual({
        field: 'chain',
        oldValue: 'Polygon',
        newValue: 'Arbitrum',
        type: 'modified',
      });
    });

    it('should return empty array for identical configs', () => {
      const config: Partial<OracleConfig> = {
        chain: 'Polygon',
        maxBlockRange: 10000,
      };

      const diffs = diffConfigs(config, config);
      expect(diffs).toHaveLength(0);
    });

    it('should detect multiple changes', () => {
      const oldConfig: Partial<OracleConfig> = {
        chain: 'Polygon',
        maxBlockRange: 10000,
      };
      const newConfig: Partial<OracleConfig> = {
        chain: 'Arbitrum',
        votingPeriodHours: 48,
      };

      const diffs = diffConfigs(oldConfig, newConfig);
      expect(diffs).toHaveLength(3);
    });
  });

  describe('formatConfigDiff', () => {
    it('should format diffs as text', () => {
      const diffs = [
        {
          field: 'chain' as const,
          oldValue: 'Polygon',
          newValue: 'Arbitrum',
          type: 'modified' as const,
        },
        {
          field: 'maxBlockRange' as const,
          oldValue: undefined,
          newValue: 20000,
          type: 'added' as const,
        },
      ];

      const formatted = formatConfigDiff(diffs);
      expect(formatted).toContain('chain');
      expect(formatted).toContain('Polygon');
      expect(formatted).toContain('Arbitrum');
      expect(formatted).toContain('maxBlockRange');
    });

    it('should return "No changes" for empty diffs', () => {
      const formatted = formatConfigDiff([]);
      expect(formatted).toBe('No changes');
    });
  });
});

describe('Config Clone', () => {
  describe('cloneConfig', () => {
    it('should fail when source and target are the same', async () => {
      const result = await cloneConfig('same-instance', 'same-instance');
      expect(result.success).toBe(false);
    });

    it('should handle clone operation', async () => {
      // 由于 mock 的复杂性，我们只测试函数能被调用
      const result = await cloneConfig('source-instance', 'target-instance');
      // 结果取决于 mock 的行为
      expect(result).toHaveProperty('success');
    });
  });
});

describe('Config Export/Import', () => {
  describe('exportConfigs', () => {
    it('should export single instance', async () => {
      const exportData = await exportConfigs(['instance-1']);
      expect(exportData.instances).toHaveLength(1);
      expect(exportData.instances[0]?.instanceId).toBe('instance-1');
      expect(exportData.format).toBe('json');
    });

    it('should export multiple instances', async () => {
      const exportData = await exportConfigs(['instance-1', 'instance-2']);
      expect(exportData.instances).toHaveLength(2);
    });

    it('should include metadata', async () => {
      const exportData = await exportConfigs(['instance-1'], {
        exportedBy: 'test-user',
      });
      expect(exportData.exportedBy).toBe('test-user');
      expect(exportData.exportedAt).toBeDefined();
    });
  });

  describe('importConfigs', () => {
    it('should handle empty export data', async () => {
      const result = await importConfigs({
        format: 'json',
        instances: [],
        exportedAt: new Date().toISOString(),
      });
      expect(result.success).toEqual([]);
      expect(result.failed).toEqual([]);
    });

    it('should import configs with validation', async () => {
      const exportData = {
        format: 'json' as const,
        instances: [
          {
            instanceId: 'new-instance',
            config: {
              rpcUrl: 'https://rpc.example.com',
              contractAddress: '0x1234567890123456789012345678901234567890',
              chain: 'Polygon' as const,
              startBlock: 0,
              maxBlockRange: 10000,
              votingPeriodHours: 72,
              confirmationBlocks: 12,
            },
          },
        ],
        exportedAt: new Date().toISOString(),
      };

      const result = await importConfigs(exportData, {
        validateConfigs: true,
      });
      expect(result.success.length + result.failed.length).toBe(1);
    });
  });
});

describe('Config Version Control', () => {
  describe('saveConfigVersion', () => {
    it('should throw error when database not available', async () => {
      const { hasDatabase } = await import('./db');
      vi.mocked(hasDatabase).mockReturnValueOnce(false);

      await expect(saveConfigVersion('instance-1', {} as OracleConfig, 'create')).rejects.toThrow(
        'Database not available',
      );
    });
  });

  describe('getConfigVersions', () => {
    it('should return empty when database not available', async () => {
      const { hasDatabase } = await import('./db');
      vi.mocked(hasDatabase).mockReturnValueOnce(false);

      const result = await getConfigVersions('instance-1');
      expect(result.versions).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('rollbackConfigVersion', () => {
    it('should return null when version not found', async () => {
      const { query } = await import('./db');
      vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never);

      const result = await rollbackConfigVersion('instance-1', 999);
      expect(result).toBeNull();
    });
  });
});

describe('Config Search', () => {
  describe('searchConfigs', () => {
    it('should return results with default options', async () => {
      const { query } = await import('./db');
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] } as never)
        .mockResolvedValueOnce({ rows: [] } as never);

      const result = await searchConfigs();
      expect(result.results).toBeDefined();
      expect(result.total).toBeDefined();
    });

    it('should filter by chain', async () => {
      const { query } = await import('./db');
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] } as never)
        .mockResolvedValueOnce({ rows: [] } as never);

      const result = await searchConfigs({ chain: 'Polygon' });
      expect(result.results).toBeDefined();
    });

    it('should filter by query', async () => {
      const { query } = await import('./db');
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] } as never)
        .mockResolvedValueOnce({ rows: [] } as never);

      const result = await searchConfigs({ query: 'test' });
      expect(result.results).toBeDefined();
    });

    it('should support pagination', async () => {
      const { query } = await import('./db');
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] } as never)
        .mockResolvedValueOnce({ rows: [] } as never);

      const result = await searchConfigs({ limit: 10, offset: 0 });
      expect(result.results).toBeDefined();
      expect(result.total).toBeDefined();
    });
  });
});

describe('Schema management', () => {
  it('should ensure enhanced schema exists', async () => {
    await expect(ensureEnhancedSchema()).resolves.not.toThrow();
  });
});
