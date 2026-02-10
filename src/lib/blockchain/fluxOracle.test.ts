/**
 * Flux Oracle Client Tests
 *
 * 测试 Flux 预言机客户端的配置、合约地址解析、喂价解析、陈旧度判定与错误处理
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  FLUX_AGGREGATOR_ADDRESSES,
  FLUX_SUPPORTED_FEEDS,
  FluxClient,
  createFluxClient,
  getSupportedFluxChains,
  getAvailableFluxFeeds,
  isChainSupportedByFlux,
  getFluxAggregatorAddress,
} from './fluxOracle';

// Mock EvmOracleClient and dependencies
vi.mock('@/lib/shared', () => ({
  EvmOracleClient: class MockEvmOracleClient {
    protected chain: string;
    protected protocol: string;
    protected rpcUrl: string;
    protected contractAddress: string | undefined;
    protected publicClient: unknown;
    protected logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    constructor(config: { chain: string; protocol: string; rpcUrl: string }) {
      this.chain = config.chain;
      this.protocol = config.protocol;
      this.rpcUrl = config.rpcUrl;
    }

    protected normalizeSymbol(symbol: string): string {
      return symbol.toUpperCase();
    }
  },
}));

vi.mock('@/lib/shared/errors/ErrorHandler', () => ({
  ErrorHandler: {
    logError: vi.fn(),
  },
  normalizeError: (error: unknown) => ({
    message: error instanceof Error ? error.message : String(error),
  }),
}));

describe('Flux Aggregator Addresses - 合约地址解析测试', () => {
  it('should have valid Ethereum mainnet aggregator addresses', () => {
    const addresses = FLUX_AGGREGATOR_ADDRESSES.ethereum;
    expect(addresses).toBeDefined();
    expect(addresses?.['ETH/USD']).toMatch(/^0x[a-fA-F0-9]+$/i);
    expect(addresses?.['BTC/USD']).toMatch(/^0x[a-fA-F0-9]+$/i);
    expect(addresses?.['LINK/USD']).toMatch(/^0x[a-fA-F0-9]+$/i);
  });

  it('should have valid Polygon aggregator addresses', () => {
    const addresses = FLUX_AGGREGATOR_ADDRESSES.polygon;
    expect(addresses).toBeDefined();
    expect(addresses?.['MATIC/USD']).toMatch(/^0x[a-fA-F0-9]+$/i);
    expect(addresses?.['ETH/USD']).toMatch(/^0x[a-fA-F0-9]+$/i);
  });

  it('should have valid Arbitrum aggregator addresses', () => {
    const addresses = FLUX_AGGREGATOR_ADDRESSES.arbitrum;
    expect(addresses).toBeDefined();
    expect(addresses?.['ARB/USD']).toMatch(/^0x[a-fA-F0-9]+$/i);
  });

  it('should have valid Optimism aggregator addresses', () => {
    const addresses = FLUX_AGGREGATOR_ADDRESSES.optimism;
    expect(addresses).toBeDefined();
    expect(addresses?.['OP/USD']).toMatch(/^0x[a-fA-F0-9]+$/i);
  });

  it('should have valid Avalanche aggregator addresses', () => {
    const addresses = FLUX_AGGREGATOR_ADDRESSES.avalanche;
    expect(addresses).toBeDefined();
    expect(addresses?.['AVAX/USD']).toMatch(/^0x[a-fA-F0-9]+$/i);
  });

  it('should have valid BSC aggregator addresses', () => {
    const addresses = FLUX_AGGREGATOR_ADDRESSES.bsc;
    expect(addresses).toBeDefined();
    expect(addresses?.['BNB/USD']).toMatch(/^0x[a-fA-F0-9]+$/i);
  });

  it('should have valid Fantom aggregator addresses', () => {
    const addresses = FLUX_AGGREGATOR_ADDRESSES.fantom;
    expect(addresses).toBeDefined();
    expect(addresses?.['FTM/USD']).toMatch(/^0x[a-fA-F0-9]+$/i);
  });

  it('should have Sepolia testnet addresses', () => {
    const addresses = FLUX_AGGREGATOR_ADDRESSES.sepolia;
    expect(addresses).toBeDefined();
    expect(addresses?.['ETH/USD']).toMatch(/^0x[a-fA-F0-9]+$/i);
  });

  it('should have undefined for unsupported chains', () => {
    expect(FLUX_AGGREGATOR_ADDRESSES.solana).toBeUndefined();
    expect(FLUX_AGGREGATOR_ADDRESSES.celo).toBeUndefined();
    expect(FLUX_AGGREGATOR_ADDRESSES.near).toBeUndefined();
  });

  it('should return correct aggregator address for symbol', () => {
    const address = getFluxAggregatorAddress('ethereum', 'ETH/USD');
    expect(address).toBeDefined();
    expect(address).toMatch(/^0x[a-fA-F0-9]+$/i);
  });

  it('should return undefined for unsupported symbol', () => {
    const address = getFluxAggregatorAddress('ethereum', 'UNKNOWN/USD');
    expect(address).toBeUndefined();
  });

  it('should return undefined for unsupported chain', () => {
    const address = getFluxAggregatorAddress('solana', 'ETH/USD');
    expect(address).toBeUndefined();
  });
});

describe('Flux Supported Feeds - 喂价解析测试', () => {
  it('should have feeds for Ethereum', () => {
    const feeds = FLUX_SUPPORTED_FEEDS.ethereum;
    expect(feeds.length).toBeGreaterThan(0);
    expect(feeds).toContain('ETH/USD');
    expect(feeds).toContain('BTC/USD');
    expect(feeds).toContain('LINK/USD');
  });

  it('should have feeds for Polygon', () => {
    const feeds = FLUX_SUPPORTED_FEEDS.polygon;
    expect(feeds.length).toBeGreaterThan(0);
    expect(feeds).toContain('MATIC/USD');
  });

  it('should have feeds for Arbitrum', () => {
    const feeds = FLUX_SUPPORTED_FEEDS.arbitrum;
    expect(feeds.length).toBeGreaterThan(0);
    expect(feeds).toContain('ARB/USD');
  });

  it('should have feeds for Optimism', () => {
    const feeds = FLUX_SUPPORTED_FEEDS.optimism;
    expect(feeds.length).toBeGreaterThan(0);
    expect(feeds).toContain('OP/USD');
  });

  it('should have feeds for Avalanche', () => {
    const feeds = FLUX_SUPPORTED_FEEDS.avalanche;
    expect(feeds.length).toBeGreaterThan(0);
    expect(feeds).toContain('AVAX/USD');
  });

  it('should have feeds for BSC', () => {
    const feeds = FLUX_SUPPORTED_FEEDS.bsc;
    expect(feeds.length).toBeGreaterThan(0);
    expect(feeds).toContain('BNB/USD');
  });

  it('should have feeds for Fantom', () => {
    const feeds = FLUX_SUPPORTED_FEEDS.fantom;
    expect(feeds.length).toBeGreaterThan(0);
    expect(feeds).toContain('FTM/USD');
  });

  it('should have empty array for unsupported chains', () => {
    expect(FLUX_SUPPORTED_FEEDS.celo).toEqual([]);
    expect(FLUX_SUPPORTED_FEEDS.solana).toEqual([]);
  });
});

describe('FluxClient', () => {
  let client: FluxClient;

  beforeEach(() => {
    client = new FluxClient('ethereum', 'https://ethereum.rpc');
  });

  it('should create client with correct protocol', () => {
    expect(client.protocol).toBe('flux');
  });

  it('should create client with correct chain', () => {
    expect(client.chain).toBe('ethereum');
  });

  it('should have correct capabilities', () => {
    const capabilities = client.getCapabilities();
    expect(capabilities).toEqual({
      priceFeeds: true,
      assertions: false,
      disputes: false,
      vrf: false,
      customData: false,
      batchQueries: true,
    });
  });
});

describe('Error Handling - 错误处理测试', () => {
  it('should handle unsupported chain gracefully', () => {
    const feeds = getAvailableFluxFeeds('solana');
    expect(feeds).toEqual([]);
  });

  it('should return undefined for non-existent feed address', () => {
    const address = getFluxAggregatorAddress('ethereum', 'NONEXISTENT/USD');
    expect(address).toBeUndefined();
  });

  it('should return false for unsupported chain support check', () => {
    expect(isChainSupportedByFlux('solana')).toBe(false);
  });
});

describe('Utility Functions', () => {
  describe('getSupportedFluxChains', () => {
    it('should return array of supported chains', () => {
      const chains = getSupportedFluxChains();
      expect(Array.isArray(chains)).toBe(true);
      expect(chains.length).toBeGreaterThan(0);
      expect(chains).toContain('ethereum');
      expect(chains).toContain('polygon');
      expect(chains).toContain('arbitrum');
    });

    it('should not include unsupported chains', () => {
      const chains = getSupportedFluxChains();
      expect(chains).not.toContain('solana');
      expect(chains).not.toContain('celo');
    });
  });

  describe('isChainSupportedByFlux', () => {
    it('should return true for supported chains', () => {
      expect(isChainSupportedByFlux('ethereum')).toBe(true);
      expect(isChainSupportedByFlux('polygon')).toBe(true);
      expect(isChainSupportedByFlux('fantom')).toBe(true);
    });

    it('should return false for unsupported chains', () => {
      expect(isChainSupportedByFlux('solana')).toBe(false);
      expect(isChainSupportedByFlux('celo')).toBe(false);
      expect(isChainSupportedByFlux('near')).toBe(false);
    });
  });

  describe('getAvailableFluxFeeds', () => {
    it('should return feeds for supported chain', () => {
      const feeds = getAvailableFluxFeeds('ethereum');
      expect(feeds).toContain('ETH/USD');
      expect(feeds).toContain('BTC/USD');
    });

    it('should return empty array for unsupported chain', () => {
      expect(getAvailableFluxFeeds('solana')).toEqual([]);
    });
  });

  describe('createFluxClient', () => {
    it('should create FluxClient instance', () => {
      const client = createFluxClient('ethereum', 'https://ethereum.rpc');
      expect(client).toBeInstanceOf(FluxClient);
    });

    it('should pass config to client', () => {
      const config = { feedId: 'ETH/USD' };
      const client = createFluxClient('ethereum', 'https://ethereum.rpc', config);
      expect(client).toBeDefined();
    });
  });
});
