/**
 * Sync Workflow Integration Tests - 同步工作流集成测试
 *
 * 测试完整的同步流程，包括：
 * - 客户端创建
 * - 价格获取
 * - 数据存储
 * - 状态更新
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
  SupportedChain,
  UnifiedPriceFeed,
  OracleProtocol,
} from '@/types/unifiedOracleTypes';

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

import { query } from '@/infrastructure/database/db';

describe('Sync Workflow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('完整同步流程', () => {
    it('应该能够执行完整的同步流程', async () => {
      // 1. 准备 mock 数据
      const mockPriceFeeds: UnifiedPriceFeed[] = [
        {
          id: 'chainlink-ethereum-eth-usd',
          protocol: 'chainlink' as OracleProtocol,
          chain: 'ethereum' as SupportedChain,
          symbol: 'ETH/USD',
          baseAsset: 'ETH',
          quoteAsset: 'USD',
          price: 3500.5,
          priceRaw: 350050000000n,
          decimals: 8,
          timestamp: Date.now(),
          blockNumber: 12345678,
          isStale: false,
          stalenessSeconds: 0,
          confidence: 0.95,
          sources: ['chainlink'],
        },
        {
          id: 'chainlink-ethereum-btc-usd',
          protocol: 'chainlink' as OracleProtocol,
          chain: 'ethereum' as SupportedChain,
          symbol: 'BTC/USD',
          baseAsset: 'BTC',
          quoteAsset: 'USD',
          price: 65000,
          priceRaw: 6500000000000n,
          decimals: 8,
          timestamp: Date.now(),
          blockNumber: 12345678,
          isStale: false,
          stalenessSeconds: 0,
          confidence: 0.95,
          sources: ['chainlink'],
        },
      ];

      // 2. Mock 数据库响应
      vi.mocked(query).mockImplementation(async (sql: string) => {
        // 实例配置查询
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

        // 同步状态查询
        if (sql.includes('unified_sync_state')) {
          return {
            rows: [],
            rowCount: 0,
            command: 'SELECT',
            oid: 0,
            fields: [],
          };
        }

        // 插入操作
        if (sql.includes('INSERT INTO')) {
          return {
            rows: [],
            rowCount: mockPriceFeeds.length,
            command: 'INSERT',
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

      // 3. 验证流程执行
      const { createSyncManager } = await import('@/lib/shared');

      const mockClientFactory = vi.fn(() => ({
        getBlockNumber: vi.fn().mockResolvedValue(12345678n),
        getPriceForSymbol: vi.fn((symbol: string) => {
          return Promise.resolve(mockPriceFeeds.find((f) => f.symbol === symbol) || null);
        }),
      }));

      const mockSymbolProvider = vi.fn(() => ['ETH/USD', 'BTC/USD']);

      const syncExports = createSyncManager(
        {
          protocol: 'chainlink',
          syncConfig: {
            defaultIntervalMs: 60000,
            batchSize: 100,
          },
        },
        mockClientFactory,
        mockSymbolProvider,
      );

      // 4. 执行同步
      await syncExports.startSync('test-instance');

      // 5. 验证结果
      expect(mockClientFactory).toHaveBeenCalledWith('ethereum', 'https://rpc.example.com', {});

      // 验证数据库被调用
      expect(query).toHaveBeenCalled();

      // 停止同步
      syncExports.stopSync('test-instance');
    });

    it('应该处理同步过程中的错误', async () => {
      // Mock 数据库返回错误
      vi.mocked(query).mockRejectedValue(new Error('Database connection failed'));

      const { createSyncManager } = await import('@/lib/shared');

      const mockClientFactory = vi.fn(() => ({
        getBlockNumber: vi.fn().mockResolvedValue(12345678n),
        getPriceForSymbol: vi.fn().mockResolvedValue(null),
      }));

      const mockSymbolProvider = vi.fn(() => ['ETH/USD']);

      const syncExports = createSyncManager(
        {
          protocol: 'chainlink',
        },
        mockClientFactory,
        mockSymbolProvider,
      );

      // 应该抛出错误
      await expect(syncExports.startSync('test-instance')).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('应该正确处理价格更新阈值', async () => {
      const priceUpdates: Array<{ symbol: string; price: number }> = [];

      // Mock 数据库来捕获价格更新
      vi.mocked(query).mockImplementation(async (sql: string, params?: unknown[]) => {
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

        if (sql.includes('unified_price_updates')) {
          // 捕获价格更新
          if (params && params.length >= 6) {
            priceUpdates.push({
              symbol: params[2] as string,
              price: params[5] as number,
            });
          }
          return {
            rows: [],
            rowCount: 1,
            command: 'INSERT',
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

      const { createSyncManager } = await import('@/lib/shared');

      const mockPriceFeed: UnifiedPriceFeed = {
        id: 'chainlink-ethereum-eth-usd',
        protocol: 'chainlink' as OracleProtocol,
        chain: 'ethereum' as SupportedChain,
        symbol: 'ETH/USD',
        baseAsset: 'ETH',
        quoteAsset: 'USD',
        price: 3500,
        priceRaw: 350000000000n,
        decimals: 8,
        timestamp: Date.now(),
        blockNumber: 12345678,
        isStale: false,
        stalenessSeconds: 0,
        confidence: 0.95,
        sources: ['chainlink'],
      };

      const mockClientFactory = vi.fn(() => ({
        getBlockNumber: vi.fn().mockResolvedValue(12345678n),
        getPriceForSymbol: vi.fn().mockResolvedValue(mockPriceFeed),
      }));

      const mockSymbolProvider = vi.fn(() => ['ETH/USD']);

      const syncExports = createSyncManager(
        {
          protocol: 'chainlink',
          syncConfig: {
            priceChangeThreshold: 0.001, // 0.1%
          },
        },
        mockClientFactory,
        mockSymbolProvider,
      );

      // 第一次同步
      await syncExports.startSync('test-instance');
      syncExports.stopSync('test-instance');

      // 修改价格（超过阈值）
      mockPriceFeed.price = 3505; // 0.14% 变化

      // 第二次同步
      await syncExports.startSync('test-instance');
      syncExports.stopSync('test-instance');

      // 验证价格更新被记录
      expect(priceUpdates.length).toBeGreaterThan(0);
    });
  });

  describe('多协议同步', () => {
    it('应该支持多个协议同时同步', async () => {
      const protocols: OracleProtocol[] = ['chainlink', 'pyth', 'band'];
      const syncManagers: Array<{
        startSync: (id: string) => Promise<void>;
        stopSync: (id: string) => void;
      }> = [];

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

      const { createSyncManager } = await import('@/lib/shared');

      for (const protocol of protocols) {
        const mockClientFactory = vi.fn(() => ({
          getBlockNumber: vi.fn().mockResolvedValue(12345678n),
          getPriceForSymbol: vi.fn().mockResolvedValue({
            id: `${protocol}-ethereum-eth-usd`,
            protocol,
            chain: 'ethereum',
            symbol: 'ETH/USD',
            price: 3500,
          }),
        }));

        const mockSymbolProvider = vi.fn(() => ['ETH/USD']);

        const syncExports = createSyncManager({ protocol }, mockClientFactory, mockSymbolProvider);

        syncManagers.push(syncExports);
      }

      // 同时启动所有协议的同步
      await Promise.all(
        syncManagers.map((manager, index) => manager.startSync(`test-instance-${index}`)),
      );

      // 验证所有同步都启动了（query 被调用多次）
      expect(query).toHaveBeenCalled();
      expect(vi.mocked(query).mock.calls.length).toBeGreaterThan(0);

      // 停止所有同步
      syncManagers.forEach((manager, index) => {
        manager.stopSync(`test-instance-${index}`);
      });
    });
  });

  describe('数据清理', () => {
    it('应该正确清理过期数据', async () => {
      const deletedFeeds: string[] = [];

      vi.mocked(query).mockImplementation(async (sql: string) => {
        if (sql.includes('DELETE FROM unified_price_feeds')) {
          deletedFeeds.push('feeds');
          return {
            rows: [],
            rowCount: 100,
            command: 'DELETE',
            oid: 0,
            fields: [],
          };
        }

        if (sql.includes('DELETE FROM unified_price_updates')) {
          deletedFeeds.push('updates');
          return {
            rows: [],
            rowCount: 50,
            command: 'DELETE',
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

      const { createSyncManager } = await import('@/lib/shared');

      const syncExports = createSyncManager(
        {
          protocol: 'chainlink',
          syncConfig: {
            dataRetentionDays: 30,
          },
        },
        vi.fn(),
        vi.fn(),
      );

      await syncExports.cleanupData();

      // 验证清理了两种数据
      expect(deletedFeeds).toContain('feeds');
      expect(deletedFeeds).toContain('updates');
    });
  });

  describe('并发控制', () => {
    it('应该限制并发请求数量', async () => {
      let currentConcurrent = 0;
      let maxConcurrent = 0;

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

      const { createSyncManager } = await import('@/lib/shared');

      const mockClientFactory = vi.fn(() => {
        return {
          getBlockNumber: vi.fn().mockImplementation(async () => {
            currentConcurrent++;
            maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
            await new Promise((resolve) => setTimeout(resolve, 10));
            currentConcurrent--;
            return 12345678n;
          }),
          getPriceForSymbol: vi.fn().mockResolvedValue({
            id: 'test',
            price: 3500,
          }),
        };
      });

      const mockSymbolProvider = vi.fn(() => Array.from({ length: 20 }, (_, i) => `TOKEN${i}/USD`));

      const syncExports = createSyncManager(
        {
          protocol: 'chainlink',
          syncConfig: {
            maxConcurrency: 5,
          },
        },
        mockClientFactory,
        mockSymbolProvider,
      );

      await syncExports.startSync('test-instance');
      syncExports.stopSync('test-instance');

      // 验证并发被限制
      expect(maxConcurrent).toBeLessThanOrEqual(5);
    });
  });
});
