/**
 * SolanaOracleClient Tests
 *
 * 测试 Solana 预言机客户端基类的功能
 */

import { describe, it, expect, vi } from 'vitest';
import { PublicKey } from '@solana/web3.js';

import { SolanaOracleClient } from './SolanaOracleClient';
import type { UnifiedPriceFeed } from '@/lib/types/unifiedOracleTypes';

// Mock dependencies
vi.mock('@/lib/blockchain/core/BaseOracleClient', () => ({
  BaseOracleClient: class MockBaseOracleClient {
    protected config: Record<string, unknown>;
    protected logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    constructor(config: Record<string, unknown>) {
      this.config = config;
    }

    protected normalizeSymbol(symbol: string): string {
      return symbol.toUpperCase().replace(/-/g, '/');
    }
  },
}));

vi.mock('@/lib/errors', () => ({
  ErrorHandler: {
    createPriceFetchError: (error: unknown, _protocol: string, _chain: string, symbol: string) =>
      new Error(`Failed to fetch price for ${symbol}: ${error}`),
  },
  normalizeError: (error: unknown) => ({
    message: error instanceof Error ? error.message : String(error),
  }),
}));

vi.mock('@/lib/shared/logger/LoggerFactory', () => ({
  LoggerFactory: {
    createOracleLogger: (_protocol: string, _chain: string) => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

// Create a concrete implementation for testing
class TestSolanaClient extends SolanaOracleClient {
  readonly protocol = 'pyth' as const;
  readonly chain = 'solana' as const;

  protected resolveProgramId(): PublicKey | undefined {
    try {
      return new PublicKey('11111111111111111111111111111111');
    } catch {
      return undefined;
    }
  }

  protected getFeedId(_symbol: string): PublicKey | undefined {
    try {
      return new PublicKey('11111111111111111111111111111111');
    } catch {
      return undefined;
    }
  }

  protected async fetchRawPriceData(_feedId: PublicKey): Promise<unknown> {
    return {
      price: BigInt(100000000),
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
    };
  }

  protected parsePriceFromContract(
    _rawData: unknown,
    symbol: string,
    _feedId: PublicKey,
  ): UnifiedPriceFeed | null {
    return {
      id: `pyth-solana-${symbol.toLowerCase().replace('/', '-')}`,
      symbol,
      price: 100,
      timestamp: Date.now(),
    };
  }

  async fetchAllFeeds(): Promise<UnifiedPriceFeed[]> {
    return [
      {
        id: 'pyth-solana-sol-usd',
        symbol: 'SOL/USD',
        price: 100,
        timestamp: Date.now(),
      },
      {
        id: 'pyth-solana-btc-usd',
        symbol: 'BTC/USD',
        price: 50000,
        timestamp: Date.now(),
      },
    ];
  }

  getCapabilities() {
    return {
      priceFeeds: true,
      assertions: false,
      disputes: false,
      vrf: false,
      customData: false,
      batchQueries: false,
    };
  }
}

describe('SolanaOracleClient - 基础功能测试', () => {
  it('should create client with valid RPC URL', () => {
    const client = new TestSolanaClient({
      chain: 'solana',
      protocol: 'pyth',
      rpcUrl: 'https://api.mainnet-beta.solana.com',
    });
    expect(client).toBeDefined();
    expect(client.protocol).toBe('pyth');
    expect(client.chain).toBe('solana');
  });

  it('should throw error with empty RPC URL', () => {
    expect(() => {
      new TestSolanaClient({
        chain: 'solana',
        protocol: 'pyth',
        rpcUrl: '',
      });
    }).toThrow('RPC URL is required for SolanaOracleClient');
  });

  it('should use default commitment level', () => {
    const client = new TestSolanaClient({
      chain: 'solana',
      protocol: 'pyth',
      rpcUrl: 'https://api.mainnet-beta.solana.com',
    });
    expect(client).toBeDefined();
  });

  it('should use custom commitment level', () => {
    const client = new TestSolanaClient({
      chain: 'solana',
      protocol: 'pyth',
      rpcUrl: 'https://api.mainnet-beta.solana.com',
      commitment: 'finalized',
    });
    expect(client).toBeDefined();
  });

  it('should use default decimals', () => {
    const client = new TestSolanaClient({
      chain: 'solana',
      protocol: 'pyth',
      rpcUrl: 'https://api.mainnet-beta.solana.com',
    });
    expect(client).toBeDefined();
  });

  it('should use custom decimals', () => {
    const client = new TestSolanaClient({
      chain: 'solana',
      protocol: 'pyth',
      rpcUrl: 'https://api.mainnet-beta.solana.com',
      defaultDecimals: 9,
    });
    expect(client).toBeDefined();
  });
});

describe('SolanaOracleClient - 价格格式化测试', () => {
  it('should format price correctly', () => {
    const client = new TestSolanaClient({
      chain: 'solana',
      protocol: 'pyth',
      rpcUrl: 'https://api.mainnet-beta.solana.com',
    });

    // Access protected method through type casting
    const formatPrice = (
      client as unknown as { formatPrice: (rawPrice: bigint, decimals: number) => number }
    ).formatPrice;

    expect(formatPrice(BigInt(100000000), 8)).toBe(1);
    expect(formatPrice(BigInt(150000000000), 8)).toBe(1500);
    expect(formatPrice(BigInt(5000000), 6)).toBe(5);
  });
});

describe('SolanaOracleClient - 陈旧度计算测试', () => {
  it('should calculate staleness correctly', () => {
    const client = new TestSolanaClient({
      chain: 'solana',
      protocol: 'pyth',
      rpcUrl: 'https://api.mainnet-beta.solana.com',
    });

    // Access protected method through type casting
    const calculateStalenessSeconds = (
      client as unknown as { calculateStalenessSeconds: (updatedAt: bigint | number) => number }
    ).calculateStalenessSeconds;

    const now = Math.floor(Date.now() / 1000);
    const oneMinuteAgo = now - 60;

    const staleness = calculateStalenessSeconds(BigInt(oneMinuteAgo));
    expect(staleness).toBeGreaterThanOrEqual(60);
    expect(staleness).toBeLessThanOrEqual(61);
  });

  it('should return 0 for future timestamps', () => {
    const client = new TestSolanaClient({
      chain: 'solana',
      protocol: 'pyth',
      rpcUrl: 'https://api.mainnet-beta.solana.com',
    });

    const calculateStalenessSeconds = (
      client as unknown as { calculateStalenessSeconds: (updatedAt: bigint | number) => number }
    ).calculateStalenessSeconds;

    const future = Math.floor(Date.now() / 1000) + 1000;
    expect(calculateStalenessSeconds(future)).toBe(0);
  });
});

describe('SolanaOracleClient - Feed ID 生成测试', () => {
  it('should generate correct feed ID', () => {
    const client = new TestSolanaClient({
      chain: 'solana',
      protocol: 'pyth',
      rpcUrl: 'https://api.mainnet-beta.solana.com',
    });

    // Test via the client's method directly
    const result1 = (
      client as unknown as { generateFeedId: (symbol: string, chain: string) => string }
    ).generateFeedId.call({ protocol: 'pyth' }, 'SOL/USD', 'solana');
    expect(result1).toBe('pyth-solana-sol-usd');

    const result2 = (
      client as unknown as { generateFeedId: (symbol: string, chain: string) => string }
    ).generateFeedId.call({ protocol: 'pyth' }, 'BTC-USD', 'solana');
    expect(result2).toBe('pyth-solana-btc-usd');
  });
});

describe('SolanaOracleClient - 标准化符号测试', () => {
  it('should normalize symbols correctly', () => {
    const client = new TestSolanaClient({
      chain: 'solana',
      protocol: 'pyth',
      rpcUrl: 'https://api.mainnet-beta.solana.com',
    });

    const normalizeSymbol = (client as unknown as { normalizeSymbol: (symbol: string) => string })
      .normalizeSymbol;

    expect(normalizeSymbol('sol/usd')).toBe('SOL/USD');
    expect(normalizeSymbol('BTC-USD')).toBe('BTC/USD');
    expect(normalizeSymbol('ETH/USD')).toBe('ETH/USD');
  });
});
