/**
 * Orchestrator Service
 * 服务编排器 - 协调和管理所有预言机微服务
 */

import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'http';

import { createLogger, messageQueue, redisManager } from '@oracle-monitor/shared';

import { PriceAggregator } from './PriceAggregator';
import { ServiceRegistry } from './ServiceRegistry';

import type {
  OrchestratorConfig,
  ServiceInstance,
  ServiceHealth,
  SystemStatus,
  AggregatedPrice,
  AlertRule,
} from './types';
import type { ProtocolMessage } from '@oracle-monitor/shared';

export class OrchestratorService {
  private readonly logger: ReturnType<typeof createLogger>;
  private readonly config: OrchestratorConfig;
  private readonly registry: ServiceRegistry;
  private readonly aggregator: PriceAggregator;
  private httpServer: Server | null = null;
  private isRunning = false;
  private cleanupTimer?: NodeJS.Timeout;
  private alertRules: AlertRule[] = [];

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = {
      redisUrl: config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
      httpPort: config.httpPort || parseInt(process.env.HTTP_PORT || '8080', 10),
      healthCheckIntervalMs: config.healthCheckIntervalMs || 30000,
      aggregationEnabled: config.aggregationEnabled ?? true,
      maxPriceAgeMs: config.maxPriceAgeMs || 300000, // 5 minutes
      deviationThreshold: config.deviationThreshold || 0.05, // 5%
    };

