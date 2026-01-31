/**
 * WebSocket Redis Adapter
 *
 * WebSocket Redis 适配器 - 用于多实例部署时的消息广播
 * - 支持多服务器实例间的消息同步
 * - 使用 Redis Pub/Sub 实现消息广播
 * - 自动故障转移和重连
 */

import { createClient, RedisClientType } from 'redis';
import { logger } from '@/lib/logger';

// ============================================================================
// 类型定义
// ============================================================================

export interface RedisAdapterConfig {
  url: string;
  channelPrefix?: string;
  instanceId?: string;
}

export type MessageHandler = (channel: string, message: unknown) => void;

// ============================================================================
// Redis Adapter
// ============================================================================

export class WebSocketRedisAdapter {
  private publisher: RedisClientType | null = null;
  private subscriber: RedisClientType | null = null;
  private config: Required<RedisAdapterConfig>;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private isConnected: boolean = false;
  private reconnectTimer?: NodeJS.Timeout;

  constructor(config: RedisAdapterConfig) {
    this.config = {
      url: config.url,
      channelPrefix: config.channelPrefix || 'ws:price:',
      instanceId: config.instanceId || `instance-${Date.now()}`,
    };
  }

  // ============================================================================
  // 连接管理
  // ============================================================================

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      // 创建发布客户端
      this.publisher = createClient({
        url: this.config.url,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 100, 5000),
        },
      });

      // 创建订阅客户端
      this.subscriber = createClient({
        url: this.config.url,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 100, 5000),
        },
      });

      // 错误处理
      this.publisher.on('error', (err) => {
        logger.error('Redis publisher error', { error: err.message });
      });

      this.subscriber.on('error', (err) => {
        logger.error('Redis subscriber error', { error: err.message });
      });

      // 连接
      await this.publisher.connect();
      await this.subscriber.connect();

      // 设置消息处理器
      this.subscriber.on('message', (channel, message) => {
        this.handleMessage(channel, message);
      });

      this.isConnected = true;
      logger.info('WebSocket Redis Adapter connected', {
        instanceId: this.config.instanceId,
      });
    } catch (error) {
      logger.error('Failed to connect Redis adapter', {
        error: error instanceof Error ? error.message : String(error),
      });
      this.scheduleReconnect();
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }

    if (this.publisher) {
      await this.publisher.quit();
      this.publisher = null;
    }

    this.isConnected = false;
    logger.info('WebSocket Redis Adapter disconnected');
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect().catch(() => {
        // 重连失败，继续尝试
      });
    }, 5000);
  }

  // ============================================================================
  // 消息发布
  // ============================================================================

  async publish(channel: string, message: unknown): Promise<void> {
    if (!this.publisher || !this.isConnected) {
      logger.warn('Cannot publish, Redis not connected');
      return;
    }

    try {
      const fullChannel = `${this.config.channelPrefix}${channel}`;
      const messageObj = typeof message === 'object' && message !== null ? message : { data: message };
      const serialized = JSON.stringify({
        ...messageObj,
        _instanceId: this.config.instanceId,
        _timestamp: Date.now(),
      });

      await this.publisher.publish(fullChannel, serialized);
    } catch (error) {
      logger.error('Failed to publish message', {
        error: error instanceof Error ? error.message : String(error),
        channel,
      });
    }
  }

  // ============================================================================
  // 消息订阅
  // ============================================================================

  async subscribe(channel: string, handler: MessageHandler): Promise<void> {
    if (!this.subscriber || !this.isConnected) {
      logger.warn('Cannot subscribe, Redis not connected');
      return;
    }

    const fullChannel = `${this.config.channelPrefix}${channel}`;

    // 注册处理器
    if (!this.messageHandlers.has(channel)) {
      this.messageHandlers.set(channel, new Set());
      // 首次订阅，执行 Redis SUBSCRIBE
      await this.subscriber.subscribe(fullChannel, (message) => {
        this.handleMessage(channel, message);
      });
    }

    this.messageHandlers.get(channel)!.add(handler);
    logger.debug('Subscribed to channel', { channel });
  }

  async unsubscribe(channel: string, handler?: MessageHandler): Promise<void> {
    if (!this.subscriber || !this.isConnected) return;

    const fullChannel = `${this.config.channelPrefix}${channel}`;
    const handlers = this.messageHandlers.get(channel);

    if (handler && handlers) {
      handlers.delete(handler);
    }

    // 如果没有处理器了，取消订阅
    if (!handler || !handlers || handlers.size === 0) {
      this.messageHandlers.delete(channel);
      await this.subscriber.unsubscribe(fullChannel);
      logger.debug('Unsubscribed from channel', { channel });
    }
  }

  // ============================================================================
  // 消息处理
  // ============================================================================

  private handleMessage(channel: string, message: string): void {
    try {
      const parsed = JSON.parse(message);

      // 不处理自己发送的消息
      if (parsed._instanceId === this.config.instanceId) {
        return;
      }

      // 移除内部字段
      const { _instanceId, _timestamp, ...data } = parsed;

      // 调用注册的处理器
      const handlers = this.messageHandlers.get(channel);
      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(channel, data);
          } catch (error) {
            logger.error('Message handler error', {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        });
      }
    } catch (error) {
      logger.error('Failed to handle message', {
        error: error instanceof Error ? error.message : String(error),
        channel,
      });
    }
  }

  // ============================================================================
  // 状态检查
  // ============================================================================

  getStatus(): {
    isConnected: boolean;
    instanceId: string;
    subscribedChannels: string[];
  } {
    return {
      isConnected: this.isConnected,
      instanceId: this.config.instanceId,
      subscribedChannels: Array.from(this.messageHandlers.keys()),
    };
  }
}

// ============================================================================
// 单例实例
// ============================================================================

let globalAdapter: WebSocketRedisAdapter | null = null;

export function getRedisAdapter(config?: RedisAdapterConfig): WebSocketRedisAdapter {
  if (!globalAdapter && config) {
    globalAdapter = new WebSocketRedisAdapter(config);
  }
  if (!globalAdapter) {
    throw new Error('Redis adapter not initialized');
  }
  return globalAdapter;
}

export function createRedisAdapter(config: RedisAdapterConfig): WebSocketRedisAdapter {
  return new WebSocketRedisAdapter(config);
}
