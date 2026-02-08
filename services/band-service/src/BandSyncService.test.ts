import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BandSyncService } from './BandSyncService';

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
  EnhancedSyncService: class MockEnhancedSyncService {
    protected logger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };
    protected config: any = null;
    protected isRunning = false;
    protected health = {
      status: 'healthy',
      lastSync: 0,
      consecutiveFailures: 0,
      syncCount: 0,
      errorRate: 0,
    };
    protected metrics = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      totalPricesFetched: 0,
      averageSyncDuration: 0,
      lastSyncDuration: 0,
      startTime: Date.now(),
    };

    async initialize(config: any) {
      this.config = config;
    }

    async start() {
      this.isRunning = true;
    }

    async stop() {
      this.isRunning = false;
    }

    getHealth() {
      return { ...this.health };
    }

    getMetrics() {
      return { ...this.metrics };
    }
  },
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('BandSyncService', () => {
  let service: BandSyncService;

  beforeEach(() => {
    service = new BandSyncService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize with default config', async () => {
      const mockReadContract = vi.fn();
      const { createPublicClient } = await import('viem');
      vi.mocked(createPublicClient).mockReturnValue({
        readContract: mockReadContract,
      } as any);

      const config = {
        instanceId: 'test-instance',
        protocol: 'band' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 60000,
        symbols: ['BTC/USD', 'ETH/USD'],
      };

      await service.initialize(config);
      expect(service).toBeDefined();
    });

    it('should initialize with custom config', async () => {
      const mockReadContract = vi.fn();
      const { createPublicClient } = await import('viem');
      vi.mocked(createPublicClient).mockReturnValue({
        readContract: mockReadContract,
      } as any);

      const config = {
        instanceId: 'test-instance',
        protocol: 'band' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 60000,
        symbols: ['BTC/USD'],
        customConfig: {
          contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
          minCount: 5,
          askCount: 6,
        },
      };

      await service.initialize(config);
      expect(service).toBeDefined();
    });
  });

  describe('fetchPrices', () => {
    it('should fetch prices successfully', async () => {
      const mockReadContract = vi
        .fn()
        .mockResolvedValue([
          {
            rate: 3500000000000000000000n,
            lastUpdatedBase: 1704067200n,
            lastUpdatedQuote: 1704067200n,
          },
        ]);
      const { createPublicClient } = await import('viem');
      vi.mocked(createPublicClient).mockReturnValue({
        readContract: mockReadContract,
      } as any);

      const config = {
        instanceId: 'test-instance',
        protocol: 'band' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 60000,
        symbols: ['ETH/USD'],
      };

      await service.initialize(config);

      const prices = await (service as any).fetchPrices();

      expect(prices).toHaveLength(1);
      expect(prices[0]).toMatchObject({
        symbol: 'ETH/USD',
        protocol: 'band',
        chain: 'ethereum',
        confidence: 0.92,
      });
      expect(prices[0].price).toBe(3500);
    });

    it('should skip unsupported symbols', async () => {
      const mockReadContract = vi.fn();
      const { createPublicClient } = await import('viem');
      vi.mocked(createPublicClient).mockReturnValue({
        readContract: mockReadContract,
      } as any);

      const config = {
        instanceId: 'test-instance',
        protocol: 'band' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 60000,
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
        protocol: 'band' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 60000,
        symbols: ['ETH/USD'],
      };

      await service.initialize(config);

      await expect((service as any).fetchPrices()).rejects.toThrow('Contract call failed');
    });

    it('should fetch multiple symbols in batch', async () => {
      const mockReadContract = vi.fn().mockResolvedValue([
        {
          rate: 3500000000000000000000n,
          lastUpdatedBase: 1704067200n,
          lastUpdatedQuote: 1704067200n,
        },
        {
          rate: 45000000000000000000000n,
          lastUpdatedBase: 1704067201n,
          lastUpdatedQuote: 1704067201n,
        },
      ]);

      const { createPublicClient } = await import('viem');
      vi.mocked(createPublicClient).mockReturnValue({
        readContract: mockReadContract,
      } as any);

      const config = {
        instanceId: 'test-instance',
        protocol: 'band' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 60000,
        symbols: ['ETH/USD', 'BTC/USD'],
      };

      await service.initialize(config);

      const prices = await (service as any).fetchPrices();

      expect(prices).toHaveLength(2);
      expect(prices[0].symbol).toBe('ETH/USD');
      expect(prices[1].symbol).toBe('BTC/USD');
      expect(mockReadContract).toHaveBeenCalledTimes(1); // Batch call
    });
  });

  describe('getAvailableSymbols', () => {
    it('should return list of supported symbols', async () => {
      const mockReadContract = vi.fn();
      const { createPublicClient } = await import('viem');
      vi.mocked(createPublicClient).mockReturnValue({
        readContract: mockReadContract,
      } as any);

      const config = {
        instanceId: 'test-instance',
        protocol: 'band' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 60000,
        symbols: ['ETH/USD'],
      };

      await service.initialize(config);

      const symbols = service.getAvailableSymbols();

      expect(symbols).toContain('BTC/USD');
      expect(symbols).toContain('ETH/USD');
      expect(symbols.length).toBeGreaterThan(0);
    });
  });

  describe('isSymbolSupported', () => {
    it('should return true for supported symbol', async () => {
      const mockReadContract = vi.fn();
      const { createPublicClient } = await import('viem');
      vi.mocked(createPublicClient).mockReturnValue({
        readContract: mockReadContract,
      } as any);

      const config = {
        instanceId: 'test-instance',
        protocol: 'band' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 60000,
        symbols: ['ETH/USD'],
      };

      await service.initialize(config);

      expect(service.isSymbolSupported('ETH/USD')).toBe(true);
      expect(service.isSymbolSupported('BTC/USD')).toBe(true);
    });

    it('should return false for unsupported symbol', async () => {
      const mockReadContract = vi.fn();
      const { createPublicClient } = await import('viem');
      vi.mocked(createPublicClient).mockReturnValue({
        readContract: mockReadContract,
      } as any);

      const config = {
        instanceId: 'test-instance',
        protocol: 'band' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 60000,
        symbols: ['ETH/USD'],
      };

      await service.initialize(config);

      expect(service.isSymbolSupported('UNKNOWN/USD')).toBe(false);
    });
  });
});
