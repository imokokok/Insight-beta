/**
 * WebSocket Price Stream Client SDK
 *
 * WebSocket 价格流客户端 SDK
 * - 自动重连机制
 * - 心跳检测
 * - 订阅管理
 * - 类型安全
 */

import { logger } from '@/lib/logger';
import type { SupportedChain } from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// 类型定义
// ============================================================================

export interface PriceStreamClientOptions {
  url: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  onConnect?: () => void;
  onDisconnect?: (code: number, reason: string) => void;
  onError?: (error: Error) => void;
  onPriceUpdate?: (data: PriceUpdateData) => void;
  onComparisonUpdate?: (data: ComparisonUpdateData) => void;
}

export interface PriceUpdateData {
  symbol: string;
  chain: SupportedChain;
  price: number;
  timestamp: number;
  source: string;
  confidence?: number;
}

export interface ComparisonUpdateData {
  symbol: string;
  chain: SupportedChain;
  prices: Array<{
    protocol: string;
    price: number;
    timestamp: number;
    confidence?: number;
  }>;
  priceDeviation: number;
  isValid: boolean;
}

export interface WebSocketStats {
  totalClients: number;
  totalSubscriptions: number;
  messagesPerSecond: number;
  averageLatency: number;
  uptime: number;
}

export type Subscription = {
  symbol: string;
  chain?: SupportedChain;
};

// ============================================================================
// 价格流客户端
// ============================================================================

export class PriceStreamClient {
  private ws: WebSocket | null = null;
  private options: Required<PriceStreamClientOptions>;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private subscriptions: Set<string> = new Set();
  private isConnected = false;
  private isConnecting = false;
  private clientId: string | null = null;
  private messageCount = 0;
  private lastPingTime = 0;
  private latencyMeasurements: number[] = [];

  // 默认配置
  private static readonly DEFAULT_OPTIONS: Omit<Required<PriceStreamClientOptions>, 'url'> = {
    autoReconnect: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000,
    onConnect: () => {},
    onDisconnect: () => {},
    onError: () => {},
    onPriceUpdate: () => {},
    onComparisonUpdate: () => {},
  };

  constructor(options: PriceStreamClientOptions) {
    this.options = {
      ...PriceStreamClient.DEFAULT_OPTIONS,
      ...options,
    };
  }

