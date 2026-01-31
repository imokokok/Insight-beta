/**
 * WebSocket Price Stream Service
 *
 * WebSocket 实时价格流服务
 * 提供实时价格更新、告警通知、系统状态推送
 */

import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { logger } from '@/lib/logger';
import { query } from '@/server/db';
import type { UnifiedPriceFeed, UnifiedAlert } from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// 类型定义
// ============================================================================

export interface PriceStreamConfig {
  port?: number;
  corsOrigin?: string | string[];
  heartbeatInterval?: number;
  maxClients?: number;
}

export interface Subscription {
  type: 'price' | 'alert' | 'status';
  symbols?: string[];
  protocols?: string[];
  chains?: string[];
  severity?: string[];
}

export interface PriceUpdateMessage {
  type: 'price_update';
  data: UnifiedPriceFeed;
  timestamp: string;
}

export interface AlertMessage {
  type: 'alert';
  data: UnifiedAlert;
  timestamp: string;
}

export interface StatusMessage {
  type: 'status';
  data: {
    protocol: string;
    chain: string;
    status: 'healthy' | 'warning' | 'error';
    latency: number;
    lastUpdate: string;
  };
  timestamp: string;
}

export type WebSocketMessage = PriceUpdateMessage | AlertMessage | StatusMessage;

// ============================================================================
// WebSocket 服务
// ============================================================================

export class PriceStreamService {
  private io: SocketServer | null = null;
  private config: PriceStreamConfig;
  private clients: Map<string, Socket> = new Map();
  private subscriptions: Map<string, Subscription[]> = new Map();
  private priceInterval?: NodeJS.Timeout;
  private alertInterval?: NodeJS.Timeout;
  private statusInterval?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor(config: PriceStreamConfig = {}) {
    this.config = {
      port: config.port || 3001,
      corsOrigin: config.corsOrigin || '*',
      heartbeatInterval: config.heartbeatInterval || 30000,
      maxClients: config.maxClients || 1000,
    };
  }

  // ============================================================================
  // 启动/停止
  // ============================================================================

  start(httpServer?: HttpServer): void {
    if (this.isRunning) return;

    try {
      if (httpServer) {
        this.io = new SocketServer(httpServer, {
          cors: {
            origin: this.config.corsOrigin,
            methods: ['GET', 'POST'],
          },
          transports: ['websocket', 'polling'],
        });
      } else {
        this.io = new SocketServer(this.config.port, {
          cors: {
            origin: this.config.corsOrigin,
            methods: ['GET', 'POST'],
          },
          transports: ['websocket', 'polling'],
        });
      }

      this.setupEventHandlers();
      this.startBroadcasting();
      this.isRunning = true;

      logger.info('PriceStream WebSocket service started', {
        port: this.config.port,
        maxClients: this.config.maxClients,
      });
    } catch (error) {
      logger.error('Failed to start PriceStream service', { error });
      throw error;
    }
  }

  stop(): void {
    if (!this.isRunning) return;

    this.stopBroadcasting();

    if (this.io) {
      this.io.close();
      this.io = null;
    }

    this.clients.clear();
    this.subscriptions.clear();
    this.isRunning = false;

    logger.info('PriceStream WebSocket service stopped');
  }

  // ============================================================================
  // 事件处理
  // ============================================================================

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      // 检查最大客户端数
      if (this.clients.size >= (this.config.maxClients || 1000)) {
        socket.emit('error', { message: 'Server at capacity' });
        socket.disconnect();
        return;
      }

      this.clients.set(socket.id, socket);
      logger.debug('Client connected', { socketId: socket.id, totalClients: this.clients.size });

      // 发送欢迎消息
      socket.emit('connected', {
        message: 'Connected to OracleMonitor Price Stream',
        timestamp: new Date().toISOString(),
      });

      // 处理订阅
      socket.on('subscribe', (subscription: Subscription) => {
        this.handleSubscribe(socket.id, subscription);
      });

      // 处理取消订阅
      socket.on('unsubscribe', (subscription: Subscription) => {
        this.handleUnsubscribe(socket.id, subscription);
      });

