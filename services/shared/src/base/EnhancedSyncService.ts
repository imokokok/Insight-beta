import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'http';

import { z } from 'zod';

import { createLogger } from '../utils/logger';
import { messageQueue } from '../utils/messageQueue';
import { redisManager } from '../utils/redis';

import type { SyncConfig, PriceData, ServiceHealth } from '../types';

export interface SyncServiceOptions {
  serviceName: string;
  protocol: string;
}

// 配置验证 Schema
const SyncConfigSchema = z.object({
  instanceId: z.string().min(1),
  protocol: z.string().min(1),
  chain: z.string().min(1),
  rpcUrl: z.string().url(),
  intervalMs: z.number().int().min(1000).max(3600000),
  symbols: z.array(z.string().min(1)).min(1).max(100),
  customConfig: z.record(z.unknown()).optional(),
});

// 重试配置
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

// 指标数据
interface ServiceMetrics {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  totalPricesFetched: number;
  averageSyncDuration: number;
  lastSyncDuration: number;
  startTime: number;
}

export abstract class EnhancedSyncService {
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
  protected metrics: ServiceMetrics = {
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    totalPricesFetched: 0,
    averageSyncDuration: 0,
    lastSyncDuration: 0,
    startTime: Date.now(),
  };

  private readonly serviceName: string;
  private readonly protocol: string;
  private readonly ewmaAlpha: number;
  private errorRateEwma: number;
  private httpServer: Server | null = null;
  private readonly retryConfig: RetryConfig;
  private syncDurations: number[] = [];

  constructor(options: SyncServiceOptions) {
    this.serviceName = options.serviceName;
    this.protocol = options.protocol;
    this.logger = createLogger({ serviceName: options.serviceName });
    this.ewmaAlpha = parseFloat(process.env.SYNC_EWMA_ALPHA || '0.1');
    this.errorRateEwma = 0;

    // 重试配置
    this.retryConfig = {
      maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
      baseDelayMs: parseInt(process.env.RETRY_BASE_DELAY_MS || '1000', 10),
      maxDelayMs: parseInt(process.env.RETRY_MAX_DELAY_MS || '30000', 10),
      backoffMultiplier: parseFloat(process.env.RETRY_BACKOFF_MULTIPLIER || '2'),
    };
  }

  /**
   * Initialize the service with configuration
   */
  async initialize(config: SyncConfig): Promise<void> {
    // 验证配置
    const validationResult = SyncConfigSchema.safeParse(config);
    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      throw new Error(`Invalid configuration: ${errors}`);
    }

    this.config = config;
    await redisManager.connect();

    // 启动 HTTP 服务器
    await this.startHttpServer();

