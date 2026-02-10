/**
 * Switchboard Oracle Client Tests
 *
 * 测试 Switchboard 预言机客户端的配置、账户地址解析、喂价解析、陈旧度判定与错误处理
 */

import { describe, it, expect, vi } from 'vitest';
import { PublicKey } from '@solana/web3.js';

import {
  SWITCHBOARD_SOLANA_FEED_IDS,
  SWITCHBOARD_PROGRAM_ID,
  getSwitchboardFeedId,
  getAvailableSwitchboardSymbols,
  isSwitchboardSymbolSupported,
  isChainSupportedBySwitchboard,
  getSupportedSwitchboardChains,
} from '@/lib/config/switchboardPriceFeeds';

import {
  createSwitchboardClient,
  getSupportedSwitchboardChains as getClientSupportedChains,
  getAvailableSymbols,
  isChainSupported,
  isSymbolSupported,
} from './switchboardOracle';

// Mock SolanaOracleClient
vi.mock('@/lib/shared/blockchain/SolanaOracleClient', () => ({
  SolanaOracleClient: class MockSolanaOracleClient {
    protected chain: string;
    protected protocol: string;
    protected rpcUrl: string;
    protected connection: unknown;
    protected programId: PublicKey | undefined;
    protected defaultDecimals: number;
    protected commitment: string;
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
      this.defaultDecimals = 8;
      this.commitment = 'confirmed';
    }

    protected normalizeSymbol(symbol: string): string {
      return symbol.toUpperCase().replace(/-/g, '/');
    }

    protected formatPrice(rawPrice: bigint, decimals: number): number {
      return Number(rawPrice) / Math.pow(10, decimals);
    }

    protected calculateStalenessSeconds(updatedAt: bigint | number): number {
      const now = Math.floor(Date.now() / 1000);
      return Math.max(0, now - Number(updatedAt));
    }

    protected generateFeedId(symbol: string, chain: string): string {
      return `${this.protocol}-${chain}-${symbol.toLowerCase().replace('/', '-')}`;
    }

    protected async getAccountInfo(_publicKey: PublicKey) {
      return {
        data: Buffer.alloc(256),
        owner: PublicKey.default,
        lamports: 1000000,
      };
    }
  },
}));

vi.mock('@/lib/errors', () => ({
  ErrorHandler: {
    logError: vi.fn(),
    createPriceFetchError: (error: unknown, _protocol: string, _chain: string, symbol: string) =>
      new Error(`Failed to fetch price for ${symbol}: ${error}`),
  },
  normalizeError: (error: unknown) => ({
    message: error instanceof Error ? error.message : String(error),
  }),
}));

vi.mock('@/lib/config/constants', () => ({
  DEFAULT_STALENESS_THRESHOLDS: {
    SWITCHBOARD: 300,
    PYTH: 60,
    CHAINLINK: 3600,
  },
}));

describe('Switchboard Configuration - 配置测试', () => {
  it('should have valid Solana mainnet program ID', () => {
    expect(SWITCHBOARD_PROGRAM_ID.mainnet).toBeDefined();
    expect(SWITCHBOARD_PROGRAM_ID.mainnet).toBe('SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f');
  });

  it('should have valid devnet program ID', () => {
    expect(SWITCHBOARD_PROGRAM_ID.devnet).toBeDefined();
    expect(SWITCHBOARD_PROGRAM_ID.devnet).toBe('SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f');
  });

  it('should have feed IDs for major trading pairs', () => {
    expect(SWITCHBOARD_SOLANA_FEED_IDS['SOL/USD']).toBeDefined();
    expect(SWITCHBOARD_SOLANA_FEED_IDS['BTC/USD']).toBeDefined();
    expect(SWITCHBOARD_SOLANA_FEED_IDS['ETH/USD']).toBeDefined();
  });

  it('should return valid PublicKey for supported symbols', () => {
    const feedId = getSwitchboardFeedId('SOL/USD');
    expect(feedId).toBeDefined();
    expect(feedId).toBeInstanceOf(PublicKey);
  });

  it('should return undefined for unsupported symbols', () => {
    const feedId = getSwitchboardFeedId('UNKNOWN/USD');
    expect(feedId).toBeUndefined();
  });

  it('should return all available symbols', () => {
    const symbols = getAvailableSwitchboardSymbols();
    expect(symbols.length).toBeGreaterThan(0);
    expect(symbols).toContain('SOL/USD');
    expect(symbols).toContain('BTC/USD');
    expect(symbols).toContain('ETH/USD');
  });

  it('should correctly check if symbol is supported', () => {
    expect(isSwitchboardSymbolSupported('SOL/USD')).toBe(true);
    expect(isSwitchboardSymbolSupported('sol/usd')).toBe(true);
    expect(isSwitchboardSymbolSupported('UNKNOWN/USD')).toBe(false);
  });

  it('should correctly check if chain is supported', () => {
    // Note: isChainSupportedBySwitchboard checks CONTRACT_ADDRESSES, which only includes EVM chains
    // Solana uses PROGRAM_ID instead
    expect(isChainSupportedBySwitchboard('ethereum')).toBe(true);
    expect(isChainSupportedBySwitchboard('polygon')).toBe(true);
    expect(isChainSupportedBySwitchboard('arbitrum')).toBe(true);
    expect(isChainSupportedBySwitchboard('fantom')).toBe(false);
    expect(isChainSupportedBySwitchboard('solana')).toBe(false); // Solana uses program ID, not contract address
  });

  it('should return supported chains', () => {
    const chains = getSupportedSwitchboardChains();
    // Only EVM chains with contract addresses are returned
    expect(chains).toContain('ethereum');
    expect(chains).toContain('polygon');
    expect(chains).toContain('arbitrum');
    // Solana is not included because it uses program ID
  });
});

