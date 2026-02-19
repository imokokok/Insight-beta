/**
 * Band Protocol Oracle Client Tests
 *
 * 测试 Band Protocol 预言机客户端的配置、合约地址解析、符号格式化、数据验证与跨链支持
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  BAND_CONTRACT_ADDRESSES,
  BAND_SUPPORTED_SYMBOLS,
  BAND_CHAIN_REST_URLS,
  BandClient,
  createBandClient,
  getAvailableBandSymbols,
  getBandContractAddress,
  getSupportedBandChains,
  isChainSupportedByBand,
  formatSymbolForBand,
  validateBandPriceData,
} from './bandOracle';

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

    protected calculateStalenessSeconds(timestamp: bigint): number {
      const now = Math.floor(Date.now() / 1000);
      return now - Number(timestamp);
    }

    protected async fetchPrice(_symbol: string) {
      return null;
    }
  },
}));

vi.mock('@/lib/errors', () => ({
  ErrorHandler: {
    logError: vi.fn(),
  },
  normalizeError: (error: unknown) => ({
    message: error instanceof Error ? error.message : String(error),
  }),
}));

vi.mock('@/shared/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('./core/types', () => ({
  calculateDataFreshness: (timestamp: Date, threshold: number) => {
    const now = Date.now();
    const stalenessSeconds = Math.floor((now - timestamp.getTime()) / 1000);
    return {
      isStale: stalenessSeconds > threshold,
      stalenessSeconds,
    };
  },
}));

describe('Band Protocol Configuration', () => {
  describe('BAND_CONTRACT_ADDRESSES', () => {
    it('should have valid Ethereum mainnet contract address', () => {
      expect(BAND_CONTRACT_ADDRESSES.ethereum).toBeDefined();
      expect(BAND_CONTRACT_ADDRESSES.ethereum).toMatch(/^0x[a-f0-9]{40}$/i);
    });

    it('should have valid Polygon contract address', () => {
      expect(BAND_CONTRACT_ADDRESSES.polygon).toBeDefined();
      expect(BAND_CONTRACT_ADDRESSES.polygon).toMatch(/^0x[a-f0-9]{40}$/i);
    });

    it('should have valid Arbitrum contract address', () => {
      expect(BAND_CONTRACT_ADDRESSES.arbitrum).toBeDefined();
      expect(BAND_CONTRACT_ADDRESSES.arbitrum).toMatch(/^0x[a-f0-9]{40}$/i);
    });

    it('should have valid Optimism contract address', () => {
      expect(BAND_CONTRACT_ADDRESSES.optimism).toBeDefined();
      expect(BAND_CONTRACT_ADDRESSES.optimism).toMatch(/^0x[a-f0-9]{40}$/i);
    });

    it('should have valid Avalanche contract address', () => {
      expect(BAND_CONTRACT_ADDRESSES.avalanche).toBeDefined();
      expect(BAND_CONTRACT_ADDRESSES.avalanche).toMatch(/^0x[a-f0-9]{40}$/i);
    });

    it('should have valid BSC contract address', () => {
      expect(BAND_CONTRACT_ADDRESSES.bsc).toBeDefined();
      expect(BAND_CONTRACT_ADDRESSES.bsc).toMatch(/^0x[a-f0-9]{40}$/i);
    });

    it('should have valid Fantom contract address', () => {
      expect(BAND_CONTRACT_ADDRESSES.fantom).toBeDefined();
      expect(BAND_CONTRACT_ADDRESSES.fantom).toMatch(/^0x[a-f0-9]{40}$/i);
    });

    it('should have valid Base contract address', () => {
      expect(BAND_CONTRACT_ADDRESSES.base).toBeDefined();
      expect(BAND_CONTRACT_ADDRESSES.base).toMatch(/^0x[a-f0-9]{40}$/i);
    });

    it('should have undefined for unsupported chains', () => {
      expect(BAND_CONTRACT_ADDRESSES.celo).toBeUndefined();
      expect(BAND_CONTRACT_ADDRESSES.gnosis).toBeUndefined();
      expect(BAND_CONTRACT_ADDRESSES.solana).toBeUndefined();
      expect(BAND_CONTRACT_ADDRESSES.near).toBeUndefined();
    });

    it('should have valid Ethereum addresses for all supported chains', () => {
      Object.entries(BAND_CONTRACT_ADDRESSES).forEach(([chain, addr]) => {
        if (addr) {
          expect(addr, `Chain ${chain} should have valid address`).toMatch(/^0x[a-f0-9]{40}$/i);
        }
      });
    });

    it('should return correct contract address for each supported chain', () => {
      expect(getBandContractAddress('ethereum')).toBe('0xDA7a001b254CD22e46d3eAB04d937489c93174C3');
      expect(getBandContractAddress('polygon')).toBe('0x3da0614A56b6f3E8E10e2E7d734A395E7d90Df32');
      expect(getBandContractAddress('bsc')).toBe('0xDA7a001b254CD22e46d3eAB04d937489c93174C3');
    });

    it('should return undefined for unsupported chains', () => {
      expect(getBandContractAddress('solana')).toBeUndefined();
      expect(getBandContractAddress('near')).toBeUndefined();
      expect(getBandContractAddress('celo')).toBeUndefined();
    });
  });

  describe('BAND_SUPPORTED_SYMBOLS', () => {
    it('should have ETH/USD symbol on Ethereum', () => {
      expect(BAND_SUPPORTED_SYMBOLS.ethereum).toContain('ETH/USD');
    });

    it('should have BTC/USD symbol on Ethereum', () => {
      expect(BAND_SUPPORTED_SYMBOLS.ethereum).toContain('BTC/USD');
    });

    it('should have MATIC/USD symbol on Polygon', () => {
      expect(BAND_SUPPORTED_SYMBOLS.polygon).toContain('MATIC/USD');
    });

    it('should have AVAX/USD symbol on Avalanche', () => {
      expect(BAND_SUPPORTED_SYMBOLS.avalanche).toContain('AVAX/USD');
    });

    it('should have BNB/USD symbol on BSC', () => {
      expect(BAND_SUPPORTED_SYMBOLS.bsc).toContain('BNB/USD');
    });

    it('should have ARB/USD symbol on Arbitrum', () => {
      expect(BAND_SUPPORTED_SYMBOLS.arbitrum).toContain('ARB/USD');
    });

    it('should have OP/USD symbol on Optimism', () => {
      expect(BAND_SUPPORTED_SYMBOLS.optimism).toContain('OP/USD');
    });

    it('should have empty array for unsupported chains', () => {
      expect(BAND_SUPPORTED_SYMBOLS.celo).toEqual([]);
      expect(BAND_SUPPORTED_SYMBOLS.solana).toEqual([]);
    });

    it('should have stablecoin symbols on major chains', () => {
      const majorChains = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'bsc'];
      majorChains.forEach((chain) => {
        const symbols = BAND_SUPPORTED_SYMBOLS[chain as keyof typeof BAND_SUPPORTED_SYMBOLS];
        const hasStablecoin = symbols.some(
          (s) => s.includes('USDC') || s.includes('USDT') || s.includes('DAI'),
        );
        expect(hasStablecoin, `${chain} should have stablecoin symbols`).toBe(true);
      });
    });
  });

  describe('BAND_CHAIN_REST_URLS', () => {
    it('should have mainnet REST URL', () => {
      expect(BAND_CHAIN_REST_URLS.mainnet).toBeDefined();
      expect(BAND_CHAIN_REST_URLS.mainnet).toContain('bandchain.org');
    });

    it('should have testnet REST URL', () => {
      expect(BAND_CHAIN_REST_URLS.testnet).toBeDefined();
      expect(BAND_CHAIN_REST_URLS.testnet).toContain('bandchain.org');
    });

    it('should have different URLs for mainnet and testnet', () => {
      expect(BAND_CHAIN_REST_URLS.mainnet).not.toBe(BAND_CHAIN_REST_URLS.testnet);
    });
  });
});

describe('BandClient', () => {
  let client: BandClient;

  beforeEach(() => {
    client = new BandClient('ethereum', 'https://ethereum.rpc');
  });

  describe('Client Initialization', () => {
    it('should create client with correct protocol', () => {
      expect(client.protocol).toBe('band');
    });

    it('should create client with correct chain', () => {
      expect(client.chain).toBe('ethereum');
    });

    it('should have correct capabilities', () => {
      const capabilities = client.getCapabilities();
      expect(capabilities.priceFeeds).toBe(true);
      expect(capabilities.assertions).toBe(false);
      expect(capabilities.disputes).toBe(false);
      expect(capabilities.vrf).toBe(false);
      expect(capabilities.customData).toBe(true);
      expect(capabilities.batchQueries).toBe(true);
    });

    it('should have cosmosSupport disabled by default', () => {
      const capabilities = client.getCapabilities();
      expect(capabilities.cosmosSupport).toBe(false);
    });

    it('should enable cosmosSupport when configured', () => {
      const cosmosClient = new BandClient('ethereum', 'https://ethereum.rpc', {
        enableCosmosSupport: true,
      });
      const capabilities = cosmosClient.getCapabilities();
      expect(capabilities.cosmosSupport).toBe(true);
    });
  });
});

describe('Band Protocol Utility Functions', () => {
  describe('getAvailableBandSymbols', () => {
    it('should return array of available symbols for supported chain', () => {
      const symbols = getAvailableBandSymbols('ethereum');
      expect(Array.isArray(symbols)).toBe(true);
      expect(symbols.length).toBeGreaterThan(0);
      expect(symbols).toContain('ETH/USD');
      expect(symbols).toContain('BTC/USD');
    });

    it('should return empty array for unsupported chain', () => {
      const symbols = getAvailableBandSymbols('solana');
      expect(symbols).toEqual([]);
    });
  });

  describe('getSupportedBandChains', () => {
    it('should return array of supported chains', () => {
      const chains = getSupportedBandChains();
      expect(Array.isArray(chains)).toBe(true);
      expect(chains.length).toBeGreaterThan(0);
      expect(chains).toContain('ethereum');
      expect(chains).toContain('polygon');
      expect(chains).toContain('arbitrum');
    });

    it('should not include unsupported chains', () => {
      const chains = getSupportedBandChains();
      expect(chains).not.toContain('solana');
      expect(chains).not.toContain('near');
      expect(chains).not.toContain('celo');
    });
  });

  describe('isChainSupportedByBand', () => {
    it('should return true for supported chains', () => {
      expect(isChainSupportedByBand('ethereum')).toBe(true);
      expect(isChainSupportedByBand('polygon')).toBe(true);
      expect(isChainSupportedByBand('arbitrum')).toBe(true);
      expect(isChainSupportedByBand('optimism')).toBe(true);
      expect(isChainSupportedByBand('avalanche')).toBe(true);
      expect(isChainSupportedByBand('bsc')).toBe(true);
      expect(isChainSupportedByBand('fantom')).toBe(true);
      expect(isChainSupportedByBand('base')).toBe(true);
    });

    it('should return false for unsupported chains', () => {
      expect(isChainSupportedByBand('solana')).toBe(false);
      expect(isChainSupportedByBand('near')).toBe(false);
      expect(isChainSupportedByBand('celo')).toBe(false);
    });
  });

  describe('createBandClient', () => {
    it('should create BandClient instance', () => {
      const client = createBandClient('ethereum', 'https://ethereum.rpc');
      expect(client).toBeInstanceOf(BandClient);
    });

    it('should pass config to client', () => {
      const config = { stalenessThreshold: 120, enableCosmosSupport: true };
      const client = createBandClient('ethereum', 'https://ethereum.rpc', config);
      expect(client).toBeDefined();
    });
  });

  describe('formatSymbolForBand', () => {
    it('should format ETH/USD symbol correctly', () => {
      const result = formatSymbolForBand('ETH/USD');
      expect(result).toEqual({ base: 'ETH', quote: 'USD' });
    });

    it('should format BTC/USD symbol correctly', () => {
      const result = formatSymbolForBand('BTC/USD');
      expect(result).toEqual({ base: 'BTC', quote: 'USD' });
    });

    it('should uppercase the symbols', () => {
      const result = formatSymbolForBand('eth/usd');
      expect(result).toEqual({ base: 'ETH', quote: 'USD' });
    });

    it('should return null for invalid format', () => {
      expect(formatSymbolForBand('INVALID')).toBeNull();
      expect(formatSymbolForBand('ETHUSD')).toBeNull();
      expect(formatSymbolForBand('')).toBeNull();
    });

    it('should handle empty string', () => {
      expect(formatSymbolForBand('')).toBeNull();
    });
  });

  describe('validateBandPriceData', () => {
    it('should validate correct price data', () => {
      const now = Math.floor(Date.now() / 1000);
      const data = {
        rate: 1000000000n,
        lastUpdatedBase: BigInt(now - 60),
        lastUpdatedQuote: BigInt(now - 60),
      };
      const result = validateBandPriceData(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject zero rate', () => {
      const now = Math.floor(Date.now() / 1000);
      const data = {
        rate: 0n,
        lastUpdatedBase: BigInt(now - 60),
        lastUpdatedQuote: BigInt(now - 60),
      };
      const result = validateBandPriceData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Price rate must be positive');
    });

    it('should reject negative rate', () => {
      const now = Math.floor(Date.now() / 1000);
      const data = {
        rate: -1n,
        lastUpdatedBase: BigInt(now - 60),
        lastUpdatedQuote: BigInt(now - 60),
      };
      const result = validateBandPriceData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Price rate must be positive');
    });

    it('should reject zero base timestamp', () => {
      const data = {
        rate: 1000000000n,
        lastUpdatedBase: 0n,
        lastUpdatedQuote: BigInt(Math.floor(Date.now() / 1000)),
      };
      const result = validateBandPriceData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Base timestamp is zero');
    });

    it('should reject future timestamp', () => {
      const future = Math.floor(Date.now() / 1000) + 3600;
      const data = {
        rate: 1000000000n,
        lastUpdatedBase: BigInt(future),
        lastUpdatedQuote: BigInt(future),
      };
      const result = validateBandPriceData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Base timestamp is in the future');
    });

    it('should collect multiple errors', () => {
      const future = Math.floor(Date.now() / 1000) + 3600;
      const data = {
        rate: 0n,
        lastUpdatedBase: BigInt(future),
        lastUpdatedQuote: BigInt(future),
      };
      const result = validateBandPriceData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('Band Protocol Error Handling', () => {
  describe('Contract Address Resolution Errors', () => {
    it('should handle unsupported chain gracefully', () => {
      const address = getBandContractAddress('solana');
      expect(address).toBeUndefined();
    });

    it('should handle undefined chain parameter', () => {
      // @ts-expect-error Testing invalid input
      const address = getBandContractAddress(undefined);
      expect(address).toBeUndefined();
    });
  });

  describe('Symbol Resolution Errors', () => {
    it('should return empty array for unsupported chain', () => {
      // @ts-expect-error Testing unsupported chain
      const symbols = getAvailableBandSymbols('unsupported');
      expect(symbols).toEqual([]);
    });
  });

  describe('Client Creation Error Scenarios', () => {
    it('should create client even with empty RPC URL', () => {
      const client = new BandClient('ethereum', '');
      expect(client).toBeDefined();
      expect(client.chain).toBe('ethereum');
    });

    it('should create client with unsupported chain', () => {
      // @ts-expect-error Testing unsupported chain
      const client = new BandClient('unsupported', 'https://rpc.url');
      expect(client).toBeDefined();
    });
  });
});
