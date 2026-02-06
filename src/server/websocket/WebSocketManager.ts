/**
 * WebSocket Manager - WebSocket 连接管理器
 *
 * 优化点：
 * 1. 最大连接数限制
 * 2. 心跳检测机制
 * 3. 连接池管理
 * 4. 消息限流
 * 5. 自动清理无效连接
 */

import { WebSocket } from 'ws';
import { logger } from '@/lib/logger';
import { metrics } from '@/lib/monitoring/metrics';

// ============================================================================
// 配置常量
// ============================================================================

const CONFIG = {
  MAX_CONNECTIONS: 1000,
  HEARTBEAT_INTERVAL: 30000, // 30秒
  HEARTBEAT_TIMEOUT: 60000, // 60秒无响应则断开
  MESSAGE_RATE_LIMIT: 100, // 每分钟最大消息数
  RATE_LIMIT_WINDOW: 60000, // 1分钟窗口
  CLEANUP_INTERVAL: 60000, // 清理间隔
} as const;

// ============================================================================
// 类型定义
// ============================================================================

export interface ExtendedWebSocket extends WebSocket {
  clientId: string;
  isAlive: boolean;
  lastPing: number;
  messageCount: number;
  windowStart: number;
  subscriptions: Set<string>;
  metadata: {
    ip: string;
    userAgent?: string;
    connectedAt: Date;
  };
}

interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  totalMessages: number;
  messagesPerSecond: number;
  subscriptionsCount: number;
}

// ============================================================================
// WebSocket 管理器
// ============================================================================

export class WebSocketManager {
  private connections = new Map<string, ExtendedWebSocket>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private messageStats = {
    total: 0,
    lastReset: Date.now(),
  };

  constructor() {
    this.startHeartbeat();
    this.startCleanup();
  }

  // ============================================================================
  // 连接管理
  // ============================================================================

  /**
   * 注册新连接
   */
  registerConnection(
    ws: WebSocket,
    clientId: string,
    clientIp: string,
    userAgent?: string,
  ): ExtendedWebSocket | null {
    // 检查最大连接数
    if (this.connections.size >= CONFIG.MAX_CONNECTIONS) {
      logger.warn('Max connections reached, rejecting new connection', {
        clientId,
        currentConnections: this.connections.size,
      });
      ws.close(1013, 'Server overloaded');
      metrics.recordWebSocketConnection('error');
      return null;
    }

    // 检查重复连接
    if (this.connections.has(clientId)) {
      logger.warn('Duplicate client ID, closing old connection', { clientId });
      const oldWs = this.connections.get(clientId);
      oldWs?.close(1008, 'Duplicate connection');
    }

    // 创建扩展 WebSocket
    const extendedWs = ws as ExtendedWebSocket;
    extendedWs.clientId = clientId;
    extendedWs.isAlive = true;
    extendedWs.lastPing = Date.now();
    extendedWs.messageCount = 0;
    extendedWs.windowStart = Date.now();
    extendedWs.subscriptions = new Set();
    extendedWs.metadata = {
      ip: clientIp,
      userAgent,
      connectedAt: new Date(),
    };

    // 设置事件处理器
    this.setupEventHandlers(extendedWs);

    // 存储连接
    this.connections.set(clientId, extendedWs);

    logger.info('WebSocket client connected', {
      clientId,
      ip: clientIp,
      totalConnections: this.connections.size,
    });

    metrics.recordWebSocketConnection('connect');
    metrics.increment('websocket.active_connections', 1);

    return extendedWs;
  }

  /**
   * 断开连接
   */
  disconnect(clientId: string, code?: number, reason?: string): void {
    const ws = this.connections.get(clientId);
    if (!ws) return;

    this.connections.delete(clientId);

    if (ws.readyState === WebSocket.OPEN) {
      ws.close(code, reason);
    }

    logger.info('WebSocket client disconnected', {
      clientId,
      code,
      reason,
      duration: Date.now() - ws.metadata.connectedAt.getTime(),
    });

    metrics.recordWebSocketConnection('disconnect');
    metrics.increment('websocket.active_connections', -1);
  }

  /**
   * 获取连接
   */
  getConnection(clientId: string): ExtendedWebSocket | undefined {
    return this.connections.get(clientId);
  }

  /**
   * 获取所有连接
   */
  getAllConnections(): ExtendedWebSocket[] {
    return Array.from(this.connections.values());
  }

