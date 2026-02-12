/**
 * Chain Configuration Tests
 *
 * 测试区块链链配置、viem chain 映射、RPC URL 配置和链元数据
 */

import { describe, it, expect, vi } from 'vitest';
import {
  VIEM_CHAIN_MAP,
  DEFAULT_RPC_URLS,
  CHAIN_METADATA,
  getViemChain,
  getDefaultRpcUrl,
  getChainMetadata,
  isEvmChain,
  getExplorerTxUrl,
  getExplorerAddressUrl,
  getChainSymbol,
  type ChainMetadata,
} from './chainConfig';
import type { SupportedChain } from '@/types/unifiedOracleTypes';

// Mock viem/chains
vi.mock('viem/chains', () => ({
  mainnet: { id: 1, name: 'Ethereum' },
  polygon: { id: 137, name: 'Polygon' },
  arbitrum: { id: 42161, name: 'Arbitrum' },
  optimism: { id: 10, name: 'Optimism' },
  base: { id: 8453, name: 'Base' },
  avalanche: { id: 43114, name: 'Avalanche' },
  bsc: { id: 56, name: 'BNB Smart Chain' },
  fantom: { id: 250, name: 'Fantom' },
  celo: { id: 42220, name: 'Celo' },
  gnosis: { id: 100, name: 'Gnosis' },
  linea: { id: 59144, name: 'Linea' },
  scroll: { id: 534352, name: 'Scroll' },
  mantle: { id: 5000, name: 'Mantle' },
  mode: { id: 34443, name: 'Mode' },
  blast: { id: 81457, name: 'Blast' },
  sepolia: { id: 11155111, name: 'Sepolia' },
  goerli: { id: 5, name: 'Goerli' },
}));

describe('VIEM_CHAIN_MAP', () => {
  it('should have Ethereum mapped to mainnet', () => {
    expect(VIEM_CHAIN_MAP.ethereum).toBeDefined();
  });

  it('should have Polygon mapped', () => {
    expect(VIEM_CHAIN_MAP.polygon).toBeDefined();
  });

  it('should have Arbitrum mapped', () => {
    expect(VIEM_CHAIN_MAP.arbitrum).toBeDefined();
  });

  it('should have Optimism mapped', () => {
    expect(VIEM_CHAIN_MAP.optimism).toBeDefined();
  });

  it('should have Base mapped', () => {
    expect(VIEM_CHAIN_MAP.base).toBeDefined();
  });

  it('should map non-EVM chains to mainnet', () => {
    expect(VIEM_CHAIN_MAP.solana).toBeDefined();
    expect(VIEM_CHAIN_MAP.near).toBeDefined();
    expect(VIEM_CHAIN_MAP.aptos).toBeDefined();
    expect(VIEM_CHAIN_MAP.sui).toBeDefined();
  });
});

describe('DEFAULT_RPC_URLS', () => {
  it('should have Ethereum RPC URL', () => {
    expect(DEFAULT_RPC_URLS.ethereum).toContain('alchemy');
  });

  it('should have Polygon RPC URL', () => {
    expect(DEFAULT_RPC_URLS.polygon).toContain('alchemy');
  });

  it('should have Arbitrum RPC URL', () => {
    expect(DEFAULT_RPC_URLS.arbitrum).toContain('alchemy');
  });

  it('should have BSC RPC URL', () => {
    expect(DEFAULT_RPC_URLS.bsc).toContain('binance');
  });

  it('should have Solana RPC URL', () => {
    expect(DEFAULT_RPC_URLS.solana).toContain('solana');
  });

  it('should have local RPC URL', () => {
    expect(DEFAULT_RPC_URLS.local).toBe('http://localhost:8545');
  });
});