    this.logger = createLogger({ serviceName: 'orchestrator' });
    this.registry = new ServiceRegistry({
      redisUrl: this.config.redisUrl,
      healthCheckIntervalMs: this.config.healthCheckIntervalMs,
    });
    this.aggregator = new PriceAggregator({
      deviationThreshold: this.config.deviationThreshold,
      maxPriceAgeMs: this.config.maxPriceAgeMs,
    });
  }

  /**
   * Initialize the orchestrator
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing orchestrator service', {
      port: this.config.httpPort,
      aggregationEnabled: this.config.aggregationEnabled,
    });

    // Initialize Redis
    await redisManager.connect();

    // Initialize registry
    await this.registry.initialize();

    // Initialize aggregator
    await this.aggregator.initialize();

    // Start HTTP server
    await this.startHttpServer();

    // Subscribe to message queue
    await this.subscribeToMessages();

    // Start cleanup timer
    this.startCleanupTimer();

    this.logger.info('Orchestrator initialized successfully');
  }

  /**
   * Start the orchestrator
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Orchestrator already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('Orchestrator started');
  }

  /**
   * Stop the orchestrator
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.logger.info('Stopping orchestrator');
    this.isRunning = false;

    // Stop cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Stop HTTP server
    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer?.close(() => resolve());
      });
      this.httpServer = null;
    }

    // Stop registry
    await this.registry.stop();

    // Disconnect Redis
    await redisManager.disconnect();

    this.logger.info('Orchestrator stopped');
  }

  /**
   * Register a service instance
   */
  registerService(instance: ServiceInstance): void {
    this.registry.registerService(instance);
  }

  /**
   * Get system status
   */
  getSystemStatus(): SystemStatus {
    const services = this.registry.getAllServices();
    const prices = this.aggregator.getAllAggregatedPrices();
    const deviatedSymbols = this.aggregator.getDeviatedSymbols();

    // Calculate system health
    const healthyCount = services.filter((s) => s.health.status === 'healthy').length;
    const totalCount = services.length;
    let systemHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (totalCount > 0) {
      const healthRatio = healthyCount / totalCount;
      if (healthRatio < 0.5) {
        systemHealth = 'unhealthy';
      } else if (healthRatio < 0.8) {
        systemHealth = 'degraded';
      }
    }

    return {
      services,
      totalPrices: prices.length,
      activeAlerts: deviatedSymbols.length,
      systemHealth,
      lastUpdate: Date.now(),
    };
  }

  /**
   * Get aggregated prices
   */
  getAggregatedPrices(): AggregatedPrice[] {
    return this.aggregator.getAllAggregatedPrices();
  }

  /**
   * Get aggregated price for a symbol
   */
  getAggregatedPrice(symbol: string): AggregatedPrice | null {
    return this.aggregator.getAggregatedPrice(symbol);
  }

  /**
   * Get price comparison for a symbol
   */
  getPriceComparison(symbol: string) {
    return this.aggregator.getPriceComparison(symbol);
  }

  /**
   * Get deviated symbols
   */
  getDeviatedSymbols(threshold?: number) {
    return this.aggregator.getDeviatedSymbols(threshold);
  }

  /**
   * Add alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
    this.logger.info('Alert rule added', { ruleId: rule.id, name: rule.name });
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): boolean {
    const index = this.alertRules.findIndex((r) => r.id === ruleId);
    if (index >= 0) {
      this.alertRules.splice(index, 1);
      this.logger.info('Alert rule removed', { ruleId });
      return true;
    }
    return false;
  }

  /**
   * Get alert rules
   */
  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  /**
   * Start HTTP server
   */
  private async startHttpServer(): Promise<void> {
    this.httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
      this.handleHttpRequest(req, res);
    });

    return new Promise((resolve, reject) => {
      this.httpServer?.listen(this.config.httpPort, () => {
        this.logger.info(`HTTP server started on port ${this.config.httpPort}`);
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
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const pathname = url.pathname;
    const method = req.method || 'GET';

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Route handling
    try {
      switch (pathname) {
        case '/health':
          this.handleHealthCheck(res);
          break;
        case '/status':
          this.handleStatus(res);
          break;
        case '/services':
          this.handleServices(res);
          break;
        case '/prices':
          this.handlePrices(res, url);
          break;
        case '/comparison':
          this.handleComparison(res, url);
          break;
        case '/alerts':
          this.handleAlerts(res);
          break;
        case '/metrics':
          this.handleMetrics(res);
          break;
        default:
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not found' }));
      }
    } catch (error) {
      this.logger.error('Request handling error', {
        pathname,
        error: error instanceof Error ? error.message : String(error),
      });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }

  /**
   * Handle health check
   */
  private handleHealthCheck(res: ServerResponse): void {
    const status = this.getSystemStatus();
    const isHealthy = status.systemHealth === 'healthy';
    const statusCode = isHealthy ? 200 : status.systemHealth === 'degraded' ? 200 : 503;

    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: isHealthy ? 'healthy' : status.systemHealth,
        services: status.services.length,
        prices: status.totalPrices,
        alerts: status.activeAlerts,
        timestamp: Date.now(),
      }),
    );
  }

  /**
   * Handle status request
   */
  private handleStatus(res: ServerResponse): void {
    const status = this.getSystemStatus();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status));
  }

  /**
   * Handle services request
   */
  private handleServices(res: ServerResponse): void {
    const services = this.registry.getAllServices();
    const counts = this.registry.getServiceCounts();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        services,
        counts,
        protocols: this.registry.getProtocols(),
        chains: this.registry.getChains(),
      }),
    );
  }

  /**
   * Handle prices request
   */
  private handlePrices(res: ServerResponse, url: URL): void {
    const symbol = url.searchParams.get('symbol');

    if (symbol) {
      const price = this.getAggregatedPrice(symbol);
      if (price) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(price));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Price not found' }));
      }
    } else {
      const prices = this.getAggregatedPrices();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ prices }));
    }
  }

  /**
   * Handle comparison request
   */
  private handleComparison(res: ServerResponse, url: URL): void {
    const symbol = url.searchParams.get('symbol');

    if (symbol) {
      const comparison = this.getPriceComparison(symbol);
      if (comparison) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(comparison));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Comparison not found' }));
      }
    } else {
      const deviated = this.getDeviatedSymbols();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ deviatedSymbols: deviated }));
    }
  }

  /**
   * Handle alerts request
   */
  private handleAlerts(res: ServerResponse): void {
    const deviated = this.getDeviatedSymbols();
    const rules = this.getAlertRules();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        activeAlerts: deviated,
        rules,
      }),
    );
  }

  /**
   * Handle metrics request
   */
  private handleMetrics(res: ServerResponse): void {
    const stats = this.aggregator.getStats();
    const serviceCounts = this.registry.getServiceCounts();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        aggregator: stats,
        services: serviceCounts,
        timestamp: Date.now(),
      }),
    );
  }

  /**
   * Subscribe to message queue
   */
  private async subscribeToMessages(): Promise<void> {
    // Subscribe to price updates
    await messageQueue.subscribeToPrices((message: ProtocolMessage) => {
      try {
        const data = message.payload as {
          symbol: string;
          protocol: string;
          chain: string;
          price: number;
          timestamp: number;
          confidence: number;
        };
        this.aggregator.addPrice(
          data.symbol,
          data.protocol,
          data.chain,
          data.price,
          data.timestamp,
          data.confidence,
        );
      } catch (error) {
        this.logger.error('Failed to process price update', { error });
      }
    });

    // Subscribe to health checks
    await messageQueue.subscribeToHealth((message: ProtocolMessage) => {
      try {
        const data = message.payload as {
          instanceId: string;
          health: ServiceHealth;
        };
        this.registry.updateServiceHealth(data.instanceId, data.health);
      } catch (error) {
        this.logger.error('Failed to process health check', { error });
      }
    });

    this.logger.info('Subscribed to message queue');
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.aggregator.cleanupOldData();
    }, 60000); // Clean up every minute
  }
}
