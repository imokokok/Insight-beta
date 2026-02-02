/**
 * Pyth Oracle Client Tests
 *
 * 测试 Pyth 预言机客户端的配置和常量
 */

import { describe, it, expect } from 'vitest';

// 直接导入常量进行测试
import { PYTH_PRICE_FEED_IDS, PYTH_CONTRACT_ADDRESSES } from './pythOracle';

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

  describe('PYTH_CONTRACT_ADDRESSES', () => {
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
