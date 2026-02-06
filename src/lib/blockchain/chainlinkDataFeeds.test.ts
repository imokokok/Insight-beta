/**
 * Chainlink Data Feeds Tests
 *
 * 测试 Chainlink 价格喂价配置
 */

import { describe, it, expect } from 'vitest';
import { POPULAR_FEEDS, CHAINLINK_FEED_REGISTRY } from './chainlinkDataFeeds';

describe('Chainlink Data Feeds Configuration', () => {
  describe('POPULAR_FEEDS', () => {
    it('should have ETH/USD feed on Ethereum mainnet', () => {
      expect(POPULAR_FEEDS.ethereum['ETH/USD']).toBeDefined();
      expect(POPULAR_FEEDS.ethereum['ETH/USD']).toMatch(/^0x[a-f0-9]{40}$/i);
    });

    it('should have BTC/USD feed on Ethereum mainnet', () => {
      expect(POPULAR_FEEDS.ethereum['BTC/USD']).toBeDefined();
      expect(POPULAR_FEEDS.ethereum['BTC/USD']).toMatch(/^0x[a-f0-9]{40}$/i);
    });

    it('should have stablecoin feeds on Ethereum', () => {
      expect(POPULAR_FEEDS.ethereum['USDC/USD']).toBeDefined();
      expect(POPULAR_FEEDS.ethereum['USDT/USD']).toBeDefined();
      expect(POPULAR_FEEDS.ethereum['DAI/USD']).toBeDefined();
    });

    it('should have DeFi token feeds on Ethereum', () => {
      expect(POPULAR_FEEDS.ethereum['LINK/USD']).toBeDefined();
      expect(POPULAR_FEEDS.ethereum['AAVE/USD']).toBeDefined();
      expect(POPULAR_FEEDS.ethereum['UNI/USD']).toBeDefined();
    });

    it('should have feeds on Polygon', () => {
      expect(POPULAR_FEEDS.polygon['ETH/USD']).toBeDefined();
      expect(POPULAR_FEEDS.polygon['BTC/USD']).toBeDefined();
      expect(POPULAR_FEEDS.polygon['MATIC/USD']).toBeDefined();
    });

    it('should have feeds on Arbitrum', () => {
      expect(POPULAR_FEEDS.arbitrum['ETH/USD']).toBeDefined();
      expect(POPULAR_FEEDS.arbitrum['BTC/USD']).toBeDefined();
    });

    it('should have feeds on Optimism', () => {
      expect(POPULAR_FEEDS.optimism['ETH/USD']).toBeDefined();
      expect(POPULAR_FEEDS.optimism['BTC/USD']).toBeDefined();
    });

    it('should have feeds on Base', () => {
      expect(POPULAR_FEEDS.base['ETH/USD']).toBeDefined();
      expect(POPULAR_FEEDS.base['BTC/USD']).toBeDefined();
    });

    it('should have AVAX/USD feed on Avalanche', () => {
      expect(POPULAR_FEEDS.avalanche['AVAX/USD']).toBeDefined();
    });

    it('should have BNB/USD feed on BSC', () => {
      expect(POPULAR_FEEDS.bsc['BNB/USD']).toBeDefined();
    });

    it('should have FTM/USD feed on Fantom', () => {
      expect(POPULAR_FEEDS.fantom['FTM/USD']).toBeDefined();
    });

    it('should have valid Ethereum address format for all feeds', () => {
      Object.entries(POPULAR_FEEDS).forEach(([chain, feeds]) => {
        Object.entries(feeds).forEach(([symbol, address]) => {
          expect(address, `${chain} ${symbol} should have valid address`).toMatch(
            /^0x[a-f0-9]{40}$/i,
          );
        });
      });
    });

    it('should have unique addresses within each chain', () => {
      Object.entries(POPULAR_FEEDS).forEach(([chain, feeds]) => {
        const addresses = Object.values(feeds);
        const uniqueAddresses = new Set(addresses);
        expect(uniqueAddresses.size, `Chain ${chain} should have unique addresses`).toBe(
          addresses.length,
        );
      });
    });
  });

  describe('CHAINLINK_FEED_REGISTRY', () => {
    it('should have Ethereum mainnet feed registry', () => {
      expect(CHAINLINK_FEED_REGISTRY.ethereum).toBeDefined();
      expect(CHAINLINK_FEED_REGISTRY.ethereum).toMatch(/^0x[a-f0-9]{40}$/i);
    });

    it('should have feed registry for all supported chains', () => {
      const supportedChains = [
        'ethereum',
        'polygon',
        'arbitrum',
        'optimism',
        'base',
        'avalanche',
        'bsc',
        'fantom',
        'celo',
        'gnosis',
        'linea',
        'scroll',
        'mantle',
        'mode',
        'blast',
        'solana',
        'near',
        'aptos',
        'sui',
        'polygonAmoy',
        'sepolia',
        'goerli',
        'mumbai',
        'local',
      ];

      supportedChains.forEach((chain) => {
        expect(
          CHAINLINK_FEED_REGISTRY[chain as keyof typeof CHAINLINK_FEED_REGISTRY],
        ).toBeDefined();
      });
    });
  });

  describe('Feed Coverage', () => {
    it('should cover major cryptocurrencies across chains', () => {
      const chainsWithEthBtc = [
        'ethereum',
        'polygon',
        'arbitrum',
        'optimism',
        'base',
        'avalanche',
        'bsc',
        'fantom',
      ];
      chainsWithEthBtc.forEach((chain) => {
        const feeds = POPULAR_FEEDS[chain as keyof typeof POPULAR_FEEDS];
        if (Object.keys(feeds).length > 0) {
          expect(feeds['ETH/USD'], `${chain} should have ETH/USD`).toBeDefined();
          expect(feeds['BTC/USD'], `${chain} should have BTC/USD`).toBeDefined();
        }
      });
    });

    it('should cover stablecoins on major chains', () => {
      const majorChains = [
        'ethereum',
        'polygon',
        'arbitrum',
        'optimism',
        'base',
        'avalanche',
        'bsc',
      ];
      majorChains.forEach((chain) => {
        const feeds = POPULAR_FEEDS[chain as keyof typeof POPULAR_FEEDS];
        const hasStablecoin = feeds['USDC/USD'] || feeds['USDT/USD'] || feeds['DAI/USD'];
        expect(hasStablecoin, `${chain} should have at least one stablecoin feed`).toBeTruthy();
      });
    });
  });
});