  /**
   * 连接到 WebSocket 服务器
   */
  connect(): void {
    if (this.isConnected || this.isConnecting) {
      logger.warn('Already connected or connecting');
      return;
    }

    this.isConnecting = true;
    logger.info(`Connecting to ${this.options.url}`);

    try {
      this.ws = new WebSocket(this.options.url);
      this.setupEventHandlers();
    } catch (error) {
      this.handleError(error as Error);
      this.scheduleReconnect();
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.clearTimers();
    this.reconnectAttempts = 0;

    if (this.ws) {
      // 正常关闭，不触发重连
      const ws = this.ws;
      this.ws = null;
      ws.close(1000, 'Client disconnect');
    }

    this.isConnected = false;
    this.isConnecting = false;
    this.clientId = null;
  }

  /**
   * 订阅价格更新
   */
  subscribe(symbols: string[], chain?: SupportedChain): void {
    if (!this.isConnected) {
      logger.warn('Cannot subscribe: not connected');
      return;
    }

    // 保存订阅信息
    symbols.forEach((symbol) => {
      const key = `${symbol}:${chain || 'ethereum'}`;
      this.subscriptions.add(key);
    });

    this.send({
      type: 'subscribe',
      symbols,
      chain,
    });
  }

  /**
   * 批量订阅
   */
  batchSubscribe(subscriptions: Subscription[]): void {
    if (!this.isConnected) {
      logger.warn('Cannot subscribe: not connected');
      return;
    }

    subscriptions.forEach((sub) => {
      const key = `${sub.symbol}:${sub.chain || 'ethereum'}`;
      this.subscriptions.add(key);
    });

    this.send({
      type: 'batch_subscribe',
      subscriptions,
    });
  }

  /**
   * 取消订阅
   */
  unsubscribe(symbols: string[]): void {
    if (!this.isConnected) {
      logger.warn('Cannot unsubscribe: not connected');
      return;
    }

    // 移除订阅信息
    symbols.forEach((symbol) => {
      for (const chain of ['ethereum', 'polygon', 'arbitrum', 'optimism']) {
        this.subscriptions.delete(`${symbol}:${chain}`);
      }
    });

    this.send({
      type: 'unsubscribe',
      symbols,
    });
  }

  /**
   * 获取跨预言机价格对比
   */
  getComparison(symbol: string, chain?: SupportedChain): void {
    if (!this.isConnected) {
      logger.warn('Cannot get comparison: not connected');
      return;
    }

    this.send({
      type: 'get_comparison',
      symbol,
      chain,
    });
  }

  /**
   * 请求服务器统计
   */
  requestServerStats(): void {
    if (!this.isConnected) {
      logger.warn('Cannot get stats: not connected');
      return;
    }

    this.send({
      type: 'get_stats',
    });
  }

  /**
   * 发送 ping
   */
  ping(): void {
    if (!this.isConnected) return;

    this.lastPingTime = Date.now();
    this.send({ type: 'ping' });
  }

  /**
   * 是否已连接
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * 获取客户端 ID
   */
  get id(): string | null {
    return this.clientId;
  }

  /**
   * 获取当前订阅
   */
  get currentSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    isConnected: boolean;
    clientId: string | null;
    subscriptions: number;
    messagesReceived: number;
    averageLatency: number;
  } {
    const avgLatency =
      this.latencyMeasurements.length > 0
        ? this.latencyMeasurements.reduce((a, b) => a + b, 0) / this.latencyMeasurements.length
        : 0;

    return {
      isConnected: this.isConnected,
      clientId: this.clientId,
      subscriptions: this.subscriptions.size,
      messagesReceived: this.messageCount,
      averageLatency: Math.round(avgLatency * 100) / 100,
    };
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.isConnected = true;
      this.isConnecting = false;
      this.reconnectAttempts = 0;

      logger.info('WebSocket connected');
      this.options.onConnect();

      // 启动心跳
      this.startHeartbeat();

      // 重新订阅之前的订阅
      if (this.subscriptions.size > 0) {
        const subs = Array.from(this.subscriptions).map((key) => {
          const [symbol, chain] = key.split(':') as [string, SupportedChain];
          return { symbol, chain };
        });
        this.batchSubscribe(subs);
      }
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data as string);
    };

    this.ws.onclose = (event) => {
      this.isConnected = false;
      this.isConnecting = false;
      this.clearTimers();

      logger.info(`WebSocket closed: ${event.code} - ${event.reason}`);
      this.options.onDisconnect(event.code, event.reason);

      // 如果不是正常关闭，尝试重连
      if (event.code !== 1000 && this.options.autoReconnect) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (_error) => {
      this.handleError(new Error('WebSocket error'));
    };
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      this.messageCount++;

      switch (message.type) {
        case 'connected':
          this.clientId = message.clientId;
          logger.debug(`Connected with client ID: ${this.clientId}`);
          break;

        case 'price_update':
          this.options.onPriceUpdate(message.data as PriceUpdateData);
          break;

        case 'comparison_update':
          this.options.onComparisonUpdate(message.data as ComparisonUpdateData);
          break;

        case 'pong': {
          const latency = Date.now() - this.lastPingTime;
          this.latencyMeasurements.push(latency);
          if (this.latencyMeasurements.length > 100) {
            this.latencyMeasurements.shift();
          }
          logger.debug(`Ping latency: ${latency}ms`);
          break;
        }

        case 'subscribed':
          logger.debug(`Subscribed to: ${message.symbols.join(', ')}`);
          break;

        case 'unsubscribed':
          logger.debug(`Unsubscribed from: ${message.symbols.join(', ')}`);
          break;

        case 'stats':
          logger.debug('Server stats:', message.data);
          break;

        case 'error':
          logger.error(`Server error: ${message.message}`, { code: message.code });
          break;

        default:
          logger.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      logger.error('Failed to parse message', { error, data: data.slice(0, 200) });
    }
  }

  private handleError(error: Error): void {
    logger.error('WebSocket error', { error: error.message });
    this.options.onError(error);
  }

  private send(data: object): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('Cannot send: WebSocket not open');
      return;
    }

    try {
      this.ws.send(JSON.stringify(data));
    } catch (error) {
      logger.error('Failed to send message', { error });
    }
  }

  private scheduleReconnect(): void {
    if (!this.options.autoReconnect) return;
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      logger.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.options.reconnectInterval * Math.min(this.reconnectAttempts, 5);

    logger.info(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.ping();
    }, this.options.heartbeatInterval);
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

// ============================================================================
// React Hook (可选)
// ============================================================================

import { useEffect, useRef, useState, useCallback } from 'react';

export interface UsePriceStreamOptions {
  url: string;
  symbols: string[];
  chain?: SupportedChain;
  onPriceUpdate?: (data: PriceUpdateData) => void;
  onComparisonUpdate?: (data: ComparisonUpdateData) => void;
}

export function usePriceStream(options: UsePriceStreamOptions) {
  const clientRef = useRef<PriceStreamClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState<ReturnType<PriceStreamClient['getStats']> | null>(null);

  useEffect(() => {
    const client = new PriceStreamClient({
      url: options.url,
      onConnect: () => {
        setIsConnected(true);
        client.subscribe(options.symbols, options.chain);
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
      onPriceUpdate: options.onPriceUpdate,
      onComparisonUpdate: options.onComparisonUpdate,
    });

    clientRef.current = client;
    client.connect();

    // 定期更新统计
    const statsInterval = setInterval(() => {
      setStats(client.getStats());
    }, 5000);

    return () => {
      clearInterval(statsInterval);
      client.disconnect();
      clientRef.current = null;
    };
  }, [options.url]);

  // 当 symbols 变化时重新订阅
  useEffect(() => {
    if (clientRef.current && isConnected) {
      clientRef.current.subscribe(options.symbols, options.chain);
    }
  }, [options.symbols, options.chain, isConnected]);

  const getComparison = useCallback(
    (symbol: string) => {
      clientRef.current?.getComparison(symbol, options.chain);
    },
    [options.chain],
  );

  return {
    isConnected,
    stats,
    getComparison,
    client: clientRef.current,
  };
}

// ============================================================================
// 导出
// ============================================================================

export default PriceStreamClient;
