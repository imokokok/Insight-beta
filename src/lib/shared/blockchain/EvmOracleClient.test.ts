/**
 * EvmOracleClient 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EvmOracleClient, type EvmOracleClientConfig } from './EvmOracleClient';
import type { SupportedChain, UnifiedPriceFeed } from '@/lib/types/unifiedOracleTypes';

// Mock viem
vi.mock('viem', async () => {
  const actual = await vi.importActual('viem');
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      getBlockNumber: vi.fn(),
      readContract: vi.fn(),
    })),
    http: vi.fn(() => ({})),
    formatUnits: vi.fn((value: bigint, decimals: number) => {
      return (Number(value) / Math.pow(10, decimals)).toString();
    }),
  };
});

// Mock chain config
vi.mock('@/lib/blockchain/chainConfig', () => ({
  VIEM_CHAIN_MAP: {
    ethereum: { id: 1, name: 'Ethereum' },
    polygon: { id: 137, name: 'Polygon' },
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// 创建测试用的具体实现类
class TestEvmOracleClient extends EvmOracleClient {
  readonly protocol = 'chainlink' as const;
  readonly chain: SupportedChain = 'ethereum';

  private mockFeedId = 'test-feed-id';
  private mockContractAddress = '0x1234567890123456789012345678901234567890';

  protected resolveContractAddress(): `0x${string}` | undefined {
    return this.mockContractAddress as `0x${string}`;
  }

  protected getFeedId(symbol: string): string | undefined {
    return symbol === 'ETH/USD' ? this.mockFeedId : undefined;
  }

  protected async fetchRawPriceData(_feedId: string): Promise<unknown> {
    return {
      answer: 350000000000n,
      updatedAt: BigInt(Math.floor(Date.now() / 1000) - 60),
      roundId: 1n,
    };
  }

  protected parsePriceFromContract(
    rawData: unknown,
    symbol: string,
    _feedId: string,
  ): UnifiedPriceFeed | null {
    const data = rawData as { answer: bigint; updatedAt: bigint; roundId: bigint };
    return {
      id: `${this.protocol}-${this.chain}-${symbol.toLowerCase().replace('/', '-')}`,
      protocol: this.protocol,
      chain: this.chain,
      symbol,
      baseAsset: 'ETH',
      quoteAsset: 'USD',
      price: Number(data.answer) / 1e8,
      priceRaw: data.answer,
      decimals: 8,
      timestamp: Date.now(),
      blockNumber: Number(data.roundId),
      isStale: false,
      stalenessSeconds: 0,
      confidence: 0.95,
      sources: [this.protocol],
    };
  }

  async fetchAllFeeds(): Promise<UnifiedPriceFeed[]> {
    const feed = await this.fetchPrice('ETH/USD');
    return feed ? [feed] : [];
  }

  getCapabilities() {
    return {
      priceFeeds: true,
      assertions: false,
      disputes: false,
      vrf: false,
      customData: false,
      batchQueries: true,
    };
  }
}

describe('EvmOracleClient', () => {
  let client: TestEvmOracleClient;
  const mockConfig: EvmOracleClientConfig = {
    chain: 'ethereum',
    protocol: 'chainlink',
    rpcUrl: 'https://rpc.example.com',
    timeoutMs: 5000,
    defaultDecimals: 8,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    client = new TestEvmOracleClient(mockConfig);
  });

  describe('构造函数', () => {
    it('应该正确初始化客户端', () => {
      expect(client).toBeDefined();
      expect(client.protocol).toBe('chainlink');
      expect(client.chain).toBe('ethereum');
    });

    it('应该使用默认精度', () => {
      const clientWithDefaultDecimals = new TestEvmOracleClient({
        ...mockConfig,
        defaultDecimals: undefined,
      });
      expect(clientWithDefaultDecimals).toBeDefined();
    });
  });

  describe('getBlockNumber', () => {
    it('应该返回区块号', async () => {
      const { createPublicClient } = await import('viem');
      const mockGetBlockNumber = vi.fn().mockResolvedValue(12345678n);
      vi.mocked(createPublicClient).mockReturnValue({
        getBlockNumber: mockGetBlockNumber,
      } as unknown as ReturnType<typeof createPublicClient>);

      // 重新创建客户端以使用 mock
      const testClient = new TestEvmOracleClient(mockConfig);
      const blockNumber = await testClient.getBlockNumber();

      expect(blockNumber).toBe(12345678n);
      expect(mockGetBlockNumber).toHaveBeenCalled();
    });
  });

  describe('fetchPrice', () => {
    it('应该成功获取价格', async () => {
      const price = await client.fetchPrice('ETH/USD');

      expect(price).not.toBeNull();
      expect(price?.symbol).toBe('ETH/USD');
      expect(price?.protocol).toBe('chainlink');
      expect(price?.price).toBeGreaterThan(0);
    });

    it('当 symbol 不存在时应该返回 null', async () => {
      const price = await client.fetchPrice('UNKNOWN/PAIR');
      expect(price).toBeNull();
    });

    it('应该正确格式化价格', async () => {
      const price = await client.fetchPrice('ETH/USD');
      expect(price?.price).toBe(3500);
    });
  });

  describe('checkHealth', () => {
    it('健康检查应该返回健康状态', async () => {
      const { createPublicClient } = await import('viem');
      vi.mocked(createPublicClient).mockReturnValue({
        getBlockNumber: vi.fn().mockResolvedValue(12345678n),
      } as unknown as ReturnType<typeof createPublicClient>);

      const testClient = new TestEvmOracleClient(mockConfig);
      const health = await testClient.checkHealth();

      expect(health.status).toBe('healthy');
      expect(health.latency).toBeGreaterThanOrEqual(0);
    });

    it('当 RPC 失败时应该返回不健康状态', async () => {
      const { createPublicClient } = await import('viem');
      vi.mocked(createPublicClient).mockReturnValue({
        getBlockNumber: vi.fn().mockRejectedValue(new Error('RPC Error')),
      } as unknown as ReturnType<typeof createPublicClient>);

      const testClient = new TestEvmOracleClient(mockConfig);
      const health = await testClient.checkHealth();

      expect(health.status).toBe('unhealthy');
      expect(health.issues).toBeDefined();
      expect(health.issues?.length).toBeGreaterThan(0);
    });
  });

  describe('formatPrice', () => {
    it('应该根据精度正确格式化价格', () => {
      const rawPrice = 350000000000n;
      const formatted = (
        client as unknown as { formatPrice: (value: bigint, decimals: number) => number }
      ).formatPrice(rawPrice, 8);
      expect(formatted).toBe(3500);
    });

    it('应该处理不同精度', () => {
      const rawPrice = 3500000000000000000000n;
      const formatted = (
        client as unknown as { formatPrice: (value: bigint, decimals: number) => number }
      ).formatPrice(rawPrice, 18);
      expect(formatted).toBe(3500);
    });
  });

  describe('isPriceStale', () => {
    it('当价格在阈值内时应该返回 false', () => {
      const now = Math.floor(Date.now() / 1000);
      const updatedAt = BigInt(now - 60); // 1分钟前
      const isStale = (
        client as unknown as { isPriceStale: (updatedAt: bigint, threshold: number) => boolean }
      ).isPriceStale(updatedAt, 300);
      expect(isStale).toBe(false);
    });

    it('当价格超过阈值时应该返回 true', () => {
      const now = Math.floor(Date.now() / 1000);
      const updatedAt = BigInt(now - 400); // 超过5分钟
      const isStale = (
        client as unknown as { isPriceStale: (updatedAt: bigint, threshold: number) => boolean }
      ).isPriceStale(updatedAt, 300);
      expect(isStale).toBe(true);
    });
  });

  describe('calculateStalenessSeconds', () => {
    it('应该正确计算陈旧秒数', () => {
      const now = Math.floor(Date.now() / 1000);
      const updatedAt = BigInt(now - 120); // 2分钟前
      const staleness = (
        client as unknown as { calculateStalenessSeconds: (updatedAt: bigint) => number }
      ).calculateStalenessSeconds(updatedAt);
      expect(staleness).toBeGreaterThanOrEqual(120);
      expect(staleness).toBeLessThanOrEqual(125); // 允许一些误差
    });

    it('不应该返回负数', () => {
      const now = Math.floor(Date.now() / 1000);
      const updatedAt = BigInt(now + 100); // 未来时间
      const staleness = (
        client as unknown as { calculateStalenessSeconds: (updatedAt: bigint) => number }
      ).calculateStalenessSeconds(updatedAt);
      expect(staleness).toBe(0);
    });
  });

  describe('generateFeedId', () => {
    it('应该生成正确的 feed ID', () => {
      const feedId = (
        client as unknown as { generateFeedId: (symbol: string, chain: SupportedChain) => string }
      ).generateFeedId('BTC/USD', 'ethereum');
      expect(feedId).toBe('chainlink-ethereum-btc-usd');
    });

    it('应该处理小写 symbol', () => {
      const feedId = (
        client as unknown as { generateFeedId: (symbol: string, chain: SupportedChain) => string }
      ).generateFeedId('eth/usd', 'polygon');
      expect(feedId).toBe('chainlink-polygon-eth-usd');
    });
  });

  describe('getCapabilities', () => {
    it('应该返回正确的能力配置', () => {
      const capabilities = client.getCapabilities();
      expect(capabilities.priceFeeds).toBe(true);
      expect(capabilities.assertions).toBe(false);
      expect(capabilities.batchQueries).toBe(true);
    });
  });

  describe('继承 BaseOracleClient 的功能', () => {
    it('应该支持 getPrice 方法', async () => {
      const price = await client.getPrice('ETH/USD');
      expect(price).not.toBeNull();
      expect(price?.symbol).toBe('ETH/USD');
    });

    it('应该支持 healthCheck 方法', async () => {
      const { createPublicClient } = await import('viem');
      vi.mocked(createPublicClient).mockReturnValue({
        getBlockNumber: vi.fn().mockResolvedValue(12345678n),
      } as unknown as ReturnType<typeof createPublicClient>);

      const testClient = new TestEvmOracleClient(mockConfig);
      const health = await testClient.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.lastUpdate).toBeDefined();
    });

    it('应该支持 destroy 方法', async () => {
      await expect(client.destroy()).resolves.not.toThrow();
    });
  });
});