    this.logger.info('Service initialized', {
      instanceId: config.instanceId,
      chain: config.chain,
      symbols: config.symbols,
      intervalMs: config.intervalMs,
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
    this.metrics.startTime = Date.now();
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

    // 停止 HTTP 服务器
    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer?.close(() => resolve());
      });
      this.httpServer = null;
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
   * Get service metrics
   */
  getMetrics(): ServiceMetrics {
    return { ...this.metrics };
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
   * Perform a single sync operation with retry logic
   */
  private async performSync(): Promise<void> {
    const startTime = Date.now();
    this.metrics.totalSyncs++;

    try {
      this.logger.debug('Starting sync cycle');

      const prices = await this.fetchPricesWithRetry();

      // Update health metrics
      this.health.lastSync = Date.now();
      this.health.syncCount++;
      this.health.consecutiveFailures = 0;
      this.updateErrorRate(false);

      // Update metrics
      this.metrics.successfulSyncs++;
      this.metrics.totalPricesFetched += prices.length;

      // Publish prices to message queue
      for (const price of prices) {
        await messageQueue.publishPriceUpdate(this.serviceName, price);
      }

      // Update health status
      this.updateHealthStatus();

      const duration = Date.now() - startTime;
      this.metrics.lastSyncDuration = duration;
      this.updateAverageSyncDuration(duration);

      this.logger.debug('Sync cycle completed', {
        durationMs: duration,
        pricesCount: prices.length,
      });
    } catch (error) {
      this.metrics.failedSyncs++;
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
   * Fetch prices with retry logic
   */
  private async fetchPricesWithRetry(): Promise<PriceData[]> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await this.fetchPrices();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.retryConfig.maxRetries) {
          const delay = this.calculateRetryDelay(attempt);
          this.logger.warn(`Fetch attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
            error: lastError.message,
            attempt: attempt + 1,
            maxRetries: this.retryConfig.maxRetries,
          });
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Failed to fetch prices after retries');
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const delay = Math.min(
      this.retryConfig.baseDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt),
      this.retryConfig.maxDelayMs,
    );
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Update average sync duration
   */
  private updateAverageSyncDuration(duration: number): void {
    this.syncDurations.push(duration);
    // Keep last 100 durations
    if (this.syncDurations.length > 100) {
      this.syncDurations.shift();
    }
    this.metrics.averageSyncDuration =
      this.syncDurations.reduce((a, b) => a + b, 0) / this.syncDurations.length;
  }

  /**
   * Update error rate using EWMA
   */
  private updateErrorRate(isError: boolean): void {
    const currentValue = isError ? 1 : 0;

    if (this.health.syncCount === 0) {
      this.errorRateEwma = currentValue;
    } else {
      this.errorRateEwma =
        this.ewmaAlpha * currentValue + (1 - this.ewmaAlpha) * this.errorRateEwma;
    }

    this.health.errorRate = this.errorRateEwma;

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

  /**
   * Start HTTP server for health checks and metrics
   */
  private async startHttpServer(): Promise<void> {
    const port = parseInt(process.env.HTTP_PORT || '3000', 10);

    this.httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
      this.handleHttpRequest(req, res);
    });

    return new Promise((resolve, reject) => {
      this.httpServer?.listen(port, () => {
        this.logger.info(`HTTP server started on port ${port}`);
        resolve();
      });

      this.httpServer?.on('error', (error) => {
        this.logger.error('HTTP server error', { error: error.message });
        reject(error);
      });
    });
  }

  /**
   * Handle HTTP requests
   */
  private handleHttpRequest(req: IncomingMessage, res: ServerResponse): void {
    const url = req.url || '/';
    const method = req.method || 'GET';

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    switch (url) {
      case '/health':
        this.handleHealthCheck(res);
        break;
      case '/metrics':
        this.handleMetrics(res);
        break;
      case '/ready':
        this.handleReadinessCheck(res);
        break;
      case '/config':
        this.handleConfig(res);
        break;
      default:
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
  }

  /**
   * Handle health check request
   */
  private handleHealthCheck(res: ServerResponse): void {
    const health = this.getHealth();
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: health.status,
        lastSync: health.lastSync,
        consecutiveFailures: health.consecutiveFailures,
        errorRate: health.errorRate,
        uptime: Date.now() - this.metrics.startTime,
      }),
    );
  }

  /**
   * Handle metrics request
   */
  private handleMetrics(res: ServerResponse): void {
    const metrics = this.getMetrics();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ...metrics,
        uptime: Date.now() - metrics.startTime,
      }),
    );
  }

  /**
   * Handle readiness check
   */
  private handleReadinessCheck(res: ServerResponse): void {
    const isReady = this.isRunning && this.health.status !== 'unhealthy';
    const statusCode = isReady ? 200 : 503;

    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ready: isReady,
        running: this.isRunning,
        status: this.health.status,
      }),
    );
  }

  /**
   * Handle config request
   */
  private handleConfig(res: ServerResponse): void {
    if (!this.config) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Service not initialized' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        instanceId: this.config.instanceId,
        protocol: this.config.protocol,
        chain: this.config.chain,
        intervalMs: this.config.intervalMs,
        symbols: this.config.symbols,
      }),
    );
  }
}