  /**
   * 获取连接数
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  // ============================================================================
  // 消息处理
  // ============================================================================

  /**
   * 发送消息给指定客户端
   */
  sendToClient(clientId: string, data: unknown): boolean {
    const ws = this.connections.get(clientId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      ws.send(JSON.stringify(data));
      return true;
    } catch (error) {
      logger.error('Failed to send message to client', {
        clientId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * 广播消息给所有客户端
   */
  broadcast(data: unknown, filter?: (ws: ExtendedWebSocket) => boolean): void {
    const message = JSON.stringify(data);
    let sentCount = 0;

    for (const ws of this.connections.values()) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      if (filter && !filter(ws)) continue;

      try {
        ws.send(message);
        sentCount++;
      } catch (error) {
        logger.error('Failed to broadcast message', {
          clientId: ws.clientId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.messageStats.total += sentCount;
  }

  /**
   * 广播给订阅者
   */
  broadcastToSubscribers(channel: string, data: unknown): void {
    this.broadcast(data, (ws) => ws.subscriptions.has(channel));
  }

  // ============================================================================
  // 订阅管理
  // ============================================================================

  /**
   * 订阅频道
   */
  subscribe(clientId: string, channel: string): boolean {
    const ws = this.connections.get(clientId);
    if (!ws) return false;

    ws.subscriptions.add(channel);
    logger.debug('Client subscribed to channel', { clientId, channel });
    return true;
  }

  /**
   * 取消订阅
   */
  unsubscribe(clientId: string, channel: string): boolean {
    const ws = this.connections.get(clientId);
    if (!ws) return false;

    const result = ws.subscriptions.delete(channel);
    logger.debug('Client unsubscribed from channel', { clientId, channel });
    return result;
  }

  /**
   * 获取客户端订阅
   */
  getSubscriptions(clientId: string): string[] {
    const ws = this.connections.get(clientId);
    return ws ? Array.from(ws.subscriptions) : [];
  }

  // ============================================================================
  // 限流检查
  // ============================================================================

  /**
   * 检查消息速率限制
   */
  checkRateLimit(clientId: string): boolean {
    const ws = this.connections.get(clientId);
    if (!ws) return false;

    const now = Date.now();

    // 重置窗口
    if (now - ws.windowStart > CONFIG.RATE_LIMIT_WINDOW) {
      ws.messageCount = 0;
      ws.windowStart = now;
    }

    // 检查限制
    if (ws.messageCount >= CONFIG.MESSAGE_RATE_LIMIT) {
      logger.warn('Rate limit exceeded for client', {
        clientId,
        messageCount: ws.messageCount,
      });
      return false;
    }

    ws.messageCount++;
    return true;
  }

  // ============================================================================
  // 事件处理
  // ============================================================================

  private setupEventHandlers(ws: ExtendedWebSocket): void {
    // 心跳响应
    ws.on('pong', () => {
      ws.isAlive = true;
      ws.lastPing = Date.now();
    });

    // 错误处理
    ws.on('error', (error) => {
      logger.error('WebSocket error', {
        clientId: ws.clientId,
        error: error.message,
      });
      metrics.recordWebSocketConnection('error');
    });

    // 关闭处理
    ws.on('close', (code, reason) => {
      this.connections.delete(ws.clientId);
      logger.info('WebSocket connection closed', {
        clientId: ws.clientId,
        code,
        reason: reason.toString(),
      });
    });
  }

  // ============================================================================
  // 心跳机制
  // ============================================================================

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();

      for (const [clientId, ws] of this.connections.entries()) {
        // 检查是否超时
        if (now - ws.lastPing > CONFIG.HEARTBEAT_TIMEOUT) {
          logger.warn('WebSocket client timeout, terminating', { clientId });
          this.disconnect(clientId, 1001, 'Timeout');
          continue;
        }

        // 发送 ping
        if (ws.readyState === WebSocket.OPEN) {
          ws.isAlive = false;
          ws.ping();
        }
      }
    }, CONFIG.HEARTBEAT_INTERVAL);
  }

  // ============================================================================
  // 清理机制
  // ============================================================================

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      let cleanedCount = 0;

      for (const [clientId, ws] of this.connections.entries()) {
        // 清理已关闭的连接
        if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
          this.connections.delete(clientId);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.info('Cleaned up dead connections', { count: cleanedCount });
      }
    }, CONFIG.CLEANUP_INTERVAL);
  }

  // ============================================================================
  // 统计信息
  // ============================================================================

  getStats(): ConnectionStats {
    const now = Date.now();
    const windowMs = now - this.messageStats.lastReset;
    const messagesPerSecond = windowMs > 0 ? this.messageStats.total / (windowMs / 1000) : 0;

    let subscriptionsCount = 0;
    for (const ws of this.connections.values()) {
      subscriptionsCount += ws.subscriptions.size;
    }

    return {
      totalConnections: this.connections.size,
      activeConnections: Array.from(this.connections.values()).filter(
        (ws) => ws.readyState === WebSocket.OPEN,
      ).length,
      totalMessages: this.messageStats.total,
      messagesPerSecond,
      subscriptionsCount,
    };
  }

  // ============================================================================
  // 销毁
  // ============================================================================

  destroy(): void {
    // 停止定时器
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // 关闭所有连接
    for (const [clientId] of this.connections.entries()) {
      this.disconnect(clientId, 1001, 'Server shutting down');
    }

    this.connections.clear();

    logger.info('WebSocket manager destroyed');
  }
}

// ============================================================================
// 单例导出
// ============================================================================

export const wsManager = new WebSocketManager();
