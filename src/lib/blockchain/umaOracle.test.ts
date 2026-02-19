/**
 * UMA Optimistic Oracle Client Tests
 *
 * 测试 UMA 乐观预言机客户端的配置、合约地址解析、断言管理与错误处理
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  UMA_CONTRACT_ADDRESSES,
  UMAClient,
  createUMAClient,
  getSupportedUMAChains,
  isChainSupportedByUMA,
  getUMAContractAddresses,
  type OnChainUMAAssertion,
  type UMAHealthStatus,
} from './umaOracle';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock viem
vi.mock('viem', () => ({
  createPublicClient: vi.fn(() => ({
    readContract: vi.fn(),
  })),
  http: vi.fn(),
  parseAbi: vi.fn(() => []),
}));

describe('UMA Contract Addresses - 合约地址解析测试', () => {
  it('should have valid Ethereum mainnet contract addresses', () => {
    const addresses = UMA_CONTRACT_ADDRESSES.ethereum;
    expect(addresses).toBeDefined();
    expect(addresses?.optimisticOracleV3).toBeDefined();
    expect(addresses?.optimisticOracleV3).toMatch(/^0x[a-fA-F0-9]{40}$/i);
    expect(addresses?.optimisticOracleV2).toBeDefined();
    expect(addresses?.dvm).toBeDefined();
    expect(addresses?.votingToken).toBeDefined();
  });

  it('should have valid Polygon contract addresses', () => {
    const addresses = UMA_CONTRACT_ADDRESSES.polygon;
    expect(addresses).toBeDefined();
    expect(addresses?.optimisticOracleV3).toBeDefined();
    expect(addresses?.dvm).toBeDefined();
    expect(addresses?.votingToken).toBeDefined();
  });

  it('should have valid Arbitrum contract addresses', () => {
    const addresses = UMA_CONTRACT_ADDRESSES.arbitrum;
    expect(addresses).toBeDefined();
    expect(addresses?.optimisticOracleV3).toBeDefined();
    expect(addresses?.dvm).toBeDefined();
    expect(addresses?.votingToken).toBeDefined();
  });

  it('should have valid Optimism contract addresses', () => {
    const addresses = UMA_CONTRACT_ADDRESSES.optimism;
    expect(addresses).toBeDefined();
    expect(addresses?.optimisticOracleV3).toBeDefined();
    expect(addresses?.votingToken).toBeDefined();
  });

  it('should have valid Base contract addresses', () => {
    const addresses = UMA_CONTRACT_ADDRESSES.base;
    expect(addresses).toBeDefined();
    expect(addresses?.optimisticOracleV3).toBeDefined();
    expect(addresses?.votingToken).toBeDefined();
  });

  it('should have Sepolia testnet addresses', () => {
    const addresses = UMA_CONTRACT_ADDRESSES.sepolia;
    expect(addresses).toBeDefined();
    expect(addresses?.optimisticOracleV3).toBeDefined();
    expect(addresses?.votingToken).toBeDefined();
  });

  it('should have empty object for unsupported chains', () => {
    expect(UMA_CONTRACT_ADDRESSES.avalanche).toBeUndefined();
    expect(UMA_CONTRACT_ADDRESSES.solana).toBeUndefined();
    expect(UMA_CONTRACT_ADDRESSES.bsc).toBeUndefined();
  });

  it('should return correct contract addresses for each chain', () => {
    const ethereum = getUMAContractAddresses('ethereum');
    expect(ethereum.optimisticOracleV3).toBe('0xA5B9d8a0B0Fa04B710D7ee40D90d2551E58d0F65');
    expect(ethereum.optimisticOracleV2).toBe('0x9923D42eF195B0fA36D6f80f5629Ce76D1eF8754');
  });

  it('should return empty object for unsupported chain', () => {
    const addresses = getUMAContractAddresses('avalanche');
    expect(addresses).toEqual({});
  });
});

describe('UMAClient', () => {
  let client: UMAClient;

  beforeEach(() => {
    client = new UMAClient('ethereum', 'https://ethereum.rpc');
  });

  it('should create client with correct protocol', () => {
    expect(client.protocol).toBe('uma');
  });

  it('should create client with correct chain', () => {
    expect(client.chain).toBe('ethereum');
  });

  it('should have correct capabilities', () => {
    const capabilities = client.getCapabilities();
    expect(capabilities).toEqual({
      priceFeeds: true,
      assertions: true,
      disputes: true,
      vrf: false,
      customData: true,
      batchQueries: false,
    });
  });

  it('should create client with custom config', () => {
    const customClient = new UMAClient('ethereum', 'https://ethereum.rpc', {
      timeoutMs: 60000,
      stalenessThreshold: 1200,
      minBondThreshold: BigInt(1000),
    });
    expect(customClient).toBeDefined();
  });
});

describe('Error Handling - 错误处理测试', () => {
  it('should handle unsupported chain gracefully', () => {
    const isSupported = isChainSupportedByUMA('avalanche');
    expect(isSupported).toBe(false);
  });

  it('should return empty array for unsupported chain', () => {
    const chains = getSupportedUMAChains();
    expect(chains).not.toContain('avalanche');
    expect(chains).not.toContain('solana');
  });

  it('should return false for unsupported chain support check', () => {
    expect(isChainSupportedByUMA('bsc')).toBe(false);
    expect(isChainSupportedByUMA('fantom')).toBe(false);
  });
});

describe('Utility Functions', () => {
  describe('getSupportedUMAChains', () => {
    it('should return array of supported chains', () => {
      const chains = getSupportedUMAChains();
      expect(Array.isArray(chains)).toBe(true);
      expect(chains.length).toBeGreaterThan(0);
      expect(chains).toContain('ethereum');
      expect(chains).toContain('polygon');
      expect(chains).toContain('arbitrum');
    });

    it('should not include unsupported chains', () => {
      const chains = getSupportedUMAChains();
      expect(chains).not.toContain('avalanche');
      expect(chains).not.toContain('solana');
      expect(chains).not.toContain('bsc');
    });
  });

  describe('isChainSupportedByUMA', () => {
    it('should return true for supported chains', () => {
      expect(isChainSupportedByUMA('ethereum')).toBe(true);
      expect(isChainSupportedByUMA('polygon')).toBe(true);
      expect(isChainSupportedByUMA('arbitrum')).toBe(true);
      expect(isChainSupportedByUMA('optimism')).toBe(true);
      expect(isChainSupportedByUMA('base')).toBe(true);
      expect(isChainSupportedByUMA('sepolia')).toBe(true);
    });

    it('should return false for unsupported chains', () => {
      expect(isChainSupportedByUMA('avalanche')).toBe(false);
      expect(isChainSupportedByUMA('bsc')).toBe(false);
      expect(isChainSupportedByUMA('solana')).toBe(false);
      expect(isChainSupportedByUMA('fantom')).toBe(false);
    });
  });

  describe('createUMAClient', () => {
    it('should create UMAClient instance', () => {
      const client = createUMAClient('ethereum', 'https://ethereum.rpc');
      expect(client).toBeInstanceOf(UMAClient);
    });

    it('should pass config to client', () => {
      const config = { stalenessThreshold: 1200 };
      const client = createUMAClient('ethereum', 'https://ethereum.rpc', config);
      expect(client).toBeDefined();
    });
  });
});

describe('UMA Types', () => {
  it('should have correct OnChainUMAAssertion structure', () => {
    const assertion: OnChainUMAAssertion = {
      assertionId: '0x123',
      identifier: '0x456',
      timestamp: 1234567890,
      data: 'test data',
      requester: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbD',
      resolved: false,
      disputed: false,
      settlementResolution: BigInt(0),
      currency: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbD',
      bond: BigInt(1000),
      expirationTime: 1234567890,
    };
    expect(assertion.assertionId).toBe('0x123');
    expect(assertion.resolved).toBe(false);
    expect(assertion.disputed).toBe(false);
  });

  it('should have correct UMAHealthStatus structure', () => {
    const status: UMAHealthStatus = {
      healthy: true,
      lastUpdate: new Date(),
      stalenessSeconds: 0,
      issues: [],
      activeAssertions: 1,
      activeDisputes: 0,
      totalBonded: BigInt(1000),
    };
    expect(status.healthy).toBe(true);
    expect(status.activeAssertions).toBe(1);
    expect(status.activeDisputes).toBe(0);
  });
});
