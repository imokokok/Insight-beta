/**
 * WebSocket Connection Pool - WebSocket 连接池
 *
 * 提供连接复用、自动重连、订阅管理等功能
 */

import { randomUUID } from 'crypto';

import { logger } from '@/lib/logger';

// ============================================================================
// 类型定义
// ============================================================================

export interface ConnectionPoolConfig {
  /** 最大连接数 */
  maxConnections: number;
  /** 每个连接的最大订阅数 */
  maxSubscriptionsPerConnection: number;
  /** 连接超时（毫秒） */
  connectionTimeout: number;
  /** 重连延迟（毫秒） */
  reconnectDelay: number;
  /** 最大重连次数 */
  maxReconnectAttempts: number;
  /** 心跳间隔（毫秒） */
  heartbeatInterval: number;
  /** 心跳超时（毫秒） */
  heartbeatTimeout: number;
}

export interface Subscription {
  id: string;
  channel: string;
  params?: Record<string, unknown>;
  callback: (data: unknown) => void;
  createdAt: number;
}

export interface PooledConnection {
  id: string;
  ws: WebSocket;
  url: string;
  subscriptions: Map<string, Subscription>;
  isConnected: boolean;
  isConnecting: boolean;
  lastActivity: number;
  reconnectAttempts: number;
  metadata: {
    createdAt: number;
    connectedAt?: number;
    messagesSent: number;
    messagesReceived: number;
    errors: number;
  };
}

// ============================================================================
// 默认配置
// ============================================================================

const DEFAULT_CONFIG: ConnectionPoolConfig = {
  maxConnections: 5,
  maxSubscriptionsPerConnection: 50,
  connectionTimeout: 10000,
  reconnectDelay: 1000,
  maxReconnectAttempts: 5,
  heartbeatInterval: 30000,
  heartbeatTimeout: 60000,
};

// ============================================================================
// 连接池
// ============================================================================

export class WebSocketConnectionPool {
  private connections: Map<string, PooledConnection> = new Map();
  private subscriptionToConnection: Map<string, string> = new Map();
  private config: ConnectionPoolConfig;
  private heartbeatTimers: Map<string, NodeJS.Timeout> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Partial<ConnectionPoolConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // 订阅管理
  // ============================================================================

  /**
   * 订阅频道
   */
  async subscribe(
    url: string,
    channel: string,
    callback: (data: unknown) => void,
    params?: Record<string, unknown>,
  ): Promise<string> {
    const subscriptionId = this.generateSubscriptionId(channel, params);

    // 检查是否已订阅
    if (this.subscriptionToConnection.has(subscriptionId)) {
      logger.debug('Subscription already exists, updating callback', { subscriptionId });
      const connectionId = this.subscriptionToConnection.get(subscriptionId)!;
      const connection = this.connections.get(connectionId);
      if (connection) {
        const sub = connection.subscriptions.get(subscriptionId);
        if (sub) {
          sub.callback = callback;
          return subscriptionId;
        }
      }
    }

    // 查找或创建连接
    const connection = await this.getOrCreateConnection(url);

    // 检查订阅数限制
    if (connection.subscriptions.size >= this.config.maxSubscriptionsPerConnection) {
      // 尝试创建新连接
      const newConnection = await this.createNewConnection(url);
      if (!newConnection) {
        throw new Error('Max connections reached');
      }
      return this.addSubscription(newConnection, subscriptionId, channel, callback, params);
    }

    return this.addSubscription(connection, subscriptionId, channel, callback, params);
  }

  /**
   * 取消订阅
   */
  unsubscribe(subscriptionId: string): boolean {
    const connectionId = this.subscriptionToConnection.get(subscriptionId);
    if (!connectionId) {
      return false;
    }

    const connection = this.connections.get(connectionId);
    if (!connection) {
      this.subscriptionToConnection.delete(subscriptionId);
      return false;
    }

    // 发送取消订阅消息
    const sub = connection.subscriptions.get(subscriptionId);
    if (sub && connection.isConnected) {
      this.sendMessage(connection, {
        type: 'unsubscribe',
        channel: sub.channel,
        id: subscriptionId,
      });
    }

    // 移除订阅
    connection.subscriptions.delete(subscriptionId);
    this.subscriptionToConnection.delete(subscriptionId);

    logger.debug('Unsubscribed', { subscriptionId, connectionId });

    // 如果连接没有订阅了，考虑关闭
    if (connection.subscriptions.size === 0) {
      this.scheduleConnectionClose(connectionId);
    }

    return true;
  }

  /**
   * 取消所有订阅
   */
  unsubscribeAll(): void {
    const subscriptionIds = Array.from(this.subscriptionToConnection.keys());
    for (const id of subscriptionIds) {
      this.unsubscribe(id);
    }
  }

  // ============================================================================
  // 连接管理
  // ============================================================================