describe('CHAIN_METADATA', () => {
  it('should have correct Ethereum metadata', () => {
    const metadata = CHAIN_METADATA.ethereum;
    expect(metadata.name).toBe('Ethereum');
    expect(metadata.chainId).toBe(1);
    expect(metadata.nativeCurrency.symbol).toBe('ETH');
    expect(metadata.blockExplorerUrl).toBe('https://etherscan.io');
  });

  it('should have correct Polygon metadata', () => {
    const metadata = CHAIN_METADATA.polygon;
    expect(metadata.name).toBe('Polygon');
    expect(metadata.chainId).toBe(137);
    expect(metadata.nativeCurrency.symbol).toBe('MATIC');
    expect(metadata.blockExplorerUrl).toBe('https://polygonscan.com');
  });

  it('should have correct Arbitrum metadata', () => {
    const metadata = CHAIN_METADATA.arbitrum;
    expect(metadata.chainId).toBe(42161);
    expect(metadata.nativeCurrency.symbol).toBe('ETH');
  });

  it('should have correct Solana metadata', () => {
    const metadata = CHAIN_METADATA.solana;
    expect(metadata.name).toBe('Solana');
    expect(metadata.chainId).toBe(0);
    expect(metadata.nativeCurrency.symbol).toBe('SOL');
    expect(metadata.nativeCurrency.decimals).toBe(9);
  });

  it('should have correct Sepolia metadata', () => {
    const metadata = CHAIN_METADATA.sepolia;
    expect(metadata.chainId).toBe(11155111);
    expect(metadata.blockExplorerUrl).toBe('https://sepolia.etherscan.io');
  });
});

describe('Utility Functions', () => {
  describe('getViemChain', () => {
    it('should return chain for supported chain', () => {
      const chain = getViemChain('ethereum');
      expect(chain).toBeDefined();
    });

    it('should return mainnet for unknown chain', () => {
      const chain = getViemChain('unknown' as SupportedChain);
      expect(chain).toBeDefined();
    });
  });

  describe('getDefaultRpcUrl', () => {
    it('should return RPC URL for supported chain', () => {
      const url = getDefaultRpcUrl('ethereum');
      expect(url).toContain('alchemy');
    });

    it('should return Ethereum RPC for unknown chain', () => {
      const url = getDefaultRpcUrl('unknown' as SupportedChain);
      expect(url).toBe(DEFAULT_RPC_URLS.ethereum);
    });
  });

  describe('getChainMetadata', () => {
    it('should return metadata for supported chain', () => {
      const metadata = getChainMetadata('ethereum');
      expect(metadata.name).toBe('Ethereum');
    });

    it('should return Ethereum metadata for unknown chain', () => {
      const metadata = getChainMetadata('unknown' as SupportedChain);
      expect(metadata.name).toBe('Ethereum');
    });
  });

  describe('isEvmChain', () => {
    it('should return true for EVM chains', () => {
      expect(isEvmChain('ethereum')).toBe(true);
      expect(isEvmChain('polygon')).toBe(true);
      expect(isEvmChain('arbitrum')).toBe(true);
      expect(isEvmChain('bsc')).toBe(true);
    });

    it('should return false for non-EVM chains', () => {
      expect(isEvmChain('solana')).toBe(false);
      expect(isEvmChain('near')).toBe(false);
      expect(isEvmChain('aptos')).toBe(false);
      expect(isEvmChain('sui')).toBe(false);
    });
  });

  describe('getExplorerTxUrl', () => {
    it('should return correct transaction URL', () => {
      const url = getExplorerTxUrl('ethereum', '0x123');
      expect(url).toBe('https://etherscan.io/tx/0x123');
    });

    it('should return correct URL for Polygon', () => {
      const url = getExplorerTxUrl('polygon', '0xabc');
      expect(url).toBe('https://polygonscan.com/tx/0xabc');
    });
  });

  describe('getExplorerAddressUrl', () => {
    it('should return correct address URL', () => {
      const url = getExplorerAddressUrl('ethereum', '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbD');
      expect(url).toBe('https://etherscan.io/address/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbD');
    });
  });

  describe('getChainSymbol', () => {
    it('should return correct symbol for chainId', () => {
      expect(getChainSymbol(1)).toBe('ETH');
      expect(getChainSymbol(137)).toBe('MATIC');
      expect(getChainSymbol(56)).toBe('BNB');
    });

    it('should return ETH for unknown chainId', () => {
      expect(getChainSymbol(999999)).toBe('ETH');
    });
  });
});

describe('ChainMetadata Type', () => {
  it('should have correct structure', () => {
    const metadata: ChainMetadata = {
      name: 'Test Chain',
      chainId: 123,
      nativeCurrency: {
        name: 'Test Token',
        symbol: 'TEST',
        decimals: 18,
      },
      blockExplorerUrl: 'https://test.com',
    };
    expect(metadata.nativeCurrency.decimals).toBe(18);
  });
});