describe('Switchboard Client - 客户端测试', () => {
  it('should create client with default config', () => {
    const client = createSwitchboardClient('solana', 'https://api.mainnet-beta.solana.com');
    expect(client).toBeDefined();
    expect(client.protocol).toBe('switchboard');
    expect(client.chain).toBe('solana');
  });

  it('should create client with custom config', () => {
    const client = createSwitchboardClient('solana', 'https://api.mainnet-beta.solana.com', {
      programId: 'SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f',
      stalenessThreshold: 600,
      timeoutMs: 60000,
      commitment: 'finalized',
    });
    expect(client).toBeDefined();
  });

  it('should return correct capabilities', () => {
    const client = createSwitchboardClient('solana', 'https://api.mainnet-beta.solana.com');
    const capabilities = client.getCapabilities();
    expect(capabilities.priceFeeds).toBe(true);
    expect(capabilities.vrf).toBe(true);
    expect(capabilities.batchQueries).toBe(true);
    expect(capabilities.assertions).toBe(false);
    expect(capabilities.disputes).toBe(false);
  });

  it('should return supported chains', () => {
    const chains = getClientSupportedChains();
    expect(chains).toContain('solana');
  });

  it('should return available symbols', () => {
    const symbols = getAvailableSymbols();
    expect(symbols.length).toBeGreaterThan(0);
    expect(symbols).toContain('SOL/USD');
  });

  it('should correctly check chain support', () => {
    expect(isChainSupported('solana')).toBe(true);
    expect(isChainSupported('ethereum')).toBe(false);
  });

  it('should correctly check symbol support', () => {
    expect(isSymbolSupported('SOL/USD')).toBe(true);
    expect(isSymbolSupported('UNKNOWN/USD')).toBe(false);
  });
});

describe('Switchboard Price Parsing - 价格解析测试', () => {
  it('should format price correctly', () => {
    const client = createSwitchboardClient('solana', 'https://api.mainnet-beta.solana.com');
    // Test the formatPrice method through parsePriceFromContract
    const mockData = {
      result: {
        mantissa: BigInt(150000000000),
        scale: 8,
      },
      lastUpdateTimestamp: BigInt(Math.floor(Date.now() / 1000)),
      currentRound: {
        roundId: BigInt(1),
        slot: BigInt(1000),
      },
      jobCount: 5,
      minOracleResults: 3,
      varianceThreshold: {
        mantissa: BigInt(1000000),
        scale: 8,
      },
      queuePubkey: PublicKey.default,
      config: {
        batchSize: 1,
        minUpdateDelaySeconds: 10,
      },
    };

    const feedId = new PublicKey('GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR');
    const price = (
      client as unknown as {
        parsePriceFromContract: (
          data: typeof mockData,
          symbol: string,
          feedId: PublicKey,
        ) => { price: number };
      }
    ).parsePriceFromContract(mockData, 'SOL/USD', feedId);

    expect(price).toBeDefined();
    expect(price.price).toBe(1500);
  });
});

describe('Switchboard Error Handling - 错误处理测试', () => {
  it('should handle invalid program ID gracefully', () => {
    const client = createSwitchboardClient('solana', 'https://api.mainnet-beta.solana.com', {
      programId: 'invalid-program-id',
    });
    expect(client).toBeDefined();
  });

  it('should handle unsupported chain', () => {
    // Switchboard only supports Solana directly
    const chains = getClientSupportedChains();
    expect(chains).not.toContain('ethereum');
  });
});