  /**
   * 获取或创建连接
   */
  private async getOrCreateConnection(url: string): Promise<PooledConnection> {
    // 查找现有可用连接
    for (const connection of Array.from(this.connections.values())) {
      if (
        connection.url === url &&
        connection.subscriptions.size < this.config.maxSubscriptionsPerConnection
      ) {
        if (!connection.isConnected && !connection.isConnecting) {
          await this.reconnect(connection.id);
        }
        return connection;
      }
    }

    // 创建新连接
    const connection = await this.createNewConnection(url);
    if (!connection) {
      throw new Error('Failed to create connection');
    }
    return connection;
  }

  /**
   * 创建新连接
   */
  private async createNewConnection(url: string): Promise<PooledConnection | null> {
    if (this.connections.size >= this.config.maxConnections) {
      logger.warn('Max connections reached', {
        current: this.connections.size,
        max: this.config.maxConnections,
      });
      return null;
    }

    const connectionId = this.generateConnectionId();

    // 创建 WebSocket 连接，添加异常处理
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (error) {
      logger.error('Failed to create WebSocket connection', {
        url,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }

    const connection: PooledConnection = {
      id: connectionId,
      ws,
      url,
      subscriptions: new Map(),
      isConnected: false,
      isConnecting: true,
      lastActivity: Date.now(),
      reconnectAttempts: 0,
      metadata: {
        createdAt: Date.now(),
        messagesSent: 0,
        messagesReceived: 0,
        errors: 0,
      },
    };

    this.connections.set(connectionId, connection);
    this.setupConnectionHandlers(connection);

    // 等待连接建立
    await this.waitForConnection(connectionId);

    return connection;
  }

  /**
   * 设置连接事件处理器
   */
  private setupConnectionHandlers(connection: PooledConnection): void {
    const { ws, id } = connection;

    ws.onopen = () => {
      connection.isConnected = true;
      connection.isConnecting = false;
      connection.metadata.connectedAt = Date.now();
      connection.reconnectAttempts = 0;
      connection.lastActivity = Date.now();

      logger.info('WebSocket connected', { connectionId: id, url: connection.url });

      // 重新订阅
      this.resubscribeAll(connection);

      // 启动心跳
      this.startHeartbeat(id);
    };

    ws.onmessage = (event) => {
      connection.lastActivity = Date.now();
      connection.metadata.messagesReceived++;

      try {
        const data = JSON.parse(event.data);
        this.handleMessage(connection, data);
      } catch {
        // 非 JSON 消息，直接传递给所有订阅者
        for (const sub of Array.from(connection.subscriptions.values())) {
          sub.callback(event.data);
        }
      }
    };

    ws.onerror = (error) => {
      connection.metadata.errors++;
      logger.error('WebSocket error', { connectionId: id, error });
    };

    ws.onclose = () => {
      connection.isConnected = false;
      connection.isConnecting = false;
      this.stopHeartbeat(id);

      logger.info('WebSocket closed', { connectionId: id, url: connection.url });

      // 自动重连
      if (connection.subscriptions.size > 0) {
        this.scheduleReconnect(id);
      }
    };
  }

  /**
   * 等待连接建立
   */
  private waitForConnection(connectionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, this.config.connectionTimeout);

      const checkConnection = () => {
        const connection = this.connections.get(connectionId);
        if (!connection) {
          clearTimeout(timeout);
          reject(new Error('Connection not found'));
          return;
        }

        if (connection.isConnected) {
          clearTimeout(timeout);
          resolve();
          return;
        }

        if (!connection.isConnecting) {
          clearTimeout(timeout);
          reject(new Error('Connection failed'));
          return;
        }

        setTimeout(checkConnection, 100);
      };

      checkConnection();
    });
  }

  /**
   * 重连
   */
  private async reconnect(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    if (connection.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error('Max reconnect attempts reached', { connectionId });
      this.closeConnection(connectionId);
      return;
    }

    connection.reconnectAttempts++;
    connection.isConnecting = true;

    logger.info('Reconnecting...', {
      connectionId,
      attempt: connection.reconnectAttempts,
    });

    // 创建新 WebSocket
    connection.ws = new WebSocket(connection.url);
    this.setupConnectionHandlers(connection);

    try {
      await this.waitForConnection(connectionId);
    } catch (error) {
      logger.error('Reconnection failed', { connectionId, error });
      this.scheduleReconnect(connectionId);
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(connectionId: string): void {
    const existingTimer = this.reconnectTimers.get(connectionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, connection.reconnectAttempts),
      30000,
    );

    const timer = setTimeout(() => {
      this.reconnectTimers.delete(connectionId);
      this.reconnect(connectionId);
    }, delay);

    this.reconnectTimers.set(connectionId, timer);
  }

  // ============================================================================
  // 消息处理
  // ============================================================================

  /**
   * 处理收到的消息
   */
  private handleMessage(connection: PooledConnection, data: unknown): void {
    if (typeof data !== 'object' || data === null) return;

    const msg = data as { channel?: string; type?: string; id?: string };

    // 心跳响应
    if (msg.type === 'pong') return;

    // 找到对应的订阅者
    for (const sub of Array.from(connection.subscriptions.values())) {
      if (msg.channel === sub.channel || msg.id === sub.id) {
        sub.callback(data);
      }
    }
  }

  /**
   * 发送消息
   */
  private sendMessage(connection: PooledConnection, data: unknown): boolean {
    if (connection.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      connection.ws.send(JSON.stringify(data));
      connection.metadata.messagesSent++;
      return true;
    } catch (error) {
      logger.error('Failed to send message', { connectionId: connection.id, error });
      return false;
    }
  }

  // ============================================================================
  // 订阅辅助方法
  // ============================================================================

  private addSubscription(
    connection: PooledConnection,
    subscriptionId: string,
    channel: string,
    callback: (data: unknown) => void,
    params?: Record<string, unknown>,
  ): string {
    const subscription: Subscription = {
      id: subscriptionId,
      channel,
      params,
      callback,
      createdAt: Date.now(),
    };

    connection.subscriptions.set(subscriptionId, subscription);
    this.subscriptionToConnection.set(subscriptionId, connection.id);

    // 发送订阅消息
    if (connection.isConnected) {
      this.sendMessage(connection, {
        type: 'subscribe',
        channel,
        id: subscriptionId,
        ...params,
      });
    }

    logger.debug('Subscribed', { subscriptionId, channel, connectionId: connection.id });

    return subscriptionId;
  }

  private resubscribeAll(connection: PooledConnection): void {
    for (const sub of Array.from(connection.subscriptions.values())) {
      this.sendMessage(connection, {
        type: 'subscribe',
        channel: sub.channel,
        id: sub.id,
        ...sub.params,
      });
    }
  }

  // ============================================================================
  // 心跳机制
  // ============================================================================

  private startHeartbeat(connectionId: string): void {
    const timer = setInterval(() => {
      const connection = this.connections.get(connectionId);
      if (!connection || !connection.isConnected) {
        this.stopHeartbeat(connectionId);
        return;
      }

      // 检查超时
      if (Date.now() - connection.lastActivity > this.config.heartbeatTimeout) {
        logger.warn('Connection timeout', { connectionId });
        connection.ws.close();
        return;
      }

      // 发送心跳
      this.sendMessage(connection, { type: 'ping' });
    }, this.config.heartbeatInterval);

    this.heartbeatTimers.set(connectionId, timer);
  }

  private stopHeartbeat(connectionId: string): void {
    const timer = this.heartbeatTimers.get(connectionId);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(connectionId);
    }
  }

  // ============================================================================
  // 连接清理
  // ============================================================================

  private scheduleConnectionClose(connectionId: string): void {
    // 延迟关闭，避免频繁创建/销毁
    setTimeout(() => {
      const connection = this.connections.get(connectionId);
      if (connection && connection.subscriptions.size === 0) {
        this.closeConnection(connectionId);
      }
    }, 60000);
  }

  private closeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // 清理订阅映射
    for (const subId of Array.from(connection.subscriptions.keys())) {
      this.subscriptionToConnection.delete(subId);
    }

    // 停止定时器
    this.stopHeartbeat(connectionId);
    const reconnectTimer = this.reconnectTimers.get(connectionId);
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      this.reconnectTimers.delete(connectionId);
    }

    // 关闭连接
    if (connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.close();
    }

    this.connections.delete(connectionId);

    logger.info('Connection closed', { connectionId });
  }

  // ============================================================================
  // 工具方法
  // ============================================================================

  private generateConnectionId(): string {
    // 使用 crypto.randomUUID() 替代 Math.random() 生成安全ID
    return `conn_${Date.now()}_${randomUUID().replace(/-/g, '').slice(0, 9)}`;
  }

  private generateSubscriptionId(channel: string, params?: Record<string, unknown>): string {
    const paramsStr = params ? JSON.stringify(params) : '';
    // 使用 crypto.randomUUID() 替代简单时间戳
    return `sub_${channel}_${paramsStr}_${randomUUID().replace(/-/g, '').slice(0, 9)}`;
  }

  // ============================================================================
  // 统计信息
  // ============================================================================

  getStats(): {
    connections: number;
    subscriptions: number;
    messagesSent: number;
    messagesReceived: number;
    errors: number;
  } {
    let messagesSent = 0;
    let messagesReceived = 0;
    let errors = 0;

    for (const conn of Array.from(this.connections.values())) {
      messagesSent += conn.metadata.messagesSent;
      messagesReceived += conn.metadata.messagesReceived;
      errors += conn.metadata.errors;
    }

    return {
      connections: this.connections.size,
      subscriptions: this.subscriptionToConnection.size,
      messagesSent,
      messagesReceived,
      errors,
    };
  }

  // ============================================================================
  // 销毁
  // ============================================================================

  destroy(): void {
    this.unsubscribeAll();

    for (const connectionId of Array.from(this.connections.keys())) {
      this.closeConnection(connectionId);
    }

    this.connections.clear();
    this.subscriptionToConnection.clear();

    logger.info('Connection pool destroyed');
  }
}

// ============================================================================
// 单例导出
// ============================================================================

export const wsConnectionPool = new WebSocketConnectionPool();