      // 处理心跳
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date().toISOString() });
      });

      // 处理断开连接
      socket.on('disconnect', (reason) => {
        this.clients.delete(socket.id);
        this.subscriptions.delete(socket.id);
        logger.debug('Client disconnected', { socketId: socket.id, reason });
      });

      // 处理错误
      socket.on('error', (error) => {
        logger.error('Socket error', { socketId: socket.id, error });
      });
    });
  }

  // ============================================================================
  // 订阅管理
  // ============================================================================

  private handleSubscribe(clientId: string, subscription: Subscription): void {
    const subs = this.subscriptions.get(clientId) || [];
    subs.push(subscription);
    this.subscriptions.set(clientId, subs);

    logger.debug('Client subscribed', { clientId, subscription });

    // 立即发送一次数据
    this.sendImmediateUpdate(clientId, subscription);
  }

  private handleUnsubscribe(clientId: string, subscription: Subscription): void {
    const subs = this.subscriptions.get(clientId) || [];
    const filtered = subs.filter(
      (sub) =>
        !(
          sub.type === subscription.type &&
          JSON.stringify(sub.symbols) === JSON.stringify(subscription.symbols) &&
          JSON.stringify(sub.protocols) === JSON.stringify(subscription.protocols)
        )
    );
    this.subscriptions.set(clientId, filtered);

    logger.debug('Client unsubscribed', { clientId, subscription });
  }

  // ============================================================================
  // 广播逻辑
  // ============================================================================

  private startBroadcasting(): void {
    // 价格更新广播 (每 5 秒)
    this.priceInterval = setInterval(async () => {
      await this.broadcastPriceUpdates();
    }, 5000);

    // 告警广播 (每 10 秒)
    this.alertInterval = setInterval(async () => {
      await this.broadcastAlerts();
    }, 10000);

    // 状态广播 (每 30 秒)
    this.statusInterval = setInterval(async () => {
      await this.broadcastStatus();
    }, 30000);
  }

  private stopBroadcasting(): void {
    if (this.priceInterval) {
      clearInterval(this.priceInterval);
      this.priceInterval = undefined;
    }
    if (this.alertInterval) {
      clearInterval(this.alertInterval);
      this.alertInterval = undefined;
    }
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = undefined;
    }
  }

  private async broadcastPriceUpdates(): Promise<void> {
    if (!this.io || this.clients.size === 0) return;

    try {
      // 获取最新价格
      const result = await query(
        `
        SELECT DISTINCT ON (protocol, chain, symbol)
          id, instance_id, protocol, chain, symbol, price, timestamp,
          block_number, is_stale, metadata
        FROM unified_price_feeds
        WHERE timestamp > NOW() - INTERVAL '1 minute'
        ORDER BY protocol, chain, symbol, timestamp DESC
        LIMIT 100
        `
      );

      const prices: UnifiedPriceFeed[] = result.rows.map((row) => ({
        id: row.id,
        instanceId: row.instance_id,
        protocol: row.protocol,
        chain: row.chain,
        symbol: row.symbol,
        price: parseFloat(row.price),
        timestamp: new Date(row.timestamp),
        blockNumber: row.block_number,
        isStale: row.is_stale,
        metadata: row.metadata ? JSON.parse(row.metadata) : {},
      }));

      // 广播给订阅了价格的客户端
      for (const [clientId, socket] of this.clients) {
        const subs = this.subscriptions.get(clientId) || [];
        const priceSubs = subs.filter((sub) => sub.type === 'price');

        for (const price of prices) {
          for (const sub of priceSubs) {
            if (this.matchesSubscription(price, sub)) {
              const message: PriceUpdateMessage = {
                type: 'price_update',
                data: price,
                timestamp: new Date().toISOString(),
              };
              socket.emit('message', message);
            }
          }
        }
      }
    } catch (error) {
      logger.error('Failed to broadcast price updates', { error });
    }
  }

  private async broadcastAlerts(): Promise<void> {
    if (!this.io || this.clients.size === 0) return;

    try {
      // 获取活跃告警
      const result = await query(
        `
        SELECT id, rule_id, event, severity, title, message,
          protocol, chain, instance_id, symbol, context, status,
          created_at
        FROM unified_alerts
        WHERE status = 'open'
        AND created_at > NOW() - INTERVAL '1 hour'
        ORDER BY created_at DESC
        LIMIT 50
        `
      );

      const alerts: UnifiedAlert[] = result.rows.map((row) => ({
        id: row.id,
        ruleId: row.rule_id,
        event: row.event,
        severity: row.severity,
        title: row.title,
        message: row.message,
        protocol: row.protocol,
        chain: row.chain,
        instanceId: row.instance_id,
        symbol: row.symbol,
        context: row.context ? JSON.parse(row.context) : {},
        status: row.status,
        createdAt: row.created_at,
      }));

      // 广播给订阅了告警的客户端
      for (const [clientId, socket] of this.clients) {
        const subs = this.subscriptions.get(clientId) || [];
        const alertSubs = subs.filter((sub) => sub.type === 'alert');

        for (const alert of alerts) {
          for (const sub of alertSubs) {
            if (this.matchesAlertSubscription(alert, sub)) {
              const message: AlertMessage = {
                type: 'alert',
                data: alert,
                timestamp: new Date().toISOString(),
              };
              socket.emit('message', message);
            }
          }
        }
      }
    } catch (error) {
      logger.error('Failed to broadcast alerts', { error });
    }
  }

  private async broadcastStatus(): Promise<void> {
    if (!this.io || this.clients.size === 0) return;

    try {
      // 获取同步状态
      const result = await query(
        `
        SELECT protocol, chain, status, last_sync_at, last_error
        FROM unified_sync_state
        WHERE updated_at > NOW() - INTERVAL '5 minutes'
        `
      );

      const statuses = result.rows.map((row) => ({
        protocol: row.protocol,
        chain: row.chain,
        status: row.status,
        lastUpdate: row.last_sync_at,
      }));

      // 广播给订阅了状态的客户端
      for (const [clientId, socket] of this.clients) {
        const subs = this.subscriptions.get(clientId) || [];
        const statusSubs = subs.filter((sub) => sub.type === 'status');

        for (const status of statuses) {
          for (const sub of statusSubs) {
            if (
              !sub.protocols?.length ||
              sub.protocols.includes(status.protocol)
            ) {
              const message: StatusMessage = {
                type: 'status',
                data: {
                  ...status,
                  status: this.mapStatus(status.status),
                  latency: 0,
                  lastUpdate: status.lastUpdate?.toISOString() || new Date().toISOString(),
                },
                timestamp: new Date().toISOString(),
              };
              socket.emit('message', message);
            }
          }
        }
      }
    } catch (error) {
      logger.error('Failed to broadcast status', { error });
    }
  }

  // ============================================================================
  // 辅助方法
  // ============================================================================

  private matchesSubscription(price: UnifiedPriceFeed, sub: Subscription): boolean {
    if (sub.symbols?.length && !sub.symbols.includes(price.symbol)) {
      return false;
    }
    if (sub.protocols?.length && !sub.protocols.includes(price.protocol)) {
      return false;
    }
    if (sub.chains?.length && !sub.chains.includes(price.chain)) {
      return false;
    }
    return true;
  }

  private matchesAlertSubscription(alert: UnifiedAlert, sub: Subscription): boolean {
    if (sub.severity?.length && alert.severity && !sub.severity.includes(alert.severity)) {
      return false;
    }
    if (sub.protocols?.length && alert.protocol && !sub.protocols.includes(alert.protocol)) {
      return false;
    }
    if (sub.chains?.length && alert.chain && !sub.chains.includes(alert.chain)) {
      return false;
    }
    return true;
  }

  private mapStatus(status: string): 'healthy' | 'warning' | 'error' {
    switch (status) {
      case 'healthy':
      case 'active':
        return 'healthy';
      case 'warning':
      case 'stale':
        return 'warning';
      case 'error':
      default:
        return 'error';
    }
  }

  private async sendImmediateUpdate(clientId: string, subscription: Subscription): Promise<void> {
    const socket = this.clients.get(clientId);
    if (!socket) return;

    try {
      if (subscription.type === 'price') {
        // 发送最新价格
        const symbols = subscription.symbols || ['ETH/USD', 'BTC/USD'];
        const result = await query(
          `
          SELECT DISTINCT ON (protocol, chain, symbol)
            id, instance_id, protocol, chain, symbol, price, timestamp,
            block_number, is_stale, metadata
          FROM unified_price_feeds
          WHERE symbol = ANY($1)
          ORDER BY protocol, chain, symbol, timestamp DESC
          LIMIT 20
          `,
          [symbols]
        );

        const prices = result.rows.map((row) => ({
          id: row.id,
          instanceId: row.instance_id,
          protocol: row.protocol,
          chain: row.chain,
          symbol: row.symbol,
          price: parseFloat(row.price),
          timestamp: new Date(row.timestamp),
          blockNumber: row.block_number,
          isStale: row.is_stale,
          metadata: row.metadata ? JSON.parse(row.metadata) : {},
        }));

        for (const price of prices) {
          if (this.matchesSubscription(price, subscription)) {
            const message: PriceUpdateMessage = {
              type: 'price_update',
              data: price,
              timestamp: new Date().toISOString(),
            };
            socket.emit('message', message);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to send immediate update', { error, clientId });
    }
  }

  // ============================================================================
  // 公共 API
  // ============================================================================

  broadcast(message: WebSocketMessage): void {
    if (!this.io) return;
    this.io.emit('message', message);
  }

  getStats(): {
    connectedClients: number;
    totalSubscriptions: number;
    isRunning: boolean;
  } {
    let totalSubs = 0;
    for (const subs of this.subscriptions.values()) {
      totalSubs += subs.length;
    }

    return {
      connectedClients: this.clients.size,
      totalSubscriptions: totalSubs,
      isRunning: this.isRunning,
    };
  }
}

// ============================================================================
// 单例实例
// ============================================================================

let priceStreamService: PriceStreamService | null = null;

export function getPriceStreamService(config?: PriceStreamConfig): PriceStreamService {
  if (!priceStreamService) {
    priceStreamService = new PriceStreamService(config);
  }
  return priceStreamService;
}

export function resetPriceStreamService(): void {
  if (priceStreamService) {
    priceStreamService.stop();
    priceStreamService = null;
  }
}
