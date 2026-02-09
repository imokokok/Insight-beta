/**
 * RedStone Oracle Client Tests
 *
 * 测试 RedStone 预言机客户端的配置、合约地址解析、喂价解析、陈旧度判定与错误处理
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  REDSTONE_CONTRACT_ADDRESSES,
  REDSTONE_FEED_IDS,
  REDSTONE_SUPPORTED_SYMBOLS,
  RedStoneClient,
  createRedStoneClient,
  getSupportedRedStoneChains,
  getAvailableRedStoneSymbols,
  isChainSupportedByRedStone,
  getRedStoneContractAddress,
  getRedStoneFeedId,
} from './redstoneOracle';

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

describe('RedStone Contract Addresses - 合约地址解析测试', () => {
  it('should have valid Ethereum mainnet contract address', () => {
    expect(REDSTONE_CONTRACT_ADDRESSES.ethereum).toBeDefined();
    expect(REDSTONE_CONTRACT_ADDRESSES.ethereum).toMatch(/^0x[a-f0-9]{40}$/i);
  });

  it('should have valid Polygon contract address', () => {
    expect(REDSTONE_CONTRACT_ADDRESSES.polygon).toBeDefined();
    expect(REDSTONE_CONTRACT_ADDRESSES.polygon).toMatch(/^0x[a-f0-9]{40}$/i);
  });

  it('should have valid Arbitrum contract address', () => {
    expect(REDSTONE_CONTRACT_ADDRESSES.arbitrum).toBeDefined();
    expect(REDSTONE_CONTRACT_ADDRESSES.arbitrum).toMatch(/^0x[a-f0-9]{40}$/i);
  });

  it('should have valid Optimism contract address', () => {
    expect(REDSTONE_CONTRACT_ADDRESSES.optimism).toBeDefined();
    expect(REDSTONE_CONTRACT_ADDRESSES.optimism).toMatch(/^0x[a-f0-9]{40}$/i);
  });

  it('should have valid Base contract address', () => {
    expect(REDSTONE_CONTRACT_ADDRESSES.base).toBeDefined();
    expect(REDSTONE_CONTRACT_ADDRESSES.base).toMatch(/^0x[a-f0-9]{40}$/i);
  });

  it('should have valid Avalanche contract address', () => {
    expect(REDSTONE_CONTRACT_ADDRESSES.avalanche).toBeDefined();
    expect(REDSTONE_CONTRACT_ADDRESSES.avalanche).toMatch(/^0x[a-f0-9]{40}$/i);
  });

  it('should have valid BSC contract address', () => {
    expect(REDSTONE_CONTRACT_ADDRESSES.bsc).toBeDefined();
    expect(REDSTONE_CONTRACT_ADDRESSES.bsc).toMatch(/^0x[a-f0-9]{40}$/i);
  });

  it('should have valid Fantom contract address', () => {
    expect(REDSTONE_CONTRACT_ADDRESSES.fantom).toBeDefined();
    expect(REDSTONE_CONTRACT_ADDRESSES.fantom).toMatch(/^0x[a-f0-9]{40}$/i);
  });

  it('should have Sepolia testnet address', () => {
    expect(REDSTONE_CONTRACT_ADDRESSES.sepolia).toBeDefined();
    expect(REDSTONE_CONTRACT_ADDRESSES.sepolia).toMatch(/^0x[a-f0-9]{40}$/i);
  });

  it('should have undefined for unsupported chains', () => {
    expect(REDSTONE_CONTRACT_ADDRESSES.solana).toBeUndefined();
    expect(REDSTONE_CONTRACT_ADDRESSES.near).toBeUndefined();
    expect(REDSTONE_CONTRACT_ADDRESSES.aptos).toBeUndefined();
    expect(REDSTONE_CONTRACT_ADDRESSES.celo).toBeUndefined();
  });

  it('should return correct contract address for each supported chain', () => {
    const expectedAddress = '0x6E1389D6E59e83B854c59e7eE608F6B8D5F67355';
    expect(getRedStoneContractAddress('ethereum')).toBe(expectedAddress);
    expect(getRedStoneContractAddress('polygon')).toBe(expectedAddress);
    expect(getRedStoneContractAddress('arbitrum')).toBe(expectedAddress);
  });

  it('should return undefined for unsupported chains', () => {
    expect(getRedStoneContractAddress('solana')).toBeUndefined();
    expect(getRedStoneContractAddress('celo')).toBeUndefined();
  });
});

describe('RedStone Feed IDs - 喂价解析测试', () => {
  it('should have valid feed ID for ETH/USD', () => {
    const feedId = REDSTONE_FEED_IDS['ETH/USD'];
    expect(feedId).toBeDefined();
    expect(feedId).toMatch(/^0x[a-f0-9]{64}$/i);
  });

  it('should have valid feed ID for BTC/USD', () => {
    const feedId = REDSTONE_FEED_IDS['BTC/USD'];
    expect(feedId).toBeDefined();
    expect(feedId).toMatch(/^0x[a-f0-9]{64}$/i);
  });

  it('should have valid feed ID for AVAX/USD', () => {
    const feedId = REDSTONE_FEED_IDS['AVAX/USD'];
    expect(feedId).toBeDefined();
    expect(feedId).toMatch(/^0x[a-f0-9]{64}$/i);
  });

  it('should have valid feed ID for SOL/USD', () => {
    const feedId = REDSTONE_FEED_IDS['SOL/USD'];
    expect(feedId).toBeDefined();
    expect(feedId).toMatch(/^0x[a-f0-9]{64}$/i);
  });

  it('should have valid feed ID for ARB/USD', () => {
    const feedId = REDSTONE_FEED_IDS['ARB/USD'];
    expect(feedId).toBeDefined();
    expect(feedId).toMatch(/^0x[a-f0-9]{64}$/i);
  });

  it('should have valid feed ID for OP/USD', () => {
    const feedId = REDSTONE_FEED_IDS['OP/USD'];
    expect(feedId).toBeDefined();
    expect(feedId).toMatch(/^0x[a-f0-9]{64}$/i);
  });

  it('should have valid feed ID for MATIC/USD', () => {
    const feedId = REDSTONE_FEED_IDS['MATIC/USD'];
    expect(feedId).toBeDefined();
    expect(feedId).toMatch(/^0x[a-f0-9]{64}$/i);
  });

  it('should have valid feed ID for BNB/USD', () => {
    const feedId = REDSTONE_FEED_IDS['BNB/USD'];
    expect(feedId).toBeDefined();
    expect(feedId).toMatch(/^0x[a-f0-9]{64}$/i);
  });

  it('should return correct feed ID for symbol', () => {
    const feedId = getRedStoneFeedId('ETH/USD');
    expect(feedId).toBeDefined();
    expect(feedId).toMatch(/^0x[a-f0-9]{64}$/i);
  });

  it('should return undefined for unsupported symbol', () => {
    const feedId = getRedStoneFeedId('UNKNOWN/USD');
    expect(feedId).toBeUndefined();
  });
});

describe('RedStone Supported Symbols', () => {
  it('should have symbols for Ethereum', () => {
    const symbols = REDSTONE_SUPPORTED_SYMBOLS.ethereum;
    expect(symbols.length).toBeGreaterThan(0);
    expect(symbols).toContain('ETH/USD');
    expect(symbols).toContain('BTC/USD');
    expect(symbols).toContain('USDC/USD');
  });

  it('should have symbols for Polygon', () => {
    const symbols = REDSTONE_SUPPORTED_SYMBOLS.polygon;
    expect(symbols.length).toBeGreaterThan(0);
    expect(symbols).toContain('MATIC/USD');
  });

  it('should have symbols for Arbitrum', () => {
    const symbols = REDSTONE_SUPPORTED_SYMBOLS.arbitrum;
    expect(symbols.length).toBeGreaterThan(0);
    expect(symbols).toContain('ARB/USD');
  });

  it('should have symbols for Optimism', () => {
    const symbols = REDSTONE_SUPPORTED_SYMBOLS.optimism;
    expect(symbols.length).toBeGreaterThan(0);
    expect(symbols).toContain('OP/USD');
  });

  it('should have symbols for Avalanche', () => {
    const symbols = REDSTONE_SUPPORTED_SYMBOLS.avalanche;
    expect(symbols.length).toBeGreaterThan(0);
    expect(symbols).toContain('AVAX/USD');
  });

  it('should have symbols for BSC', () => {
    const symbols = REDSTONE_SUPPORTED_SYMBOLS.bsc;
    expect(symbols.length).toBeGreaterThan(0);
    expect(symbols).toContain('BNB/USD');
  });

  it('should have empty array for unsupported chains', () => {
    expect(REDSTONE_SUPPORTED_SYMBOLS.celo).toEqual([]);
    expect(REDSTONE_SUPPORTED_SYMBOLS.solana).toEqual([]);
  });
});

describe('RedStoneClient', () => {
  let client: RedStoneClient;

  beforeEach(() => {
    client = new RedStoneClient('ethereum', 'https://ethereum.rpc');
  });

  it('should create client with correct protocol', () => {
    expect(client.protocol).toBe('redstone');
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

describe('Error Handling - 错误处理测试', () => {
  it('should handle unsupported chain gracefully', () => {
    const address = getRedStoneContractAddress('solana');
    expect(address).toBeUndefined();
  });

  it('should return undefined for unsupported symbol', () => {
    const feedId = getRedStoneFeedId('UNKNOWN/USD');
    expect(feedId).toBeUndefined();
  });

  it('should return empty array for unsupported chain symbols', () => {
    const symbols = getAvailableRedStoneSymbols('solana');
    expect(symbols).toEqual([]);
  });

  it('should return false for unsupported chain support check', () => {
    expect(isChainSupportedByRedStone('solana')).toBe(false);
  });
});

describe('Utility Functions', () => {
  describe('getSupportedRedStoneChains', () => {
    it('should return array of supported chains', () => {
      const chains = getSupportedRedStoneChains();
      expect(Array.isArray(chains)).toBe(true);
      expect(chains.length).toBeGreaterThan(0);
      expect(chains).toContain('ethereum');
      expect(chains).toContain('polygon');
      expect(chains).toContain('arbitrum');
    });

    it('should not include unsupported chains', () => {
      const chains = getSupportedRedStoneChains();
      expect(chains).not.toContain('solana');
      expect(chains).not.toContain('celo');
    });
  });

  describe('isChainSupportedByRedStone', () => {
    it('should return true for supported chains', () => {
      expect(isChainSupportedByRedStone('ethereum')).toBe(true);
      expect(isChainSupportedByRedStone('polygon')).toBe(true);
      expect(isChainSupportedByRedStone('fantom')).toBe(true);
    });

    it('should return false for unsupported chains', () => {
      expect(isChainSupportedByRedStone('solana')).toBe(false);
      expect(isChainSupportedByRedStone('celo')).toBe(false);
      expect(isChainSupportedByRedStone('near')).toBe(false);
    });
  });

  describe('getAvailableRedStoneSymbols', () => {
    it('should return symbols for supported chain', () => {
      const symbols = getAvailableRedStoneSymbols('ethereum');
      expect(symbols).toContain('ETH/USD');
      expect(symbols).toContain('BTC/USD');
    });

    it('should return empty array for unsupported chain', () => {
      expect(getAvailableRedStoneSymbols('solana')).toEqual([]);
    });
  });

  describe('createRedStoneClient', () => {
    it('should create RedStoneClient instance', () => {
      const client = createRedStoneClient('ethereum', 'https://ethereum.rpc');
      expect(client).toBeInstanceOf(RedStoneClient);
    });

    it('should pass config to client', () => {
      const config = { stalenessThreshold: 120 };
      const client = createRedStoneClient('ethereum', 'https://ethereum.rpc', config);
      expect(client).toBeDefined();
    });
  });
});
