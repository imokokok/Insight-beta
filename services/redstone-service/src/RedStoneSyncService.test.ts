import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RedStoneSyncService } from './RedStoneSyncService';

// Mock viem
vi.mock('viem', () => ({
  createPublicClient: vi.fn(() => ({
    readContract: vi.fn(),
  })),
  http: vi.fn(),
  formatUnits: vi.fn((value: bigint, decimals: number) => {
    return (Number(value) / 10 ** decimals).toString();
  }),
}));

vi.mock('viem/chains', () => ({
  mainnet: { id: 1, name: 'Ethereum' },
  polygon: { id: 137, name: 'Polygon' },
  arbitrum: { id: 42161, name: 'Arbitrum' },
  optimism: { id: 10, name: 'Optimism' },
  base: { id: 8453, name: 'Base' },
  avalanche: { id: 43114, name: 'Avalanche' },
  bsc: { id: 56, name: 'BSC' },
  fantom: { id: 250, name: 'Fantom' },
}));

// Mock the shared module
vi.mock('@oracle-monitor/shared', () => ({
  BaseSyncService: class MockBaseSyncService {
    protected logger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };
    protected config: any = null;
    protected isRunning = false;

    async initialize(config: any) {
      this.config = config;
    }

    async start() {
      this.isRunning = true;
    }

    async stop() {
      this.isRunning = false;
    }
  },
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('RedStoneSyncService', () => {
  let service: RedStoneSyncService;

  beforeEach(() => {
    service = new RedStoneSyncService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize with default config', async () => {
      const config = {
        instanceId: 'test-instance',
        protocol: 'redstone' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 30000,
        symbols: ['ETH/USD', 'BTC/USD'],
      };

      await service.initialize(config);
      expect(service).toBeDefined();
    });

    it('should initialize with custom config', async () => {
      const config = {
        instanceId: 'test-instance',
        protocol: 'redstone' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 30000,
        symbols: ['ETH/USD'],
        customConfig: {
          contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
          feedIds: { 'CUSTOM/USD': '0x1234' },
          symbols: ['ETH/USD', 'CUSTOM/USD'],
        },
      };

      await service.initialize(config);
      expect(service).toBeDefined();
    });
  });

  describe('fetchPrices', () => {
    it('should fetch prices successfully', async () => {
      const mockReadContract = vi.fn().mockResolvedValue([350000000000n, 1704067200]);
      const { createPublicClient } = await import('viem');
      vi.mocked(createPublicClient).mockReturnValue({
        readContract: mockReadContract,
      } as any);

      const config = {
        instanceId: 'test-instance',
        protocol: 'redstone' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 30000,
        symbols: ['ETH/USD'],
      };

      await service.initialize(config);

      const prices = await (service as any).fetchPrices();

      expect(prices).toHaveLength(1);
      expect(prices[0]).toMatchObject({
        symbol: 'ETH/USD',
        protocol: 'redstone',
        chain: 'ethereum',
        confidence: 0.97,
      });
      expect(prices[0].price).toBe(3500);
    });

    it('should skip unsupported feeds', async () => {
      const mockReadContract = vi.fn();
      const { createPublicClient } = await import('viem');
      vi.mocked(createPublicClient).mockReturnValue({
        readContract: mockReadContract,
      } as any);

      const config = {
        instanceId: 'test-instance',
        protocol: 'redstone' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 30000,
        symbols: ['UNSUPPORTED/USD'],
      };

      await service.initialize(config);

      const prices = await (service as any).fetchPrices();

      expect(prices).toHaveLength(0);
      expect(mockReadContract).not.toHaveBeenCalled();
    });

    it('should handle contract read errors gracefully', async () => {
      const mockReadContract = vi.fn().mockRejectedValue(new Error('Contract call failed'));
      const { createPublicClient } = await import('viem');
      vi.mocked(createPublicClient).mockReturnValue({
        readContract: mockReadContract,
      } as any);

      const config = {
        instanceId: 'test-instance',
        protocol: 'redstone' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 30000,
        symbols: ['ETH/USD'],
      };

      await service.initialize(config);

      const prices = await (service as any).fetchPrices();

      expect(prices).toHaveLength(0);
    });

    it('should fetch multiple feeds', async () => {
      const mockReadContract = vi
        .fn()
        .mockResolvedValueOnce([350000000000n, 1704067200])
        .mockResolvedValueOnce([4500000000000n, 1704067201]);

      const { createPublicClient } = await import('viem');
      vi.mocked(createPublicClient).mockReturnValue({
        readContract: mockReadContract,
      } as any);

      const config = {
        instanceId: 'test-instance',
        protocol: 'redstone' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 30000,
        symbols: ['ETH/USD', 'BTC/USD'],
      };

      await service.initialize(config);

      const prices = await (service as any).fetchPrices();

      expect(prices).toHaveLength(2);
      expect(prices[0].symbol).toBe('ETH/USD');
      expect(prices[1].symbol).toBe('BTC/USD');
    });
  });

  describe('getAvailableFeeds', () => {
    it('should return available feeds for ethereum', async () => {
      const config = {
        instanceId: 'test-instance',
        protocol: 'redstone' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 30000,
        symbols: ['ETH/USD'],
      };

      await service.initialize(config);

      const feeds = service.getAvailableFeeds();

      expect(feeds).toContain('ETH/USD');
      expect(feeds).toContain('BTC/USD');
      expect(feeds.length).toBeGreaterThan(0);
    });

    it('should return available feeds for polygon', async () => {
      const config = {
        instanceId: 'test-instance',
        protocol: 'redstone' as const,
        chain: 'polygon',
        rpcUrl: 'https://polygon.llamarpc.com',
        intervalMs: 30000,
        symbols: ['MATIC/USD'],
      };

      await service.initialize(config);

      const feeds = service.getAvailableFeeds();

      expect(feeds).toContain('MATIC/USD');
    });
  });

  describe('isFeedSupported', () => {
    it('should return true for supported feed', async () => {
      const config = {
        instanceId: 'test-instance',
        protocol: 'redstone' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 30000,
        symbols: ['ETH/USD'],
      };

      await service.initialize(config);

      expect(service.isFeedSupported('ETH/USD')).toBe(true);
      expect(service.isFeedSupported('BTC/USD')).toBe(true);
    });

    it('should return false for unsupported feed', async () => {
      const config = {
        instanceId: 'test-instance',
        protocol: 'redstone' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 30000,
        symbols: ['ETH/USD'],
      };

      await service.initialize(config);

      expect(service.isFeedSupported('UNKNOWN/USD')).toBe(false);
    });
  });

  describe('getFeedIdForSymbol', () => {
    it('should return feed ID for supported symbol', async () => {
      const config = {
        instanceId: 'test-instance',
        protocol: 'redstone' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 30000,
        symbols: ['ETH/USD'],
      };

      await service.initialize(config);

      const feedId = service.getFeedIdForSymbol('ETH/USD');

      expect(feedId).toBeDefined();
      expect(feedId).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it('should return undefined for unsupported symbol', async () => {
      const config = {
        instanceId: 'test-instance',
        protocol: 'redstone' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 30000,
        symbols: ['ETH/USD'],
      };

      await service.initialize(config);

      const feedId = service.getFeedIdForSymbol('UNKNOWN/USD');

      expect(feedId).toBeUndefined();
    });
  });
});
