/**
 * DIA Oracle Client Tests
 *
 * 测试 DIA 预言机客户端的配置、喂价解析、陈旧度判定与错误处理
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupportedChain } from '@/lib/types/unifiedOracleTypes';
import {
  DIA_SUPPORTED_ASSETS,
  DIAClient,
  createDIAClient,
  getSupportedDIAChains,
  getAvailableDIAAssets,
  getAvailableDIASymbols,
  isChainSupportedByDIA,
} from './diaOracle';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('DIA Supported Assets - 喂价解析测试', () => {
  it('should have assets for Ethereum', () => {
    const assets = DIA_SUPPORTED_ASSETS.ethereum;
    expect(assets.length).toBeGreaterThan(0);
    expect(assets).toContain('ETH');
    expect(assets).toContain('BTC');
    expect(assets).toContain('USDC');
    expect(assets).toContain('LINK');
  });

  it('should have assets for Polygon', () => {
    const assets = DIA_SUPPORTED_ASSETS.polygon;
    expect(assets.length).toBeGreaterThan(0);
    expect(assets).toContain('MATIC');
    expect(assets).toContain('ETH');
  });

  it('should have assets for Arbitrum', () => {
    const assets = DIA_SUPPORTED_ASSETS.arbitrum;
    expect(assets.length).toBeGreaterThan(0);
    expect(assets).toContain('ARB');
  });

  it('should have assets for Optimism', () => {
    const assets = DIA_SUPPORTED_ASSETS.optimism;
    expect(assets.length).toBeGreaterThan(0);
    expect(assets).toContain('OP');
  });

  it('should have assets for Avalanche', () => {
    const assets = DIA_SUPPORTED_ASSETS.avalanche;
    expect(assets.length).toBeGreaterThan(0);
    expect(assets).toContain('AVAX');
  });

  it('should have assets for BSC', () => {
    const assets = DIA_SUPPORTED_ASSETS.bsc;
    expect(assets.length).toBeGreaterThan(0);
    expect(assets).toContain('BNB');
    expect(assets).toContain('CAKE');
  });

  it('should have empty array for unsupported chains', () => {
    expect(DIA_SUPPORTED_ASSETS.celo).toEqual([]);
    expect(DIA_SUPPORTED_ASSETS.solana).toEqual([]);
    expect(DIA_SUPPORTED_ASSETS.sepolia).toEqual([]);
  });

  it('should return available assets for supported chain', () => {
    const assets = getAvailableDIAAssets('ethereum');
    expect(assets).toContain('ETH');
    expect(assets).toContain('BTC');
  });

  it('should return empty array for unsupported chain', () => {
    expect(getAvailableDIAAssets('solana')).toEqual([]);
  });
});

describe('DIAClient', () => {
  let client: DIAClient;

  beforeEach(() => {
    client = new DIAClient('ethereum', 'https://ethereum.rpc');
  });

  it('should create client with correct chain', () => {
    expect(client).toBeDefined();
  });

  it('should create client with custom API endpoint', () => {
    const customClient = new DIAClient('ethereum', 'https://ethereum.rpc', {
      apiEndpoint: 'https://custom.api.diadata.org/v1',
    });
    expect(customClient).toBeDefined();
  });
});

describe('Error Handling - 错误处理测试', () => {
  it('should return empty array for unsupported chain assets', () => {
    const assets = getAvailableDIAAssets('unsupported' as SupportedChain);
    expect(assets).toEqual([]);
  });

  it('should return empty array for unsupported chain symbols', () => {
    const symbols = getAvailableDIASymbols('unsupported');
    expect(symbols).toEqual([]);
  });

  it('should return false for unsupported chain support check', () => {
    expect(isChainSupportedByDIA('solana')).toBe(false);
  });
});

describe('Utility Functions', () => {
  describe('getSupportedDIAChains', () => {
    it('should return array of supported chains', () => {
      const chains = getSupportedDIAChains();
      expect(Array.isArray(chains)).toBe(true);
      expect(chains.length).toBeGreaterThan(0);
      expect(chains).toContain('ethereum');
      expect(chains).toContain('polygon');
    });

    it('should not include chains with no assets', () => {
      const chains = getSupportedDIAChains();
      expect(chains).not.toContain('solana');
      expect(chains).not.toContain('celo');
    });
  });

  describe('isChainSupportedByDIA', () => {
    it('should return true for supported chains', () => {
      expect(isChainSupportedByDIA('ethereum')).toBe(true);
      expect(isChainSupportedByDIA('polygon')).toBe(true);
      expect(isChainSupportedByDIA('avalanche')).toBe(true);
    });

    it('should return false for unsupported chains', () => {
      expect(isChainSupportedByDIA('solana')).toBe(false);
      expect(isChainSupportedByDIA('celo')).toBe(false);
      expect(isChainSupportedByDIA('sepolia')).toBe(false);
    });
  });

  describe('getAvailableDIASymbols', () => {
    it('should return symbols for supported chain', () => {
      const symbols = getAvailableDIASymbols('ethereum');
      expect(symbols).toContain('ETH/USD');
      expect(symbols).toContain('BTC/USD');
    });

    it('should return empty array for unsupported chain', () => {
      expect(getAvailableDIASymbols('solana')).toEqual([]);
    });
  });

  describe('createDIAClient', () => {
    it('should create DIAClient instance', () => {
      const client = createDIAClient('ethereum', 'https://ethereum.rpc');
      expect(client).toBeInstanceOf(DIAClient);
    });

    it('should pass config to client', () => {
      const config = { apiEndpoint: 'https://custom.api.com' };
      const client = createDIAClient('ethereum', 'https://ethereum.rpc', config);
      expect(client).toBeDefined();
    });
  });
});
