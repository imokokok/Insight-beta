import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealthCheckManager } from '../HealthCheckManager';

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/server/db', () => ({
  query: vi.fn().mockResolvedValue({ rows: [] }),
}));

vi.mock('@/server/websocket/priceStream', () => ({
  priceStreamManager: {
    getStats: vi.fn().mockReturnValue({
      totalClients: 10,
      totalSubscriptions: 20,
    }),
  },
}));

describe('HealthCheckManager', () => {
  let manager: HealthCheckManager;
  const intervalMs = 5000;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    manager = new HealthCheckManager(intervalMs);
  });

  describe('start', () => {
    it('should start health checks at intervals', async () => {
      const callback = vi.fn();
      manager.start(callback);

      await vi.advanceTimersByTimeAsync(intervalMs);

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should stop health checks', () => {
      manager.start();
      expect(manager.isRunning()).toBe(true);

      manager.stop();
      expect(manager.isRunning()).toBe(false);
    });
  });

  describe('performHealthCheck', () => {
    it('should return health check results', async () => {
      const result = await manager.performHealthCheck();

      expect(result).toEqual({
        wsClients: 10,
        wsSubscriptions: 20,
        activeSyncs: 0,
        isRunning: true,
      });
    });

    it('should detect unhealthy instances', async () => {
      const { query } = await import('@/server/db');
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ instance_id: 'instance-1', status: 'error', consecutive_failures: 5 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as unknown as import('pg').QueryResult);

      const result = await manager.performHealthCheck();

      expect(result.unhealthyInstances).toEqual(['instance-1']);
    });

    it('should call callback with results', async () => {
      const callback = vi.fn();
      await manager.performHealthCheck(callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          wsClients: 10,
          wsSubscriptions: 20,
        }),
      );
    });
  });

  describe('isRunning', () => {
    it('should return false when not started', () => {
      expect(manager.isRunning()).toBe(false);
    });

    it('should return true when started', () => {
      manager.start();
      expect(manager.isRunning()).toBe(true);
    });
  });
});
