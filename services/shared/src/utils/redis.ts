import type { RedisClientType } from 'redis';
import { createClient } from 'redis';
import { createLogger } from './logger';

const logger = createLogger({ serviceName: 'redis-client' });

export interface RedisConfig {
  url?: string;
  password?: string;
  db?: number;
}

class RedisManager {
  private client: RedisClientType | null = null;
  private config: RedisConfig;

  constructor(config: RedisConfig = {}) {
    this.config = config;
  }

  async connect(): Promise<RedisClientType> {
    if (this.client?.isOpen) {
      return this.client;
    }

    const url = this.config.url || process.env.REDIS_URL || 'redis://localhost:6379';

    this.client = createClient({
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

  async disconnect(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.quit();
      logger.info('Redis Client Disconnected');
    }
  }

  getClient(): RedisClientType {
    if (!this.client) {
      throw new Error('Redis client not connected. Call connect() first.');
    }
    return this.client;
  }

  // Pub/Sub helpers
  async publish(channel: string, message: unknown): Promise<void> {
    const client = this.getClient();
    await client.publish(channel, JSON.stringify(message));
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    const client = this.getClient();
    await client.subscribe(channel, callback);
  }
}

export const redisManager = new RedisManager();
export { RedisManager };
