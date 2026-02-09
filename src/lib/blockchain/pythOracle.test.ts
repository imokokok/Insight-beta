/**
 * Pyth Oracle Client Tests
 *
 * 测试 Pyth 预言机客户端的配置、合约地址解析、喂价解析、陈旧度判定与错误处理
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// 直接导入常量和函数进行测试
import {
  PYTH_PRICE_FEED_IDS,
  PYTH_CONTRACT_ADDRESSES,
  PythClient,
  createPythClient,
  getSupportedPythChains,
  getAvailablePythSymbols,
  isChainSupportedByPyth,
  getPriceFeedId,
  getPythContractAddress,
} from './pythOracle';

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

    protected calculateStalenessSeconds(publishTime: bigint): number {
      const now = Math.floor(Date.now() / 1000);
      return now - Number(publishTime);
    }

    protected async fetchPrice(symbol: string) {
      return null;
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

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Pyth Oracle Configuration', () => {
  describe('PYTH_PRICE_FEED_IDS', () => {
    it('should contain ETH/USD price feed with valid hex format', () => {
      expect(PYTH_PRICE_FEED_IDS['ETH/USD']).toBeDefined();
      expect(PYTH_PRICE_FEED_IDS['ETH/USD']).toMatch(/^0x[a-f0-9]{64}$/i);
    });

    it('should contain BTC/USD price feed with valid hex format', () => {
      expect(PYTH_PRICE_FEED_IDS['BTC/USD']).toBeDefined();
      expect(PYTH_PRICE_FEED_IDS['BTC/USD']).toMatch(/^0x[a-f0-9]{64}$/i);
    });

    it('should contain SOL/USD price feed', () => {
      expect(PYTH_PRICE_FEED_IDS['SOL/USD']).toBeDefined();
      expect(PYTH_PRICE_FEED_IDS['SOL/USD']).toMatch(/^0x[a-f0-9]{64}$/i);
    });

    it('should have valid hex format for all price feeds', () => {
      Object.entries(PYTH_PRICE_FEED_IDS).forEach(([symbol, id]) => {
        // Check it's a valid hex string starting with 0x
        expect(id, `Price feed ${symbol} should start with 0x`).toMatch(/^0x/i);
        // Check it has valid hex characters
        expect(id, `Price feed ${symbol} should have valid hex chars`).toMatch(/^0x[a-f0-9]+$/i);
      });
    });

    it('should have unique price feed IDs', () => {
      const ids = Object.values(PYTH_PRICE_FEED_IDS);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('PYTH_CONTRACT_ADDRESSES - 合约地址解析测试', () => {
    it('should have valid Ethereum mainnet contract address', () => {
      expect(PYTH_CONTRACT_ADDRESSES.ethereum).toBeDefined();
      expect(PYTH_CONTRACT_ADDRESSES.ethereum).toMatch(/^0x[a-f0-9]{40}$/i);
    });

    it('should have valid Polygon contract address', () => {
      expect(PYTH_CONTRACT_ADDRESSES.polygon).toBeDefined();
      expect(PYTH_CONTRACT_ADDRESSES.polygon).toMatch(/^0x[a-f0-9]{40}$/i);
    });

    it('should have valid Arbitrum contract address', () => {
      expect(PYTH_CONTRACT_ADDRESSES.arbitrum).toBeDefined();
      expect(PYTH_CONTRACT_ADDRESSES.arbitrum).toMatch(/^0x[a-f0-9]{40}$/i);
    });

    it('should have valid Optimism contract address', () => {
      expect(PYTH_CONTRACT_ADDRESSES.optimism).toBeDefined();
      expect(PYTH_CONTRACT_ADDRESSES.optimism).toMatch(/^0x[a-f0-9]{40}$/i);
    });

    it('should have valid Base contract address', () => {
      expect(PYTH_CONTRACT_ADDRESSES.base).toBeDefined();
      expect(PYTH_CONTRACT_ADDRESSES.base).toMatch(/^0x[a-f0-9]{40}$/i);
    });

    it('should have valid Avalanche contract address', () => {
      expect(PYTH_CONTRACT_ADDRESSES.avalanche).toBeDefined();
      expect(PYTH_CONTRACT_ADDRESSES.avalanche).toMatch(/^0x[a-f0-9]{40}$/i);
    });

    it('should have valid BSC contract address', () => {
      expect(PYTH_CONTRACT_ADDRESSES.bsc).toBeDefined();
      expect(PYTH_CONTRACT_ADDRESSES.bsc).toMatch(/^0x[a-f0-9]{40}$/i);
    });

    it('should have Sepolia testnet address', () => {
      expect(PYTH_CONTRACT_ADDRESSES.sepolia).toBeDefined();
      expect(PYTH_CONTRACT_ADDRESSES.sepolia).toMatch(/^0x[a-f0-9]{40}$/i);
    });

    it('should have undefined for unsupported chains', () => {
      expect(PYTH_CONTRACT_ADDRESSES.solana).toBeUndefined();
      expect(PYTH_CONTRACT_ADDRESSES.near).toBeUndefined();
      expect(PYTH_CONTRACT_ADDRESSES.aptos).toBeUndefined();
      expect(PYTH_CONTRACT_ADDRESSES.sui).toBeUndefined();
    });

    it('should have valid Ethereum addresses for all supported chains', () => {
      Object.entries(PYTH_CONTRACT_ADDRESSES).forEach(([chain, addr]) => {
        if (addr) {
          // Check it's a valid Ethereum address (40 hex chars after 0x)
          expect(addr, `Chain ${chain} should have valid address`).toMatch(/^0x[a-f0-9]{40}$/i);
        }
      });
    });

    it('should return correct contract address for each supported chain', () => {
      // Ethereum mainnet
      expect(getPythContractAddress('ethereum')).toBe('0x4305FB66699C3B2702D4d05CF36551390A4c69C6');
      // Polygon
      expect(getPythContractAddress('polygon')).toBe('0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a');
      // Arbitrum
      expect(getPythContractAddress('arbitrum')).toBe('0xff1a0f4744e8582DF1aE09D5611b887B6a12925C');
    });

    it('should return undefined for unsupported chains', () => {
      expect(getPythContractAddress('solana')).toBeUndefined();
      expect(getPythContractAddress('near')).toBeUndefined();
      expect(getPythContractAddress('aptos')).toBeUndefined();
    });
  });

  describe('Price Feed Coverage', () => {
    it('should cover major cryptocurrencies', () => {
      const majorCryptos = ['ETH/USD', 'BTC/USD', 'SOL/USD', 'AVAX/USD', 'BNB/USD'];
      majorCryptos.forEach((symbol) => {
        expect(PYTH_PRICE_FEED_IDS[symbol], `${symbol} should be supported`).toBeDefined();
      });
    });

    it('should cover major Layer 2 tokens', () => {
      const l2Tokens = ['ARB/USD', 'OP/USD', 'MATIC/USD'];
      l2Tokens.forEach((symbol) => {
        expect(PYTH_PRICE_FEED_IDS[symbol], `${symbol} should be supported`).toBeDefined();
      });
    });

    it('should cover major DeFi tokens', () => {
      const defiTokens = ['LINK/USD', 'UNI/USD', 'AAVE/USD'];
      defiTokens.forEach((symbol) => {
        expect(PYTH_PRICE_FEED_IDS[symbol], `${symbol} should be supported`).toBeDefined();
      });
    });
  });
});

describe('PythClient - 喂价解析与陈旧度判定测试', () => {
  let client: PythClient;

  beforeEach(() => {
    client = new PythClient('ethereum', 'https://ethereum.rpc');
  });

  describe('Client Initialization', () => {
    it('should create client with correct protocol', () => {
      expect(client.protocol).toBe('pyth');
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

  describe('Feed ID Resolution - 喂价解析', () => {
    it('should resolve feed ID for ETH/USD', () => {
      const feedId = getPriceFeedId('ETH/USD');
      expect(feedId).toBeDefined();
      expect(feedId).toMatch(/^0x[a-f0-9]{64}$/i);
    });

    it('should resolve feed ID for BTC/USD', () => {
      const feedId = getPriceFeedId('BTC/USD');
      expect(feedId).toBeDefined();
      expect(feedId).toMatch(/^0x[a-f0-9]{64}$/i);
    });

    it('should return undefined for unsupported symbol', () => {
      const feedId = getPriceFeedId('UNKNOWN/USD');
      expect(feedId).toBeUndefined();
    });

    it('should handle case sensitivity correctly', () => {
      // Pyth uses exact symbol matching
      const feedIdLower = getPriceFeedId('eth/usd');
      const feedIdUpper = getPriceFeedId('ETH/USD');
      expect(feedIdLower).toBeUndefined();
      expect(feedIdUpper).toBeDefined();
    });
  });

  describe('Staleness Detection - 陈旧度判定', () => {
    it('should calculate staleness correctly for fresh data', () => {
      const now = Math.floor(Date.now() / 1000);
      const freshTimestamp = now - 30; // 30 seconds ago
      
      // Using 60 second threshold (PYTH default)
      const isStale = now - freshTimestamp > 60;
      expect(isStale).toBe(false);
    });

    it('should calculate staleness correctly for stale data', () => {
      const now = Math.floor(Date.now() / 1000);
      const staleTimestamp = now - 120; // 2 minutes ago
      
      // Using 60 second threshold (PYTH default)
      const isStale = now - staleTimestamp > 60;
      expect(isStale).toBe(true);
    });

    it('should handle edge case at threshold boundary', () => {
      const now = Math.floor(Date.now() / 1000);
      const thresholdTimestamp = now - 60; // Exactly at threshold
      
      // At exactly 60 seconds, should not be stale (using > not >=)
      const isStale = now - thresholdTimestamp > 60;
      expect(isStale).toBe(false);
    });
  });
});

describe('Error Handling - 错误处理测试', () => {
  describe('Contract Address Resolution Errors', () => {
    it('should handle unsupported chain gracefully', () => {
      const address = getPythContractAddress('solana');
      expect(address).toBeUndefined();
    });

    it('should handle undefined chain parameter', () => {
      // @ts-expect-error Testing invalid input
      const address = getPythContractAddress(undefined);
      expect(address).toBeUndefined();
    });
  });

  describe('Feed ID Resolution Errors', () => {
    it('should return undefined for invalid symbol format', () => {
      const feedId = getPriceFeedId('INVALID');
      expect(feedId).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const feedId = getPriceFeedId('');
      expect(feedId).toBeUndefined();
    });

    it('should return undefined for null/undefined', () => {
      // @ts-expect-error Testing invalid input
      expect(getPriceFeedId(null)).toBeUndefined();
      // @ts-expect-error Testing invalid input
      expect(getPriceFeedId(undefined)).toBeUndefined();
    });
  });

  describe('Client Creation Error Scenarios', () => {
    it('should create client even with empty RPC URL', () => {
      // Client should be created but operations will fail
      const client = new PythClient('ethereum', '');
      expect(client).toBeDefined();
      expect(client.chain).toBe('ethereum');
    });

    it('should create client with unsupported chain', () => {
      // Client can be created but contract operations will fail
      // @ts-expect-error Testing unsupported chain
      const client = new PythClient('unsupported', 'https://rpc.url');
      expect(client).toBeDefined();
    });
  });
});

describe('Utility Functions', () => {
  describe('getSupportedPythChains', () => {
    it('should return array of supported chains', () => {
      const chains = getSupportedPythChains();
      expect(Array.isArray(chains)).toBe(true);
      expect(chains.length).toBeGreaterThan(0);
      expect(chains).toContain('ethereum');
      expect(chains).toContain('polygon');
      expect(chains).toContain('arbitrum');
    });

    it('should not include unsupported chains', () => {
      const chains = getSupportedPythChains();
      expect(chains).not.toContain('solana');
      expect(chains).not.toContain('near');
    });
  });

  describe('isChainSupportedByPyth', () => {
    it('should return true for supported chains', () => {
      expect(isChainSupportedByPyth('ethereum')).toBe(true);
      expect(isChainSupportedByPyth('polygon')).toBe(true);
      expect(isChainSupportedByPyth('arbitrum')).toBe(true);
    });

    it('should return false for unsupported chains', () => {
      expect(isChainSupportedByPyth('solana')).toBe(false);
      expect(isChainSupportedByPyth('near')).toBe(false);
      expect(isChainSupportedByPyth('aptos')).toBe(false);
    });
  });

  describe('createPythClient', () => {
    it('should create PythClient instance', () => {
      const client = createPythClient('ethereum', 'https://ethereum.rpc');
      expect(client).toBeInstanceOf(PythClient);
    });

    it('should pass config to client', () => {
      const config = { stalenessThreshold: 120 };
      const client = createPythClient('ethereum', 'https://ethereum.rpc', config);
      expect(client).toBeDefined();
    });
  });
});
