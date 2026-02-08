import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { API3SyncService } from './API3SyncService';

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

describe('API3SyncService', () => {
  let service: API3SyncService;

  beforeEach(() => {
    service = new API3SyncService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize with default config', async () => {
      const config = {
        instanceId: 'test-instance',
        protocol: 'api3' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 60000,
        symbols: ['ETH/USD', 'BTC/USD'],
      };

      await service.initialize(config);
      expect(service).toBeDefined();
    });

    it('should initialize with custom config', async () => {
      const config = {
        instanceId: 'test-instance',
        protocol: 'api3' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 60000,
        symbols: ['ETH/USD'],
        customConfig: {
          dapiServerAddress: '0x1234567890abcdef1234567890abcdef12345678',
          dapis: ['ETH/USD', 'BTC/USD', 'CUSTOM/USD'],
        },
      };

      await service.initialize(config);
      expect(service).toBeDefined();
    });
  });

  describe('fetchPrices', () => {
    it('should fetch prices successfully', async () => {
      const mockReadContract = vi.fn().mockResolvedValue([3500000000000000000000n, 1704067200]);
      const { createPublicClient } = await import('viem');
      vi.mocked(createPublicClient).mockReturnValue({
        readContract: mockReadContract,
      } as any);

      const config = {
        instanceId: 'test-instance',
        protocol: 'api3' as const,
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
        protocol: 'api3',
        chain: 'ethereum',
        confidence: 0.98,
      });
      expect(prices[0].price).toBe(3500);
    });

    it('should skip unsupported dAPIs', async () => {
      const mockReadContract = vi.fn();
      const { createPublicClient } = await import('viem');
      vi.mocked(createPublicClient).mockReturnValue({
        readContract: mockReadContract,
      } as any);

      const config = {
        instanceId: 'test-instance',
        protocol: 'api3' as const,
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
        protocol: 'api3' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 60000,
        symbols: ['ETH/USD'],
      };

      await service.initialize(config);

      const prices = await (service as any).fetchPrices();

      expect(prices).toHaveLength(0);
    });

    it('should fetch multiple dAPIs', async () => {
      const mockReadContract = vi
        .fn()
        .mockResolvedValueOnce([3500000000000000000000n, 1704067200])
        .mockResolvedValueOnce([45000000000000000000000n, 1704067201]);

      const { createPublicClient } = await import('viem');
      vi.mocked(createPublicClient).mockReturnValue({
        readContract: mockReadContract,
      } as any);

      const config = {
        instanceId: 'test-instance',
        protocol: 'api3' as const,
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
    });
  });

  describe('getAvailableDapis', () => {
    it('should return available dAPIs for ethereum', async () => {
      const config = {
        instanceId: 'test-instance',
        protocol: 'api3' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 60000,
        symbols: ['ETH/USD'],
      };

      await service.initialize(config);

      const dapis = service.getAvailableDapis();

      expect(dapis).toContain('ETH/USD');
      expect(dapis).toContain('BTC/USD');
      expect(dapis.length).toBeGreaterThan(0);
    });

    it('should return available dAPIs for polygon', async () => {
      const config = {
        instanceId: 'test-instance',
        protocol: 'api3' as const,
        chain: 'polygon',
        rpcUrl: 'https://polygon.llamarpc.com',
        intervalMs: 60000,
        symbols: ['MATIC/USD'],
      };

      await service.initialize(config);

      const dapis = service.getAvailableDapis();

      expect(dapis).toContain('MATIC/USD');
    });
  });

  describe('isDapiSupported', () => {
    it('should return true for supported dAPI', async () => {
      const config = {
        instanceId: 'test-instance',
        protocol: 'api3' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 60000,
        symbols: ['ETH/USD'],
      };

      await service.initialize(config);

      expect(service.isDapiSupported('ETH/USD')).toBe(true);
      expect(service.isDapiSupported('BTC/USD')).toBe(true);
    });

    it('should return false for unsupported dAPI', async () => {
      const config = {
        instanceId: 'test-instance',
        protocol: 'api3' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 60000,
        symbols: ['ETH/USD'],
      };

      await service.initialize(config);

      expect(service.isDapiSupported('UNKNOWN/USD')).toBe(false);
    });
  });

  describe('encodeDapiName', () => {
    it('should correctly encode dAPI name', async () => {
      const config = {
        instanceId: 'test-instance',
        protocol: 'api3' as const,
        chain: 'ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        intervalMs: 60000,
        symbols: ['ETH/USD'],
      };

      await service.initialize(config);

      const encoded = (service as any).encodeDapiName('ETH/USD');

      expect(encoded).toMatch(/^0x[a-f0-9]{64}$/);
    });
  });
});
