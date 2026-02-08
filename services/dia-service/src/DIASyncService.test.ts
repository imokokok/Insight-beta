import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DIASyncService } from './DIASyncService';

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

describe('DIASyncService', () => {
  let service: DIASyncService;
  let fetchMock: any;

  beforeEach(() => {
    service = new DIASyncService();
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize with default config', async () => {
      const config = {
        instanceId: 'test-instance',
        protocol: 'dia' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 600000,
        symbols: ['ETH/USD', 'BTC/USD'],
      };

      await service.initialize(config);
      expect(service).toBeDefined();
    });

    it('should initialize with custom config', async () => {
      const config = {
        instanceId: 'test-instance',
        protocol: 'dia' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 600000,
        symbols: ['ETH/USD'],
        customConfig: {
          apiEndpoint: 'https://custom.diadata.org/v1',
          assets: ['ETH', 'BTC'],
        },
      };

      await service.initialize(config);
      expect(service).toBeDefined();
    });
  });

  describe('fetchPrices', () => {
    it('should fetch prices successfully', async () => {
      const mockResponse = {
        Symbol: 'ETH',
        Name: 'Ethereum',
        Address: '0x...',
        Blockchain: 'Ethereum',
        Price: 3500.5,
        PriceYesterday: 3400.0,
        VolumeYesterdayUSD: 1000000000,
        Time: '2024-01-01T00:00:00Z',
        Source: 'diadata',
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const config = {
        instanceId: 'test-instance',
        protocol: 'dia' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 600000,
        symbols: ['ETH/USD'],
      };

      await service.initialize(config);

      const prices = await (service as any).fetchPrices();

      expect(prices).toHaveLength(1);
      expect(prices[0]).toMatchObject({
        symbol: 'ETH/USD',
        price: 3500.5,
        protocol: 'dia',
        chain: 'ethereum',
        confidence: 0.95,
        source: 'diadata',
      });
    });

    it('should handle API errors gracefully', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      const config = {
        instanceId: 'test-instance',
        protocol: 'dia' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 600000,
        symbols: ['ETH/USD'],
      };

      await service.initialize(config);

      const prices = await (service as any).fetchPrices();

      expect(prices).toHaveLength(0);
    });

    it('should handle HTTP errors', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const config = {
        instanceId: 'test-instance',
        protocol: 'dia' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 600000,
        symbols: ['ETH/USD'],
      };

      await service.initialize(config);

      const prices = await (service as any).fetchPrices();

      expect(prices).toHaveLength(0);
    });

    it('should fetch multiple assets', async () => {
      const ethResponse = {
        Symbol: 'ETH',
        Name: 'Ethereum',
        Address: '0x...',
        Blockchain: 'Ethereum',
        Price: 3500.5,
        PriceYesterday: 3400.0,
        VolumeYesterdayUSD: 1000000000,
        Time: '2024-01-01T00:00:00Z',
        Source: 'diadata',
      };

      const btcResponse = {
        Symbol: 'BTC',
        Name: 'Bitcoin',
        Address: '0x...',
        Blockchain: 'Bitcoin',
        Price: 45000.0,
        PriceYesterday: 44000.0,
        VolumeYesterdayUSD: 2000000000,
        Time: '2024-01-01T00:00:01Z',
        Source: 'diadata',
      };

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ethResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => btcResponse,
        });

      const config = {
        instanceId: 'test-instance',
        protocol: 'dia' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 600000,
        symbols: ['ETH/USD', 'BTC/USD'],
      };

      await service.initialize(config);

      const prices = await (service as any).fetchPrices();

      expect(prices).toHaveLength(2);
      expect(prices[0].symbol).toBe('ETH/USD');
      expect(prices[1].symbol).toBe('BTC/USD');
    });
  });

  describe('getAvailableAssets', () => {
    it('should return available assets for ethereum', async () => {
      const config = {
        instanceId: 'test-instance',
        protocol: 'dia' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 600000,
        symbols: ['ETH/USD'],
      };

      await service.initialize(config);

      const assets = service.getAvailableAssets();

      expect(assets).toContain('ETH');
      expect(assets).toContain('BTC');
      expect(assets.length).toBeGreaterThan(0);
    });

    it('should return available assets for polygon', async () => {
      const config = {
        instanceId: 'test-instance',
        protocol: 'dia' as const,
        chain: 'polygon',
        rpcUrl: 'https://polygon.llamarpc.com',
        intervalMs: 600000,
        symbols: ['MATIC/USD'],
      };

      await service.initialize(config);

      const assets = service.getAvailableAssets();

      expect(assets).toContain('MATIC');
    });
  });

  describe('isAssetSupported', () => {
    it('should return true for supported asset', async () => {
      const config = {
        instanceId: 'test-instance',
        protocol: 'dia' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 600000,
        symbols: ['ETH/USD'],
      };

      await service.initialize(config);

      expect(service.isAssetSupported('ETH')).toBe(true);
      expect(service.isAssetSupported('BTC')).toBe(true);
    });

    it('should return false for unsupported asset', async () => {
      const config = {
        instanceId: 'test-instance',
        protocol: 'dia' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 600000,
        symbols: ['ETH/USD'],
      };

      await service.initialize(config);

      expect(service.isAssetSupported('UNKNOWN')).toBe(false);
    });
  });

  describe('checkDIAHealth', () => {
    it('should return healthy status when API is available', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
      });

      const config = {
        instanceId: 'test-instance',
        protocol: 'dia' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 600000,
        symbols: ['ETH/USD'],
      };

      await service.initialize(config);

      const health = await service.checkDIAHealth();

      expect(health.healthy).toBe(true);
      expect(health.latency).toBeGreaterThanOrEqual(0);
    });

    it('should return unhealthy status when API fails', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      const config = {
        instanceId: 'test-instance',
        protocol: 'dia' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 600000,
        symbols: ['ETH/USD'],
      };

      await service.initialize(config);

      const health = await service.checkDIAHealth();

      expect(health.healthy).toBe(false);
      expect(health.latency).toBeGreaterThanOrEqual(0);
    });
  });
});
