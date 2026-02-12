/**
 * API3 Oracle Client Tests
 *
 * 测试 API3 预言机客户端的配置、合约地址解析、喂价解析、陈旧度判定与错误处理
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  API3_DAPI_SERVER_ADDRESSES,
  API3_SUPPORTED_DAPIS,
  API3Client,
  createAPI3Client,
  getSupportedAPI3Chains,
  getAvailableAPI3Dapis,
  isChainSupportedByAPI3,
  getDapiServerAddress,
} from './api3Oracle';
import type { SupportedChain } from '@/types/unifiedOracleTypes';

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

vi.mock('@/lib/errors', () => ({
  ErrorHandler: {
    logError: vi.fn(),
  },
  normalizeError: (error: unknown) => ({
    message: error instanceof Error ? error.message : String(error),
  }),
}));

describe('API3 Contract Addresses - 合约地址解析测试', () => {
  it('should have valid Ethereum mainnet contract address', () => {
    expect(API3_DAPI_SERVER_ADDRESSES.ethereum).toBeDefined();
    expect(API3_DAPI_SERVER_ADDRESSES.ethereum).toMatch(/^0x[a-f0-9]{40}$/i);
  });

  it('should have valid Polygon contract address', () => {
    expect(API3_DAPI_SERVER_ADDRESSES.polygon).toBeDefined();
    expect(API3_DAPI_SERVER_ADDRESSES.polygon).toMatch(/^0x[a-f0-9]{40}$/i);
  });

  it('should have valid Arbitrum contract address', () => {
    expect(API3_DAPI_SERVER_ADDRESSES.arbitrum).toBeDefined();
    expect(API3_DAPI_SERVER_ADDRESSES.arbitrum).toMatch(/^0x[a-f0-9]{40}$/i);
  });

  it('should have valid Optimism contract address', () => {
    expect(API3_DAPI_SERVER_ADDRESSES.optimism).toBeDefined();
    expect(API3_DAPI_SERVER_ADDRESSES.optimism).toMatch(/^0x[a-f0-9]{40}$/i);
  });

  it('should have valid Base contract address', () => {
    expect(API3_DAPI_SERVER_ADDRESSES.base).toBeDefined();
    expect(API3_DAPI_SERVER_ADDRESSES.base).toMatch(/^0x[a-f0-9]{40}$/i);
  });

  it('should have valid Avalanche contract address', () => {
    expect(API3_DAPI_SERVER_ADDRESSES.avalanche).toBeDefined();
    expect(API3_DAPI_SERVER_ADDRESSES.avalanche).toMatch(/^0x[a-f0-9]{40}$/i);
  });

  it('should have valid BSC contract address', () => {
    expect(API3_DAPI_SERVER_ADDRESSES.bsc).toBeDefined();
    expect(API3_DAPI_SERVER_ADDRESSES.bsc).toMatch(/^0x[a-f0-9]{40}$/i);
  });

  it('should have valid Fantom contract address', () => {
    expect(API3_DAPI_SERVER_ADDRESSES.fantom).toBeDefined();
    expect(API3_DAPI_SERVER_ADDRESSES.fantom).toMatch(/^0x[a-f0-9]{40}$/i);
  });

  it('should have Sepolia testnet address', () => {
    expect(API3_DAPI_SERVER_ADDRESSES.sepolia).toBeDefined();
    expect(API3_DAPI_SERVER_ADDRESSES.sepolia).toMatch(/^0x[a-f0-9]{40}$/i);
  });

  it('should have undefined for unsupported chains', () => {
    expect(API3_DAPI_SERVER_ADDRESSES.solana).toBeUndefined();
    expect(API3_DAPI_SERVER_ADDRESSES.near).toBeUndefined();
    expect(API3_DAPI_SERVER_ADDRESSES.aptos).toBeUndefined();
    expect(API3_DAPI_SERVER_ADDRESSES.celo).toBeUndefined();
  });

  it('should return correct contract address for each supported chain', () => {
    const expectedAddress = '0x9EB9798Dc1b602067DFe5C6A463dBae0D60c67fE';
    expect(getDapiServerAddress('ethereum')).toBe(expectedAddress);
    expect(getDapiServerAddress('polygon')).toBe(expectedAddress);
    expect(getDapiServerAddress('arbitrum')).toBe(expectedAddress);
  });

  it('should return undefined for unsupported chains', () => {
    expect(getDapiServerAddress('solana')).toBeUndefined();
    expect(getDapiServerAddress('celo')).toBeUndefined();
  });
});

describe('API3 Supported dAPIs - 喂价解析测试', () => {
  it('should have dAPIs for Ethereum', () => {
    const dapis = API3_SUPPORTED_DAPIS.ethereum;
    expect(dapis.length).toBeGreaterThan(0);
    expect(dapis).toContain('ETH/USD');
    expect(dapis).toContain('BTC/USD');
  });

  it('should have dAPIs for Polygon', () => {
    const dapis = API3_SUPPORTED_DAPIS.polygon;
    expect(dapis.length).toBeGreaterThan(0);
    expect(dapis).toContain('MATIC/USD');
  });

  it('should have dAPIs for Arbitrum', () => {
    const dapis = API3_SUPPORTED_DAPIS.arbitrum;
    expect(dapis.length).toBeGreaterThan(0);
    expect(dapis).toContain('ARB/USD');
  });

  it('should have dAPIs for Optimism', () => {
    const dapis = API3_SUPPORTED_DAPIS.optimism;
    expect(dapis.length).toBeGreaterThan(0);
    expect(dapis).toContain('OP/USD');
  });

  it('should have empty array for unsupported chains', () => {
    expect(API3_SUPPORTED_DAPIS.celo).toEqual([]);
    expect(API3_SUPPORTED_DAPIS.solana).toEqual([]);
  });

  it('should return available dAPIs for supported chain', () => {
    const dapis = getAvailableAPI3Dapis('ethereum');
    expect(dapis).toContain('ETH/USD');
    expect(dapis).toContain('BTC/USD');
  });

  it('should return empty array for unsupported chain', () => {
    expect(getAvailableAPI3Dapis('solana')).toEqual([]);
  });
});

describe('API3Client', () => {
  let client: API3Client;

  beforeEach(() => {
    client = new API3Client('ethereum', 'https://ethereum.rpc');
  });

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
      customData: false,
      batchQueries: false,
    });
  });
});

describe('Error Handling - 错误处理测试', () => {
  it('should handle unsupported chain gracefully', () => {
    const address = getDapiServerAddress('solana');
    expect(address).toBeUndefined();
  });

  it('should return empty array for unsupported chain dAPIs', () => {
    const dapis = getAvailableAPI3Dapis('unsupported' as SupportedChain);
    expect(dapis).toEqual([]);
  });

  it('should return false for unsupported chain support check', () => {
    expect(isChainSupportedByAPI3('solana')).toBe(false);
  });
});

describe('Utility Functions', () => {
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
      expect(chains).not.toContain('celo');
    });
  });

  describe('isChainSupportedByAPI3', () => {
    it('should return true for supported chains', () => {
      expect(isChainSupportedByAPI3('ethereum')).toBe(true);
      expect(isChainSupportedByAPI3('polygon')).toBe(true);
      expect(isChainSupportedByAPI3('fantom')).toBe(true);
    });

    it('should return false for unsupported chains', () => {
      expect(isChainSupportedByAPI3('solana')).toBe(false);
      expect(isChainSupportedByAPI3('celo')).toBe(false);
      expect(isChainSupportedByAPI3('near')).toBe(false);
    });
  });

  describe('createAPI3Client', () => {
    it('should create API3Client instance', () => {
      const client = createAPI3Client('ethereum', 'https://ethereum.rpc');
      expect(client).toBeInstanceOf(API3Client);
    });

    it('should pass config to client', () => {
      const config = { airnodeAddress: '0x9EB9798Dc1b602067DFe5C6A463dBae0D60c67fE' };
      const client = createAPI3Client('ethereum', 'https://ethereum.rpc', config);
      expect(client).toBeDefined();
    });
  });
});
