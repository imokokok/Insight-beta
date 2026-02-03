"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisManager = exports.redisManager = void 0;
const redis_1 = require("redis");
const logger_1 = require("./logger");
const logger = (0, logger_1.createLogger)({ serviceName: 'redis-client' });
class RedisManager {
    client = null;
    config;
    constructor(config = {}) {
        this.config = config;
    }
    async connect() {
        if (this.client?.isOpen) {
            return this.client;
        }
        const url = this.config.url || process.env.REDIS_URL || 'redis://localhost:6379';
        this.client = (0, redis_1.createClient)({
            url,
            password: this.config.password,
        });
        this.client.on('error', (err) => {
            logger.error('Redis Client Error', { error: err.message });
        });
        this.client.on('connect', () => {
            logger.info('Redis Client Connected');
        });
        await this.client.connect();
        return this.client;
    }
    async disconnect() {
        if (this.client?.isOpen) {
            await this.client.quit();
            logger.info('Redis Client Disconnected');
        }
    }
    getClient() {
        if (!this.client) {
            throw new Error('Redis client not connected. Call connect() first.');
        }
        return this.client;
    }
    // Pub/Sub helpers
    async publish(channel, message) {
        const client = this.getClient();
        await client.publish(channel, JSON.stringify(message));
    }
    async subscribe(channel, callback) {
        const client = this.getClient();
        await client.subscribe(channel, callback);
    }
}
exports.RedisManager = RedisManager;
exports.redisManager = new RedisManager();
//# sourceMappingURL=redis.js.map