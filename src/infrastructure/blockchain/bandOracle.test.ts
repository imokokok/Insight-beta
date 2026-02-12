/**
 * Band Protocol Client Tests
 *
 * Band Protocol 客户端测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BandClient, createBandClient } from './bandOracle';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('BandClient', () => {
  const mockConfig = {
    chain: 'ethereum' as const,
    rpcUrl: 'https://ethereum.rpc',
    bandEndpoint: 'https://laozi1.bandchain.org/api',
  };

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('constructor', () => {
    it('should create client with default config', () => {
      const client = new BandClient(mockConfig);
      expect(client).toBeDefined();
      expect(client.getConfig().bandEndpoint).toBe('https://laozi1.bandchain.org/api');
      expect(client.getConfig().minCount).toBe(3);
      expect(client.getConfig().askCount).toBe(4);
    });

    it('should create client with custom config', () => {
      const customConfig = {
        ...mockConfig,
        minCount: 5,
        askCount: 7,
      };
      const client = new BandClient(customConfig);
      expect(client.getConfig().minCount).toBe(5);
      expect(client.getConfig().askCount).toBe(7);
    });
  });

  describe('getPrice', () => {
    it('should fetch and parse price data correctly', async () => {
      const mockResponse = {
        price_results: [
          {
            symbol: 'BTC',
            rate: '45000000000000000000000',
            multiplier: '1000000000000000000',
            last_update: '2024-01-15T10:30:00Z',
            block_height: '12345678',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = new BandClient(mockConfig);
      const price = await client.getPrice('BTC');

      expect(price).toBeDefined();
      expect(price.symbol).toBe('BTC');
      expect(price.protocol).toBe('band');
      expect(price.chain).toBe('ethereum');
      expect(price.price).toBe(45000);
      expect(price.decimals).toBe(18);
      expect(price.confidence).toBe(0.9);
    });

    it('should throw error when API fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const client = new BandClient(mockConfig);
      await expect(client.getPrice('BTC')).rejects.toThrow('Band API error');
    });

    it('should throw error when no price data available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ price_results: [] }),
      });

      const client = new BandClient(mockConfig);
      await expect(client.getPrice('BTC')).rejects.toThrow('No price data available');
    });

    it('should detect stale data', async () => {
      const oldDate = new Date();
      oldDate.setMinutes(oldDate.getMinutes() - 10); // 10 minutes ago

      const mockResponse = {
        price_results: [
          {
            symbol: 'ETH',
            rate: '2500000000000000000000',
            multiplier: '1000000000000000000',
            last_update: oldDate.toISOString(),
            block_height: '12345678',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = new BandClient(mockConfig);
      const price = await client.getPrice('ETH');

      expect(price.isStale).toBe(true);
      expect(price.stalenessSeconds).toBeGreaterThan(300);
    });
  });

  describe('getMultiplePrices', () => {
    it('should fetch multiple prices', async () => {
      const mockResponse = {
        price_results: [
          {
            symbol: 'BTC',
            rate: '45000000000000000000000',
            multiplier: '1000000000000000000',
            last_update: new Date().toISOString(),
            block_height: '12345678',
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = new BandClient(mockConfig);
      const prices = await client.getMultiplePrices(['BTC', 'ETH']);

      expect(prices).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures gracefully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              price_results: [
                {
                  symbol: 'BTC',
                  rate: '45000000000000000000000',
                  multiplier: '1000000000000000000',
                  last_update: new Date().toISOString(),
                  block_height: '12345678',
                },
              ],
            }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Error',
        });

      const client = new BandClient(mockConfig);
      const prices = await client.getMultiplePrices(['BTC', 'ETH']);

      expect(prices).toHaveLength(1);
      expect(prices[0]?.symbol).toBe('BTC');
    });
  });

  describe('getCapabilities', () => {
    it('should return correct capabilities', () => {
      const client = new BandClient(mockConfig);
      const capabilities = client.getCapabilities();

      expect(capabilities).toEqual({
        priceFeeds: true,
        assertions: false,
        disputes: false,
        vrf: false,
        customData: true,
      });
    });
  });

  describe('healthCheck', () => {
    it('should return healthy when API responds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      const client = new BandClient(mockConfig);
      const health = await client.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.latency).toBeGreaterThanOrEqual(0);
    });

    it('should return unhealthy when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const client = new BandClient(mockConfig);
      const health = await client.healthCheck();

      expect(health.healthy).toBe(false);
    });
  });

  describe('updateConfig', () => {
    it('should update config values', () => {
      const client = new BandClient(mockConfig);

      client.updateConfig({ minCount: 10, askCount: 15 });

      const config = client.getConfig();
      expect(config.minCount).toBe(10);
      expect(config.askCount).toBe(15);
    });
  });
});

describe('createBandClient', () => {
  it('should create BandClient instance', () => {
    const client = createBandClient({
      chain: 'ethereum',
      rpcUrl: 'https://ethereum.rpc',
    });

    expect(client).toBeInstanceOf(BandClient);
  });
});
