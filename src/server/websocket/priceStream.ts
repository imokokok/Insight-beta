/**
 * WebSocket Price Stream Service
 *
 * 实时价格数据流服务
 * - 支持多协议实时价格推送
 * - 订阅特定交易对
 * - 跨协议价格对比流
 */

import { logger } from '@/lib/logger';
import { priceAggregationEngine } from '@/server/oracle/priceAggregationService';
import type {
  CrossOracleComparison,
  OracleProtocol,
  SupportedChain,
} from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// 类型定义
// ============================================================================

type WebSocketClient = {
  id: string;
  ws: WebSocket;
  subscriptions: Set<string>;
  isAlive: boolean;
  connectedAt: Date;
};

type PriceStreamMessage =
  | { type: 'subscribe'; symbols: string[]; chain?: SupportedChain }
  | { type: 'unsubscribe'; symbols: string[] }
  | { type: 'ping' }
  | { type: 'get_comparison'; symbol: string; chain?: SupportedChain };

type PriceStreamResponse =
  | { type: 'price_update'; data: PriceUpdateData }
  | { type: 'comparison_update'; data: CrossOracleComparison }
  | { type: 'pong' }
  | { type: 'error'; message: string }
  | { type: 'subscribed'; symbols: string[] }
  | { type: 'unsubscribed'; symbols: string[] };

type PriceUpdateData = {
  symbol: string;
  protocol: OracleProtocol;
  chain: SupportedChain;
  price: number;
  timestamp: string;
  change24h?: number;
  volume24h?: number;
};

// ============================================================================
// 配置
// ============================================================================

const STREAM_CONFIG = {
  // 心跳间隔（毫秒）
  heartbeatInterval: 30000,

  // 价格推送间隔（毫秒）
  pricePushInterval: 5000,

  // 对比数据推送间隔（毫秒）
  comparisonInterval: 10000,

  // 最大客户端连接数
  maxClients: 1000,

  // 每个客户端最大订阅数
  maxSubscriptionsPerClient: 50,

  // 数据新鲜度阈值（秒）
  dataFreshnessThreshold: 60,
};

// ============================================================================
// 价格流管理器
// ============================================================================

export class PriceStreamManager {
  private clients: Map<string, WebSocketClient> = new Map();
  private symbolSubscriptions: Map<string, Set<string>> = new Map();
  private heartbeatInterval?: NodeJS.Timeout;
  private pricePushInterval?: NodeJS.Timeout;
  private comparisonInterval?: NodeJS.Timeout;
  private lastPrices: Map<string, PriceUpdateData> = new Map();
  private isRunning = false;

  /**
   * 启动价格流服务
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Price stream manager already running');
      return;
    }

    logger.info('Starting price stream manager');
    this.isRunning = true;

    // 启动心跳检测
    this.heartbeatInterval = setInterval(() => {
      this.checkClientHealth();
    }, STREAM_CONFIG.heartbeatInterval);

    // 启动价格推送
    this.pricePushInterval = setInterval(() => {
      this.pushPriceUpdates();
    }, STREAM_CONFIG.pricePushInterval);

    // 启动对比数据推送
    this.comparisonInterval = setInterval(() => {
      this.pushComparisonUpdates();
    }, STREAM_CONFIG.comparisonInterval);

    logger.info('Price stream manager started');
  }

  /**
   * 停止价格流服务
   */
  stop(): void {
    if (!this.isRunning) return;

    logger.info('Stopping price stream manager');
    this.isRunning = false;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.pricePushInterval) {
      clearInterval(this.pricePushInterval);
    }
    if (this.comparisonInterval) {
      clearInterval(this.comparisonInterval);
    }

    // 关闭所有客户端连接
    for (const client of this.clients.values()) {
      client.ws.close();
    }
    this.clients.clear();
    this.symbolSubscriptions.clear();

