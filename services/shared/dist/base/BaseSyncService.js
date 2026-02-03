"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseSyncService = void 0;
const logger_1 = require("../utils/logger");
const messageQueue_1 = require("../utils/messageQueue");
const redis_1 = require("../utils/redis");
class BaseSyncService {
    logger;
    config = null;
    isRunning = false;
    syncInterval;
    health = {
        status: 'healthy',
        lastSync: 0,
        consecutiveFailures: 0,
        syncCount: 0,
        errorRate: 0,
    };
    serviceName;
    protocol;
    errorWindow = [];
    constructor(options) {
        this.serviceName = options.serviceName;
        this.protocol = options.protocol;
        this.logger = (0, logger_1.createLogger)({ serviceName: options.serviceName });
    }
    /**
     * Initialize the service with configuration
     */
    async initialize(config) {
        this.config = config;
        await redis_1.redisManager.connect();
        this.logger.info('Service initialized', {
            instanceId: config.instanceId,
            chain: config.chain,
            symbols: config.symbols,
        });
    }
    /**
     * Start the sync service
     */
    async start() {
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
    async stop() {
        if (!this.isRunning)
            return;
        this.logger.info('Stopping sync service');
        this.isRunning = false;
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = undefined;
        }
        await redis_1.redisManager.disconnect();
        this.logger.info('Sync service stopped');
    }
    /**
     * Get current health status
     */
    getHealth() {
        return { ...this.health };
    }
    /**
     * Force a sync operation
     */
    async forceSync() {
        this.logger.info('Force sync triggered');
        await this.performSync();
    }
    /**
     * Perform a single sync operation
     */
    async performSync() {
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
                await messageQueue_1.messageQueue.publishPriceUpdate(this.serviceName, price);
            }
            // Update health status
            this.updateHealthStatus();
            const duration = Date.now() - startTime;
            this.logger.debug('Sync cycle completed', {
                durationMs: duration,
                pricesCount: prices.length,
            });
        }
        catch (error) {
            this.health.consecutiveFailures++;
            this.updateErrorRate(true);
            this.updateHealthStatus();
            this.logger.error('Sync cycle failed', {
                error: error instanceof Error ? error.message : String(error),
                consecutiveFailures: this.health.consecutiveFailures,
            });
        }
        // Publish health update
        await messageQueue_1.messageQueue.publishHealthCheck(this.serviceName, this.health);
    }
    /**
     * Update error rate based on sliding window
     */
    updateErrorRate(isError) {
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
    updateHealthStatus() {
        if (this.health.consecutiveFailures >= 5 || this.health.errorRate > 0.5) {
            this.health.status = 'unhealthy';
        }
        else if (this.health.consecutiveFailures >= 2 || this.health.errorRate > 0.2) {
            this.health.status = 'degraded';
        }
        else {
            this.health.status = 'healthy';
        }
    }
}
exports.BaseSyncService = BaseSyncService;
//# sourceMappingURL=BaseSyncService.js.map