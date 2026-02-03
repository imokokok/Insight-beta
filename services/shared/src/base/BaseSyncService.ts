import { createLogger } from '../utils/logger';
import { messageQueue } from '../utils/messageQueue';
import { redisManager } from '../utils/redis';
import type { SyncConfig, PriceData, ServiceHealth } from '../types';

export interface SyncServiceOptions {
  serviceName: string;
  protocol: string;
}

export abstract class BaseSyncService {
  protected logger: ReturnType<typeof createLogger>;
  protected config: SyncConfig | null = null;
  protected isRunning = false;
  protected syncInterval?: NodeJS.Timeout;
  protected health: ServiceHealth = {
    status: 'healthy',
    lastSync: 0,
    consecutiveFailures: 0,
    syncCount: 0,
    errorRate: 0,
  };

  private readonly serviceName: string;
  private readonly protocol: string;
  private errorWindow: number[] = [];

  constructor(options: SyncServiceOptions) {
    this.serviceName = options.serviceName;
    this.protocol = options.protocol;
    this.logger = createLogger({ serviceName: options.serviceName });
  }

  /**
   * Initialize the service with configuration
   */
  async initialize(config: SyncConfig): Promise<void> {
    this.config = config;
    await redisManager.connect();
    this.logger.info('Service initialized', {
      instanceId: config.instanceId,
      chain: config.chain,
      symbols: config.symbols,
    });
  }

  /**
   * Start the sync service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Service already running');
      return;
    }

    if (!this.config) {
      throw new Error('Service not initialized. Call initialize() first.');
    }

    this.isRunning = true;
    this.logger.info('Starting sync service');

    // Perform initial sync
    await this.performSync();

    // Set up interval
    this.syncInterval = setInterval(() => this.performSync(), this.config.intervalMs);

    this.logger.info('Sync service started', {
      intervalMs: this.config.intervalMs,
    });
  }

  /**
   * Stop the sync service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.logger.info('Stopping sync service');
    this.isRunning = false;

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }

    await redisManager.disconnect();
    this.logger.info('Sync service stopped');
  }

  /**
   * Get current health status
   */
  getHealth(): ServiceHealth {
    return { ...this.health };
  }

  /**
   * Force a sync operation
   */
  async forceSync(): Promise<void> {
    this.logger.info('Force sync triggered');
    await this.performSync();
  }

  /**
   * Abstract method to fetch prices - must be implemented by subclasses
   */
  protected abstract fetchPrices(): Promise<PriceData[]>;

  /**
   * Perform a single sync operation
   */
  private async performSync(): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger.debug('Starting sync cycle');

      const prices = await this.fetchPrices();

      // Update health metrics
      this.health.lastSync = Date.now();
      this.health.syncCount++;
      this.health.consecutiveFailures = 0;
      this.updateErrorRate(false);

      // Publish prices to message queue
      for (const price of prices) {
        await messageQueue.publishPriceUpdate(this.serviceName, price);
      }

      // Update health status
      this.updateHealthStatus();

      const duration = Date.now() - startTime;
      this.logger.debug('Sync cycle completed', {
        durationMs: duration,
        pricesCount: prices.length,
      });
    } catch (error) {
      this.health.consecutiveFailures++;
      this.updateErrorRate(true);
      this.updateHealthStatus();

      this.logger.error('Sync cycle failed', {
        error: error instanceof Error ? error.message : String(error),
        consecutiveFailures: this.health.consecutiveFailures,
      });
    }

    // Publish health update
    await messageQueue.publishHealthCheck(this.serviceName, this.health);
  }

  /**
   * Update error rate based on sliding window
   */
  private updateErrorRate(isError: boolean): void {
    const windowSize = 100;
    this.errorWindow.push(isError ? 1 : 0);

    if (this.errorWindow.length > windowSize) {
      this.errorWindow.shift();
    }

    const errorCount = this.errorWindow.reduce((a, b) => a + b, 0);
    this.health.errorRate = errorCount / this.errorWindow.length;
  }

  /**
   * Update overall health status
   */
  private updateHealthStatus(): void {
    if (this.health.consecutiveFailures >= 5 || this.health.errorRate > 0.5) {
      this.health.status = 'unhealthy';
    } else if (this.health.consecutiveFailures >= 2 || this.health.errorRate > 0.2) {
      this.health.status = 'degraded';
    } else {
      this.health.status = 'healthy';
    }
  }
}
