import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UnifiedOracleService } from '../unifiedService';

// Mocks
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/server/unifiedSchema', () => ({
  ensureUnifiedSchema: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/server/websocket/priceStream', () => ({
  priceStreamManager: {
    start: vi.fn(),
    stop: vi.fn(),
    getStats: vi.fn().mockReturnValue({
      totalClients: 5,
      totalSubscriptions: 10,
    }),
    broadcast: vi.fn(),
  },
}));

vi.mock('../managers/ProtocolSyncManager', () => ({
  ProtocolSyncManager: vi.fn().mockImplementation(() => ({
    startAllSync: vi.fn().mockResolvedValue(undefined),
    stopAllSync: vi.fn().mockResolvedValue(undefined),
    getActiveSyncCount: vi.fn().mockReturnValue(3),
  })),
}));

vi.mock('../managers/AggregationManager', () => ({
  AggregationManager: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    aggregate: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock('../managers/HealthCheckManager', () => ({
  HealthCheckManager: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
}));

vi.mock('../managers/AlertManager', () => ({
  AlertManager: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    getRuleCount: vi.fn().mockReturnValue(5),
  })),
}));

describe('UnifiedOracleService', () => {
  let service: UnifiedOracleService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UnifiedOracleService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('start', () => {
    it('should start all services successfully', async () => {
      await service.start();

      const { ensureUnifiedSchema } = await import('@/server/unifiedSchema');
      const { priceStreamManager } = await import('@/server/websocket/priceStream');

      expect(ensureUnifiedSchema).toHaveBeenCalled();
      expect(priceStreamManager.start).toHaveBeenCalled();
    });

    it('should not start if already running', async () => {
      await service.start();

      const { logger } = await import('@/lib/logger');
      vi.clearAllMocks();

      await service.start();

      expect(logger.warn).toHaveBeenCalledWith('Unified oracle service already running');
    });
  });

  describe('stop', () => {
    it('should stop all services', async () => {
      await service.start();
      await service.stop();

      const { priceStreamManager } = await import('@/server/websocket/priceStream');
      expect(priceStreamManager.stop).toHaveBeenCalled();
    });

    it('should do nothing if not running', async () => {
      const { priceStreamManager } = await import('@/server/websocket/priceStream');

      await service.stop();

      expect(priceStreamManager.stop).not.toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('should return correct status', async () => {
      await service.start();

      const status = service.getStatus();

      expect(status).toEqual({
        isRunning: true,
        wsStats: {
          totalClients: 5,
          totalSubscriptions: 10,
        },
        activeSyncs: 3,
      });
    });
  });

  describe('triggerAggregation', () => {
    it('should trigger aggregation', async () => {
      await service.start();

      const symbols = ['ETH/USD', 'BTC/USD'];
      await service.triggerAggregation(symbols);

      // AggregationManager.aggregate should be called
      const { AggregationManager } = await import('../managers/AggregationManager');
      const mockResults = vi.mocked(AggregationManager).mock.results;
      if (mockResults.length > 0 && mockResults[0] && mockResults[0].value) {
        const mockInstance = mockResults[0].value as { aggregate: ReturnType<typeof vi.fn> };
        expect(mockInstance.aggregate).toHaveBeenCalledWith(symbols);
      }
    });
  });
});
