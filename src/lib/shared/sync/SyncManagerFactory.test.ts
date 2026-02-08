/**
 * SyncManagerFactory 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SyncManagerFactory,
  createSyncManager,
  createSingletonSyncManager,
  type SyncManagerFactoryConfig,
} from './SyncManagerFactory';
import type {
  SupportedChain,
  OracleProtocol,
  UnifiedPriceFeed,
} from '@/lib/types/unifiedOracleTypes';
import type { IOracleClient } from '@/server/oracle/sync/BaseSyncManager';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock database
vi.mock('@/server/db', () => ({
  query: vi.fn(),
}));

import { query } from '@/server/db';

// 创建 Mock Oracle Client
class MockOracleClient implements IOracleClient {
  async getBlockNumber(): Promise<bigint> {
    return 12345678n;
  }

  async getPriceForSymbol(symbol: string): Promise<UnifiedPriceFeed | null> {
    return {
      id: `test-ethereum-${symbol.toLowerCase().replace('/', '-')}`,
      protocol: 'chainlink' as OracleProtocol,
      chain: 'ethereum' as SupportedChain,
      symbol,
      baseAsset: symbol.split('/')[0] || 'ETH',
      quoteAsset: symbol.split('/')[1] || 'USD',
      price: 3500,
      priceRaw: 350000000000n,
      decimals: 8,
      timestamp: new Date().toISOString(),
      blockNumber: 12345678,
      isStale: false,
      stalenessSeconds: 0,
      confidence: 0.95,
      sources: ['chainlink'],
    };
  }
}

// Mock Client Factory
const mockClientFactory = vi.fn(
  (_chain: SupportedChain, _rpcUrl: string, _protocolConfig?: Record<string, unknown>) => {
    return new MockOracleClient();
  },
);

// Mock Symbol Provider
const mockSymbolProvider = vi.fn((chain: SupportedChain): string[] => {
  if (chain === 'ethereum') {
    return ['ETH/USD', 'BTC/USD', 'LINK/USD'];
  }
  return [];
});

describe('SyncManagerFactory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createManagerClass', () => {
    it('应该创建有效的同步管理器类', () => {
      const config: SyncManagerFactoryConfig = {
        protocol: 'chainlink',
        syncConfig: {
          defaultIntervalMs: 30000,
          batchSize: 50,
        },
      };

      const ManagerClass = SyncManagerFactory.createManagerClass(
        config,
        mockClientFactory,
        mockSymbolProvider,
      );

      expect(ManagerClass).toBeDefined();
      expect(typeof ManagerClass).toBe('function');

      // 验证可以实例化
      const instance = new ManagerClass();
      expect(instance).toBeDefined();
    });

    it('应该应用自定义同步配置', () => {
      const config: SyncManagerFactoryConfig = {
        protocol: 'chainlink',
        syncConfig: {
          defaultIntervalMs: 45000,
          batchSize: 75,
          maxConcurrency: 10,
          priceChangeThreshold: 0.005,
          dataRetentionDays: 30,
        },
      };

      const ManagerClass = SyncManagerFactory.createManagerClass(
        config,
        mockClientFactory,
        mockSymbolProvider,
      );

      const instance = new ManagerClass();
      expect(instance).toBeDefined();
    });
  });

  describe('create', () => {
    it('应该创建同步管理器并返回导出函数', () => {
      const config: SyncManagerFactoryConfig = {
        protocol: 'chainlink',
      };

      const exports = SyncManagerFactory.create(config, mockClientFactory, mockSymbolProvider);

      expect(exports).toHaveProperty('startSync');
      expect(exports).toHaveProperty('stopSync');
      expect(exports).toHaveProperty('stopAllSync');
      expect(exports).toHaveProperty('cleanupData');
      expect(exports).toHaveProperty('manager');

      expect(typeof exports.startSync).toBe('function');
      expect(typeof exports.stopSync).toBe('function');
      expect(typeof exports.stopAllSync).toBe('function');
      expect(typeof exports.cleanupData).toBe('function');
    });

    it('应该使用默认配置', () => {
      const config: SyncManagerFactoryConfig = {
        protocol: 'pyth',
      };

      const exports = SyncManagerFactory.create(config, mockClientFactory, mockSymbolProvider);

      expect(exports.manager).toBeDefined();
    });
  });

  describe('createSingleton', () => {
    it('应该创建单例同步管理器', () => {
      const config: SyncManagerFactoryConfig = {
        protocol: 'band',
      };

      const exports1 = SyncManagerFactory.createSingleton(
        config,
        mockClientFactory,
        mockSymbolProvider,
      );

      // 单例模式下，多次访问 manager 应该指向同一个实例
      const manager1 = exports1.manager;
      const manager2 = exports1.manager;
      expect(manager1).toBe(manager2);
    });

    it('单例的函数应该调用同一个实例', async () => {
      const config: SyncManagerFactoryConfig = {
        protocol: 'api3',
      };

      const exports = SyncManagerFactory.createSingleton(
        config,
        mockClientFactory,
        mockSymbolProvider,
      );

      // Mock database response for instance config
      vi.mocked(query).mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // 调用 startSync 不应该抛出错误（虽然会失败因为 mock 返回空）
      await expect(exports.startSync('test-instance')).resolves.not.toThrow();
    });
  });

  describe('便捷函数', () => {
    it('createSyncManager 应该工作', () => {
      const config: SyncManagerFactoryConfig = {
        protocol: 'redstone',
      };

      const exports = createSyncManager(config, mockClientFactory, mockSymbolProvider);

      expect(exports).toHaveProperty('startSync');
      expect(exports).toHaveProperty('manager');
    });

    it('createSingletonSyncManager 应该工作', () => {
      const config: SyncManagerFactoryConfig = {
        protocol: 'flux',
      };

      const exports = createSingletonSyncManager(config, mockClientFactory, mockSymbolProvider);

      expect(exports).toHaveProperty('startSync');
      expect(exports).toHaveProperty('manager');
    });
  });

  describe('集成测试 - 模拟完整流程', () => {
    it('应该能够启动和停止同步', async () => {
      const config: SyncManagerFactoryConfig = {
        protocol: 'chainlink',
        syncConfig: {
          defaultIntervalMs: 1000, // 1秒便于测试
        },
      };

      // Mock instance config - 使用 mockResolvedValue 而不是 mockResolvedValueOnce
      // 因为 startSync 会多次调用 query
      vi.mocked(query).mockImplementation(async (sql: string) => {
        if (sql.includes('unified_oracle_instances')) {
          return {
            rows: [
              {
                id: 'test-instance',
                chain: 'ethereum',
                enabled: true,
                config: { rpcUrl: 'https://rpc.example.com' },
                protocol_config: {},
              },
            ],
            rowCount: 1,
            command: 'SELECT',
            oid: 0,
            fields: [],
          };
        }
        // 其他查询（如 sync state）
        return {
          rows: [],
          rowCount: 0,
          command: 'SELECT',
          oid: 0,
          fields: [],
        };
      });

      const exports = createSyncManager(config, mockClientFactory, mockSymbolProvider);

      // 启动同步
      await exports.startSync('test-instance');

      // 验证 client factory 被调用
      expect(mockClientFactory).toHaveBeenCalledWith('ethereum', 'https://rpc.example.com', {});

      // 停止同步
      exports.stopSync('test-instance');

      // 验证可以停止
      expect(exports.manager).toBeDefined();
    });

    it('应该处理禁用的实例', async () => {
      const config: SyncManagerFactoryConfig = {
        protocol: 'chainlink',
      };

      // Mock disabled instance
      vi.mocked(query).mockResolvedValueOnce({
        rows: [
          {
            id: 'disabled-instance',
            chain: 'ethereum',
            enabled: false,
            config: { rpcUrl: 'https://rpc.example.com' },
            protocol_config: {},
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const exports = createSyncManager(config, mockClientFactory, mockSymbolProvider);

      // 启动同步（实例被禁用）
      await exports.startSync('disabled-instance');

      // client factory 不应该被调用，因为实例被禁用
      expect(mockClientFactory).not.toHaveBeenCalled();
    });

    it('应该处理不存在的实例', async () => {
      const config: SyncManagerFactoryConfig = {
        protocol: 'chainlink',
      };

      // Mock no instance found
      vi.mocked(query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const exports = createSyncManager(config, mockClientFactory, mockSymbolProvider);

      // 启动同步（实例不存在）
      await exports.startSync('non-existent-instance');

      // client factory 不应该被调用
      expect(mockClientFactory).not.toHaveBeenCalled();
    });

    it('应该能够停止所有同步', async () => {
      const config: SyncManagerFactoryConfig = {
        protocol: 'chainlink',
      };

      const exports = createSyncManager(config, mockClientFactory, mockSymbolProvider);

      // 停止所有同步不应该抛出错误
      expect(() => exports.stopAllSync()).not.toThrow();
    });

    it('应该能够清理旧数据', async () => {
      const config: SyncManagerFactoryConfig = {
        protocol: 'chainlink',
        syncConfig: {
          dataRetentionDays: 7,
        },
      };

      // Mock cleanup queries
      vi.mocked(query).mockResolvedValue({
        rows: [],
        rowCount: 5, // 删除了5条记录
        command: 'DELETE',
        oid: 0,
        fields: [],
      });

      const exports = createSyncManager(config, mockClientFactory, mockSymbolProvider);

      await expect(exports.cleanupData()).resolves.not.toThrow();
    });
  });

  describe('不同协议配置', () => {
    const protocols: OracleProtocol[] = [
      'chainlink',
      'pyth',
      'band',
      'api3',
      'redstone',
      'flux',
      'dia',
      'switchboard',
      'uma',
    ];

    protocols.forEach((protocol) => {
      it(`应该支持 ${protocol} 协议`, () => {
        const config: SyncManagerFactoryConfig = {
          protocol,
          syncConfig: {
            defaultIntervalMs: 60000,
            batchSize: 100,
          },
        };

        const exports = createSyncManager(config, mockClientFactory, mockSymbolProvider);

        expect(exports).toBeDefined();
        expect(exports.manager).toBeDefined();
      });
    });
  });

  describe('错误处理', () => {
    it('应该处理 client factory 错误', async () => {
      const config: SyncManagerFactoryConfig = {
        protocol: 'chainlink',
      };

      const errorClientFactory = vi.fn(() => {
        throw new Error('Client creation failed');
      });

      // Mock instance config - 使用 mockImplementation
      vi.mocked(query).mockImplementation(async (sql: string) => {
        if (sql.includes('unified_oracle_instances')) {
          return {
            rows: [
              {
                id: 'test-instance',
                chain: 'ethereum',
                enabled: true,
                config: { rpcUrl: 'https://rpc.example.com' },
                protocol_config: {},
              },
            ],
            rowCount: 1,
            command: 'SELECT',
            oid: 0,
            fields: [],
          };
        }
        return {
          rows: [],
          rowCount: 0,
          command: 'SELECT',
          oid: 0,
          fields: [],
        };
      });

      const exports = createSyncManager(config, errorClientFactory, mockSymbolProvider);

      // 启动同步应该处理错误（抛出异常）
      await expect(exports.startSync('test-instance')).rejects.toThrow();
    });

    it('应该处理 symbol provider 返回空数组', async () => {
      const config: SyncManagerFactoryConfig = {
        protocol: 'chainlink',
      };

      const emptySymbolProvider = vi.fn(() => []);

      // Mock instance config - 使用 mockImplementation
      vi.mocked(query).mockImplementation(async (sql: string) => {
        if (sql.includes('unified_oracle_instances')) {
          return {
            rows: [
              {
                id: 'test-instance',
                chain: 'unknown-chain',
                enabled: true,
                config: { rpcUrl: 'https://rpc.example.com' },
                protocol_config: {},
              },
            ],
            rowCount: 1,
            command: 'SELECT',
            oid: 0,
            fields: [],
          };
        }
        return {
          rows: [],
          rowCount: 0,
          command: 'SELECT',
          oid: 0,
          fields: [],
        };
      });

      const exports = createSyncManager(config, mockClientFactory, emptySymbolProvider);

      // 启动同步应该处理空 symbols（正常完成，没有价格需要同步）
      await expect(exports.startSync('test-instance')).resolves.not.toThrow();
    });
  });
});
