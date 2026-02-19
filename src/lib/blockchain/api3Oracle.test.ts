/**
 * API3 Oracle Client Tests
 *
 * 测试 API3 预言机客户端的配置、合约地址解析、Feed ID 解析、签名验证与健康检查
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  API3_CONTRACT_ADDRESSES,
  API3_FEED_IDS,
  API3Client,
  createAPI3Client,
  getAPI3ContractAddress,
  getAvailableAPI3Symbols,
  getDataFeedId,
  getSupportedAPI3Chains,
  isChainSupportedByAPI3,
  feedIdToSymbol,
  symbolToFeedId,
} from './api3Oracle';

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

describe('API3 Oracle Configuration', () => {
  describe('API3_FEED_IDS', () => {
    it('should contain ETH/USD price feed with valid hex format', () => {
      expect(API3_FEED_IDS['ETH/USD']).toBeDefined();
      expect(API3_FEED_IDS['ETH/USD']).toMatch(/^0x[a-f0-9]{64}$/i);
    });

    it('should contain BTC/USD price feed with valid hex format', () => {
      expect(API3_FEED_IDS['BTC/USD']).toBeDefined();
      expect(API3_FEED_IDS['BTC/USD']).toMatch(/^0x[a-f0-9]{64}$/i);
    });

    it('should contain LINK/USD price feed', () => {
      expect(API3_FEED_IDS['LINK/USD']).toBeDefined();
      expect(API3_FEED_IDS['LINK/USD']).toMatch(/^0x[a-f0-9]{64}$/i);
    });

    it('should have valid hex format for all price feeds', () => {
      Object.entries(API3_FEED_IDS).forEach(([symbol, id]) => {
        expect(id, `Price feed ${symbol} should start with 0x`).toMatch(/^0x/i);
        expect(id, `Price feed ${symbol} should have valid hex chars`).toMatch(/^0x[a-f0-9]+$/i);
      });
    });

    it('should have unique price feed IDs', () => {
      const ids = Object.values(API3_FEED_IDS);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should cover major cryptocurrencies', () => {
      const majorCryptos = ['ETH/USD', 'BTC/USD', 'SOL/USD', 'AVAX/USD', 'BNB/USD'];
      majorCryptos.forEach((symbol) => {
        expect(API3_FEED_IDS[symbol], `${symbol} should be supported`).toBeDefined();
      });
    });

    it('should cover major Layer 2 tokens', () => {
      const l2Tokens = ['ARB/USD', 'OP/USD', 'MATIC/USD'];
      l2Tokens.forEach((symbol) => {
        expect(API3_FEED_IDS[symbol], `${symbol} should be supported`).toBeDefined();
      });
    });

    it('should cover major DeFi tokens', () => {
      const defiTokens = ['LINK/USD', 'UNI/USD', 'AAVE/USD'];
      defiTokens.forEach((symbol) => {
        expect(API3_FEED_IDS[symbol], `${symbol} should be supported`).toBeDefined();
      });
    });

    it('should cover stablecoins', () => {
      const stablecoins = ['USDC/USD', 'USDT/USD', 'DAI/USD'];
      stablecoins.forEach((symbol) => {
        expect(API3_FEED_IDS[symbol], `${symbol} should be supported`).toBeDefined();
      });
    });
  });

  describe('API3_CONTRACT_ADDRESSES', () => {
    it('should have valid Ethereum mainnet contract address', () => {
      expect(API3_CONTRACT_ADDRESSES.ethereum).toBeDefined();
      expect(API3_CONTRACT_ADDRESSES.ethereum).toMatch(/^0x[a-f0-9]{40}$/i);
    });

    it('should have valid Polygon contract address', () => {
      expect(API3_CONTRACT_ADDRESSES.polygon).toBeDefined();
      expect(API3_CONTRACT_ADDRESSES.polygon).toMatch(/^0x[a-f0-9]{40}$/i);
    });

    it('should have valid Arbitrum contract address', () => {
      expect(API3_CONTRACT_ADDRESSES.arbitrum).toBeDefined();
      expect(API3_CONTRACT_ADDRESSES.arbitrum).toMatch(/^0x[a-f0-9]{40}$/i);
    });

    it('should have valid Optimism contract address', () => {
      expect(API3_CONTRACT_ADDRESSES.optimism).toBeDefined();
      expect(API3_CONTRACT_ADDRESSES.optimism).toMatch(/^0x[a-f0-9]{40}$/i);
    });

    it('should have valid Base contract address', () => {
      expect(API3_CONTRACT_ADDRESSES.base).toBeDefined();
      expect(API3_CONTRACT_ADDRESSES.base).toMatch(/^0x[a-f0-9]{40}$/i);
    });

    it('should have valid Avalanche contract address', () => {
      expect(API3_CONTRACT_ADDRESSES.avalanche).toBeDefined();
      expect(API3_CONTRACT_ADDRESSES.avalanche).toMatch(/^0x[a-f0-9]{40}$/i);
    });

    it('should have valid BSC contract address', () => {
      expect(API3_CONTRACT_ADDRESSES.bsc).toBeDefined();
      expect(API3_CONTRACT_ADDRESSES.bsc).toMatch(/^0x[a-f0-9]{40}$/i);
    });

    it('should have undefined for unsupported chains', () => {
      expect(API3_CONTRACT_ADDRESSES.fantom).toBeUndefined();
      expect(API3_CONTRACT_ADDRESSES.celo).toBeUndefined();
      expect(API3_CONTRACT_ADDRESSES.solana).toBeUndefined();
      expect(API3_CONTRACT_ADDRESSES.near).toBeUndefined();
    });

    it('should have valid Ethereum addresses for all supported chains', () => {
      Object.entries(API3_CONTRACT_ADDRESSES).forEach(([chain, addr]) => {
        if (addr) {
          expect(addr, `Chain ${chain} should have valid address`).toMatch(/^0x[a-f0-9]{40}$/i);
        }
      });
    });

    it('should return correct contract address for each supported chain', () => {
      expect(getAPI3ContractAddress('ethereum')).toBe('0x0Be1f1B46e077eD9D5072600Be2aB8eB4e0B1083');
      expect(getAPI3ContractAddress('polygon')).toBe('0x0Be1f1B46e077eD9D5072600Be2aB8eB4e0B1083');
      expect(getAPI3ContractAddress('arbitrum')).toBe('0x0Be1f1B46e077eD9D5072600Be2aB8eB4e0B1083');
    });

    it('should return undefined for unsupported chains', () => {
      expect(getAPI3ContractAddress('solana')).toBeUndefined();
      expect(getAPI3ContractAddress('near')).toBeUndefined();
      expect(getAPI3ContractAddress('fantom')).toBeUndefined();
    });
  });
});

describe('API3Client', () => {
  let client: API3Client;

  beforeEach(() => {
    client = new API3Client('ethereum', 'https://ethereum.rpc');
  });

  describe('Client Initialization', () => {
    it('should create client with correct protocol', () => {
      expect(client.protocol).toBe('api3');
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
        customData: true,
        batchQueries: true,
      });
    });
  });

  describe('Feed ID Resolution', () => {
    it('should resolve feed ID for ETH/USD', () => {
      const feedId = getDataFeedId('ETH/USD');
      expect(feedId).toBeDefined();
      expect(feedId).toMatch(/^0x[a-f0-9]{64}$/i);
    });

    it('should resolve feed ID for BTC/USD', () => {
      const feedId = getDataFeedId('BTC/USD');
      expect(feedId).toBeDefined();
      expect(feedId).toMatch(/^0x[a-f0-9]{64}$/i);
    });

    it('should return undefined for unsupported symbol', () => {
      const feedId = getDataFeedId('UNKNOWN/USD');
      expect(feedId).toBeUndefined();
    });
  });

  describe('Signed Data Verification', () => {
    it('should reject zero or negative values', () => {
      const signedData = {
        value: 0n,
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
        signature: '0x1234' as `0x${string}`,
        airnode: '0x1234567890123456789012345678901234567890',
        templateId: '0x1234' as `0x${string}`,
      };
      expect(client.verifySignedData(signedData)).toBe(false);
    });

    it('should reject old timestamps', () => {
      const oldTimestamp = BigInt(Math.floor(Date.now() / 1000) - 7200);
      const signedData = {
        value: 1000000000000000000n,
        timestamp: oldTimestamp,
        signature: '0x1234' as `0x${string}`,
        airnode: '0x1234567890123456789012345678901234567890',
        templateId: '0x1234' as `0x${string}`,
      };
      expect(client.verifySignedData(signedData)).toBe(false);
    });

    it('should accept valid signed data', () => {
      const validTimestamp = BigInt(Math.floor(Date.now() / 1000) - 60);
      const signedData = {
        value: 1000000000000000000n,
        timestamp: validTimestamp,
        signature: '0x1234' as `0x${string}`,
        airnode: '0x1234567890123456789012345678901234567890',
        templateId: '0x1234' as `0x${string}`,
      };
      expect(client.verifySignedData(signedData)).toBe(true);
    });
  });
});

describe('API3 Utility Functions', () => {
  describe('getAvailableAPI3Symbols', () => {
    it('should return array of available symbols', () => {
      const symbols = getAvailableAPI3Symbols();
      expect(Array.isArray(symbols)).toBe(true);
      expect(symbols.length).toBeGreaterThan(0);
      expect(symbols).toContain('ETH/USD');
      expect(symbols).toContain('BTC/USD');
    });
  });

  describe('getSupportedAPI3Chains', () => {
    it('should return array of supported chains', () => {
      const chains = getSupportedAPI3Chains();
      expect(Array.isArray(chains)).toBe(true);
      expect(chains.length).toBeGreaterThan(0);
      expect(chains).toContain('ethereum');
      expect(chains).toContain('polygon');
      expect(chains).toContain('arbitrum');
    });

    it('should not include unsupported chains', () => {
      const chains = getSupportedAPI3Chains();
      expect(chains).not.toContain('solana');
      expect(chains).not.toContain('near');
      expect(chains).not.toContain('fantom');
    });
  });

  describe('isChainSupportedByAPI3', () => {
    it('should return true for supported chains', () => {
      expect(isChainSupportedByAPI3('ethereum')).toBe(true);
      expect(isChainSupportedByAPI3('polygon')).toBe(true);
      expect(isChainSupportedByAPI3('arbitrum')).toBe(true);
      expect(isChainSupportedByAPI3('optimism')).toBe(true);
      expect(isChainSupportedByAPI3('base')).toBe(true);
    });

    it('should return false for unsupported chains', () => {
      expect(isChainSupportedByAPI3('solana')).toBe(false);
      expect(isChainSupportedByAPI3('near')).toBe(false);
      expect(isChainSupportedByAPI3('fantom')).toBe(false);
    });
  });

  describe('createAPI3Client', () => {
    it('should create API3Client instance', () => {
      const client = createAPI3Client('ethereum', 'https://ethereum.rpc');
      expect(client).toBeInstanceOf(API3Client);
    });

    it('should pass config to client', () => {
      const config = { stalenessThreshold: 120, oevEnabled: true };
      const client = createAPI3Client('ethereum', 'https://ethereum.rpc', config);
      expect(client).toBeDefined();
    });
  });

  describe('symbolToFeedId', () => {
    it('should convert symbol to feed ID format', () => {
      const feedId = symbolToFeedId('ETH/USD');
      expect(feedId).toMatch(/^0x[a-f0-9]{64}$/i);
    });

    it('should produce consistent results', () => {
      const feedId1 = symbolToFeedId('BTC/USD');
      const feedId2 = symbolToFeedId('BTC/USD');
      expect(feedId1).toBe(feedId2);
    });
  });

  describe('feedIdToSymbol', () => {
    it('should parse symbol from feed ID', () => {
      const feedId = API3_FEED_IDS['ETH/USD'];
      const symbol = feedIdToSymbol(feedId!);
      expect(symbol).toBe('ETH/USD');
    });

    it('should handle BTC/USD feed ID', () => {
      const feedId = API3_FEED_IDS['BTC/USD'];
      const symbol = feedIdToSymbol(feedId!);
      expect(symbol).toBe('BTC/USD');
    });
  });
});

describe('API3 Error Handling', () => {
  describe('Contract Address Resolution Errors', () => {
    it('should handle unsupported chain gracefully', () => {
      const address = getAPI3ContractAddress('solana');
      expect(address).toBeUndefined();
    });

    it('should handle undefined chain parameter', () => {
      // @ts-expect-error Testing invalid input
      const address = getAPI3ContractAddress(undefined);
      expect(address).toBeUndefined();
    });
  });

  describe('Feed ID Resolution Errors', () => {
    it('should return undefined for invalid symbol format', () => {
      const feedId = getDataFeedId('INVALID');
      expect(feedId).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const feedId = getDataFeedId('');
      expect(feedId).toBeUndefined();
    });
  });

  describe('Client Creation Error Scenarios', () => {
    it('should create client even with empty RPC URL', () => {
      const client = new API3Client('ethereum', '');
      expect(client).toBeDefined();
      expect(client.chain).toBe('ethereum');
    });

    it('should create client with unsupported chain', () => {
      // @ts-expect-error Testing unsupported chain
      const client = new API3Client('unsupported', 'https://rpc.url');
      expect(client).toBeDefined();
    });
  });
});