    logger.info('Price stream manager stopped');
  }

  /**
   * 添加客户端
   */
  addClient(id: string, ws: WebSocket): void {
    if (this.clients.size >= STREAM_CONFIG.maxClients) {
      logger.warn('Max clients reached, rejecting new connection');
      ws.close(1013, 'Server capacity exceeded');
      return;
    }

    const client: WebSocketClient = {
      id,
      ws,
      subscriptions: new Set(),
      isAlive: true,
      connectedAt: new Date(),
    };

    this.clients.set(id, client);

    // 设置消息处理器
    ws.onmessage = (event) => {
      this.handleMessage(id, event.data as string);
    };

    // 设置关闭处理器
    ws.onclose = () => {
      this.removeClient(id);
    };

    // 设置错误处理器
    ws.onerror = (error) => {
      logger.error(`WebSocket error for client ${id}`, { error });
    };

    // 设置 pong 处理器 (使用类型断言)
    (ws as unknown as { onpong: (() => void) | null }).onpong = () => {
      const client = this.clients.get(id);
      if (client) {
        client.isAlive = true;
      }
    };

    logger.info(`Client ${id} connected`, {
      totalClients: this.clients.size,
    });
  }

  /**
   * 移除客户端
   */
  removeClient(id: string): void {
    const client = this.clients.get(id);
    if (!client) return;

    // 取消所有订阅
    for (const symbol of client.subscriptions) {
      this.unsubscribeFromSymbol(id, symbol);
    }

    this.clients.delete(id);
    logger.info(`Client ${id} disconnected`, {
      totalClients: this.clients.size,
    });
  }

  /**
   * 处理客户端消息
   */
  private handleMessage(clientId: string, data: string): void {
    try {
      const message = JSON.parse(data) as PriceStreamMessage;
      const client = this.clients.get(clientId);

      if (!client) return;

      switch (message.type) {
        case 'subscribe':
          this.handleSubscribe(clientId, message.symbols, message.chain);
          break;

        case 'unsubscribe':
          this.handleUnsubscribe(clientId, message.symbols);
          break;

        case 'ping':
          this.sendToClient(clientId, { type: 'pong' });
          break;

        case 'get_comparison':
          this.handleGetComparison(clientId, message.symbol, message.chain);
          break;

        default:
          this.sendToClient(clientId, {
            type: 'error',
            message: 'Unknown message type',
          });
      }
    } catch (error) {
      logger.error(`Failed to handle message from client ${clientId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Invalid message format',
      });
    }
  }

  /**
   * 处理订阅请求
   */
  private handleSubscribe(clientId: string, symbols: string[], chain?: SupportedChain): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // 检查订阅数量限制
    if (client.subscriptions.size + symbols.length > STREAM_CONFIG.maxSubscriptionsPerClient) {
      this.sendToClient(clientId, {
        type: 'error',
        message: `Max subscriptions per client is ${STREAM_CONFIG.maxSubscriptionsPerClient}`,
      });
      return;
    }

    for (const symbol of symbols) {
      const subscriptionKey = chain ? `${symbol}:${chain}` : symbol;

      client.subscriptions.add(subscriptionKey);

      // 添加到全局订阅映射
      if (!this.symbolSubscriptions.has(subscriptionKey)) {
        this.symbolSubscriptions.set(subscriptionKey, new Set());
      }
      const subscriptionSet = this.symbolSubscriptions.get(subscriptionKey);
      if (subscriptionSet) {
        subscriptionSet.add(clientId);
      }
    }

    this.sendToClient(clientId, { type: 'subscribed', symbols });

    // 立即推送一次当前数据
    this.pushCurrentData(clientId, symbols, chain);

    logger.debug(`Client ${clientId} subscribed to ${symbols.join(', ')}`, {
      chain,
    });
  }

  /**
   * 处理取消订阅请求
   */
  private handleUnsubscribe(clientId: string, symbols: string[]): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    for (const symbol of symbols) {
      this.unsubscribeFromSymbol(clientId, symbol);
      client.subscriptions.delete(symbol);
    }

    this.sendToClient(clientId, { type: 'unsubscribed', symbols });

    logger.debug(`Client ${clientId} unsubscribed from ${symbols.join(', ')}`);
  }

  /**
   * 取消订阅特定交易对
   */
  private unsubscribeFromSymbol(clientId: string, symbol: string): void {
    const subscribers = this.symbolSubscriptions.get(symbol);
    if (subscribers) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.symbolSubscriptions.delete(symbol);
      }
    }
  }

  /**
   * 处理获取对比数据请求
   */
  private async handleGetComparison(
    clientId: string,
    symbol: string,
    chain?: SupportedChain,
  ): Promise<void> {
    try {
      const comparison = await priceAggregationEngine.aggregatePrices(symbol, chain);

      if (comparison) {
        this.sendToClient(clientId, {
          type: 'comparison_update',
          data: comparison,
        });
      } else {
        this.sendToClient(clientId, {
          type: 'error',
          message: `No comparison data available for ${symbol}`,
        });
      }
    } catch (error) {
      logger.error(`Failed to get comparison for ${symbol}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Failed to get comparison data',
      });
    }
  }

  /**
   * 推送当前数据给新订阅的客户端
   */
  private async pushCurrentData(
    clientId: string,
    symbols: string[],
    chain?: SupportedChain,
  ): Promise<void> {
    for (const symbol of symbols) {
      // 推送最新价格
      const lastPrice = this.lastPrices.get(symbol);
      if (lastPrice) {
        this.sendToClient(clientId, {
          type: 'price_update',
          data: lastPrice,
        });
      }

      // 推送对比数据
      try {
        const comparison = await priceAggregationEngine.aggregatePrices(symbol, chain);
        if (comparison) {
          this.sendToClient(clientId, {
            type: 'comparison_update',
            data: comparison,
          });
        }
      } catch (error) {
        logger.error(`Failed to push current comparison for ${symbol}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * 检查客户端健康状态
   */
  private checkClientHealth(): void {
    for (const [clientId, client] of this.clients.entries()) {
      if (!client.isAlive) {
        logger.debug(`Client ${clientId} is not alive, terminating connection`);
        // 使用类型断言访问 terminate 方法
        (client.ws as unknown as { terminate(): void }).terminate();
        this.removeClient(clientId);
        continue;
      }

      client.isAlive = false;
      // 使用类型断言访问 ping 方法
      (client.ws as unknown as { ping(): void }).ping();
    }
  }

  /**
   * 推送价格更新
   */
  private async pushPriceUpdates(): Promise<void> {
    if (this.symbolSubscriptions.size === 0) return;

    try {
      // 获取所有订阅的交易对的最新价格
      const symbols = Array.from(this.symbolSubscriptions.keys());

      for (const symbol of symbols) {
        const subscribers = this.symbolSubscriptions.get(symbol);
        if (!subscribers || subscribers.size === 0) continue;

        // 获取最新价格数据
        const priceData = await this.fetchLatestPrice(symbol);
        if (!priceData) continue;

        // 检查价格是否有变化
        const lastPrice = this.lastPrices.get(symbol);
        if (lastPrice && lastPrice.price === priceData.price) {
          continue; // 价格未变化，跳过
        }

        // 更新缓存
        this.lastPrices.set(symbol, priceData);

        // 推送给所有订阅者
        for (const clientId of subscribers) {
          this.sendToClient(clientId, {
            type: 'price_update',
            data: priceData,
          });
        }
      }
    } catch (error) {
      logger.error('Failed to push price updates', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 推送对比数据更新
   */
  private async pushComparisonUpdates(): Promise<void> {
    if (this.symbolSubscriptions.size === 0) return;

    try {
      const symbols = Array.from(this.symbolSubscriptions.keys());

      for (const symbol of symbols) {
        const subscribers = this.symbolSubscriptions.get(symbol);
        if (!subscribers || subscribers.size === 0) continue;

        // 获取对比数据
        const comparison = await priceAggregationEngine.aggregatePrices(symbol);
        if (!comparison) continue;

        // 推送给所有订阅者
        for (const clientId of subscribers) {
          this.sendToClient(clientId, {
            type: 'comparison_update',
            data: comparison,
          });
        }
      }
    } catch (error) {
      logger.error('Failed to push comparison updates', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 获取最新价格
   */
  private async fetchLatestPrice(symbol: string): Promise<PriceUpdateData | null> {
    try {
      // 从数据库获取最新价格
      const { query } = await import('@/server/db');
      const result = await query(
        `SELECT 
          protocol,
          chain,
          price,
          timestamp,
          symbol
        FROM unified_price_feeds
        WHERE symbol = $1
        ORDER BY timestamp DESC
        LIMIT 1`,
        [symbol],
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      if (!row) return null;

      return {
        symbol: row.symbol as string,
        protocol: row.protocol as OracleProtocol,
        chain: row.chain as SupportedChain,
        price: parseFloat(row.price as string),
        timestamp: row.timestamp as string,
      };
    } catch (error) {
      logger.error(`Failed to fetch latest price for ${symbol}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * 发送消息给客户端
   */
  private sendToClient(clientId: string, message: PriceStreamResponse): void {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) return;

    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      logger.error(`Failed to send message to client ${clientId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 广播消息给所有客户端
   */
  broadcast(message: PriceStreamResponse): void {
    for (const clientId of this.clients.keys()) {
      this.sendToClient(clientId, message);
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalClients: number;
    totalSubscriptions: number;
    isRunning: boolean;
  } {
    let totalSubscriptions = 0;
    for (const client of this.clients.values()) {
      totalSubscriptions += client.subscriptions.size;
    }

    return {
      totalClients: this.clients.size,
      totalSubscriptions,
      isRunning: this.isRunning,
    };
  }
}

// ============================================================================
// 单例导出
// ============================================================================

export const priceStreamManager = new PriceStreamManager();

// ============================================================================
// 便捷函数
// ============================================================================

export function startPriceStream(): void {
  priceStreamManager.start();
}

export function stopPriceStream(): void {
  priceStreamManager.stop();
}

export function addStreamClient(id: string, ws: WebSocket): void {
  priceStreamManager.addClient(id, ws);
}

export function getStreamStats(): ReturnType<typeof priceStreamManager.getStats> {
  return priceStreamManager.getStats();
}
