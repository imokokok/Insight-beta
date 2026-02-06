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

  // EWMA (Exponentially Weighted Moving Average) 错误率计算
  private readonly ewmaAlpha: number; // 平滑因子，默认 0.1 表示新样本权重 10%
  private errorRateEwma: number; // EWMA 错误率

  constructor(options: SyncServiceOptions) {
    this.serviceName = options.serviceName;
    this.protocol = options.protocol;
    this.logger = createLogger({ serviceName: options.serviceName });

    // 可配置的 EWMA 平滑因子，可通过环境变量调整
    // 较小的值（如 0.05）对历史数据更敏感，较大的值（如 0.2）对新数据更敏感
    this.ewmaAlpha = parseFloat(process.env.SYNC_EWMA_ALPHA || '0.1');
    this.errorRateEwma = 0;
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
   * Update error rate using EWMA (Exponentially Weighted Moving Average)
   *
   * EWMA 相比滑动窗口的优势：
   * 1. 不需要存储历史数据，内存效率高
   * 2. 对近期错误更敏感，能快速响应问题
   * 3. 平滑因子可配置，适应不同场景
   *
   * 公式: EWMA_t = α * x_t + (1 - α) * EWMA_{t-1}
   * 其中 α 是平滑因子，x_t 是当前样本（0 或 1）
   */
  private updateErrorRate(isError: boolean): void {
    const currentValue = isError ? 1 : 0;

    // 首次计算时直接赋值
    if (this.health.syncCount === 0) {
      this.errorRateEwma = currentValue;
    } else {
      // EWMA 公式
      this.errorRateEwma =
        this.ewmaAlpha * currentValue + (1 - this.ewmaAlpha) * this.errorRateEwma;
    }

    this.health.errorRate = this.errorRateEwma;

    // 记录调试信息
    if (this.health.syncCount % 10 === 0) {
      this.logger.debug('Error rate updated', {
        errorRate: this.errorRateEwma.toFixed(4),
        alpha: this.ewmaAlpha,
        isError,
        syncCount: this.health.syncCount,
      });
    }
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
