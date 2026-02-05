/**
 * WebSocket Price Stream Service
 *
 * Real-time price data streaming service
 * - Supports multi-protocol real-time price push
 * - Subscribe to specific trading pairs
 * - Cross-protocol price comparison stream
 * - Enhanced error handling and reconnection support
 */

import { logger } from '@/lib/logger';
import { priceAggregationEngine } from '@/server/oracle/priceAggregationService';
import type {
  CrossOracleComparison,
  OracleProtocol,
  SupportedChain,
} from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Extended WebSocket interface with additional methods
 */
interface ExtendedWebSocket extends WebSocket {
  terminate?(): void;
  ping?(): void;
  onpong?: (() => void) | null;
}

type WebSocketClient = {
  id: string;
  ws: ExtendedWebSocket;
  subscriptions: Set<string>;
  isAlive: boolean;
  connectedAt: Date;
  lastPingAt: Date;
  messageCount: number;
  errorCount: number;
};

type PriceStreamMessage =
  | { type: 'subscribe'; symbols: string[]; chain?: SupportedChain }
  | { type: 'unsubscribe'; symbols: string[] }
  | { type: 'ping' }
  | { type: 'get_comparison'; symbol: string; chain?: SupportedChain }
  | { type: 'get_stats' }
  | { type: 'batch_subscribe'; subscriptions: Array<{ symbol: string; chain?: SupportedChain }> };

type PriceStreamResponse =
  | { type: 'price_update'; data: PriceUpdateData }
  | { type: 'comparison_update'; data: CrossOracleComparison }
  | { type: 'pong'; timestamp: number }
  | { type: 'error'; message: string; code?: string }
  | { type: 'subscribed'; symbols: string[] }
  | { type: 'unsubscribed'; symbols: string[] }
  | { type: 'stats'; data: WebSocketStats }
  | { type: 'connected'; clientId: string; message: string };

type PriceUpdateData = {
  symbol: string;
  chain: SupportedChain;
  price: number;
  timestamp: number;
  source: OracleProtocol;
  confidence?: number;
};

type WebSocketStats = {
  totalClients: number;
  totalSubscriptions: number;
  messagesPerSecond: number;
  averageLatency: number;
  uptime: number;
};

// ============================================================================
// Price Stream Manager
// ============================================================================

class PriceStreamManager {
  private clients: Map<string, WebSocketClient> = new Map();
  private isRunning = false;
  private broadcastInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private statsInterval: NodeJS.Timeout | null = null;
  private messageCount = 0;
  private lastStatsTime = Date.now();
  private startTime = Date.now();
  private latencyMeasurements: number[] = [];

  // Configuration
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly BROADCAST_INTERVAL = 5000; // 5 seconds
  private readonly STATS_INTERVAL = 60000; // 60 seconds
  private readonly MAX_LATENCY_MEASUREMENTS = 100;
  private readonly CLIENT_TIMEOUT = 60000; // 60 seconds
  private readonly MAX_ERRORS_PER_MINUTE = 10;

  /**
   * Start the price stream manager
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Price stream manager is already running');
      return;
    }

    this.isRunning = true;
    this.startTime = Date.now();
    this.startHeartbeat();
    this.startBroadcast();
    this.startStatsCollection();

    logger.info('Price stream manager started');
  }

  /**
   * Stop the price stream manager
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Clear all intervals
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    // Close all client connections gracefully
    for (const [clientId, client] of this.clients) {
      try {
        this.sendToClient(clientId, {
          type: 'error',
          message: 'Server is shutting down',
          code: 'SERVER_SHUTDOWN',
        });
        client.ws.close(1001, 'Server shutdown');
      } catch (error) {
        logger.error(`Error closing client ${clientId}`, { error });
      }
    }
    this.clients.clear();

    logger.info('Price stream manager stopped');
  }

  /**
   * Add a new WebSocket client
   */
  addClient(id: string, ws: ExtendedWebSocket): void {
    const client: WebSocketClient = {
      id,
      ws,
      subscriptions: new Set(),
      isAlive: true,
      connectedAt: new Date(),
      lastPingAt: new Date(),
      messageCount: 0,
      errorCount: 0,
    };

    this.clients.set(id, client);

    // Setup WebSocket event handlers
    ws.onmessage = (event) => this.handleMessage(id, event.data as string);
    ws.onclose = () => this.removeClient(id);
    ws.onerror = (error) => this.handleClientError(id, error);

    // Send connection confirmation
    this.sendToClient(id, {
      type: 'connected',
      clientId: id,
      message: 'Connected to Oracle Monitor WebSocket server',
    });

    logger.info(`Client ${id} connected`, {
      totalClients: this.clients.size,
    });
  }

  /**
   * Remove a WebSocket client
   */
  removeClient(id: string): void {
    const client = this.clients.get(id);
    if (!client) return;

    this.clients.delete(id);
    logger.info(`Client ${id} disconnected`, {
      totalClients: this.clients.size,
      duration: Date.now() - client.connectedAt.getTime(),
      messagesReceived: client.messageCount,
    });
  }

  /**
   * Handle incoming message from client
   */
  private async handleMessage(clientId: string, data: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.messageCount++;
    const startTime = Date.now();

    try {
      const message: PriceStreamMessage = JSON.parse(data);

      switch (message.type) {
        case 'subscribe':
          await this.handleSubscribe(clientId, message);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(clientId, message);
          break;
        case 'ping':
          this.handlePing(clientId);
          break;
        case 'get_comparison':
          await this.handleGetComparison(clientId, message);
          break;
        case 'get_stats':
          this.handleGetStats(clientId);
          break;
        case 'batch_subscribe':
          await this.handleBatchSubscribe(clientId, message);
          break;
        default:
          this.sendToClient(clientId, {
            type: 'error',
            message: `Unknown message type`,
            code: 'UNKNOWN_MESSAGE_TYPE',
          });
      }

      // Track latency
      const latency = Date.now() - startTime;
      this.trackLatency(latency);
    } catch (error) {
      client.errorCount++;
      logger.error(`Failed to handle message from client ${clientId}`, {
        error: error instanceof Error ? error.message : String(error),
        data: data.slice(0, 200),
      });

      this.sendToClient(clientId, {
        type: 'error',
        message: 'Invalid message format',
        code: 'INVALID_MESSAGE',
      });

      // Disconnect client if too many errors
      if (client.errorCount > this.MAX_ERRORS_PER_MINUTE) {
        logger.warn(`Disconnecting client ${clientId} due to excessive errors`);
        client.ws.close(1008, 'Too many errors');
      }
    }
  }

  /**
   * Handle client errors
   */
  private handleClientError(clientId: string, error: Event): void {
    logger.error(`WebSocket error for client ${clientId}`, { error });
    const client = this.clients.get(clientId);
    if (client) {
      client.errorCount++;
    }
  }

  /**
   * Handle subscribe message
   */
  private async handleSubscribe(
    clientId: string,
    message: { symbols: string[]; chain?: SupportedChain },
  ): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { symbols, chain = 'ethereum' } = message;

    for (const symbol of symbols) {
      const key = `${symbol}:${chain}`;
      client.subscriptions.add(key);
    }

    logger.debug(`Client ${clientId} subscribed to ${symbols.join(', ')}`, {
      chain,
    });

    this.sendToClient(clientId, {
      type: 'subscribed',
      symbols,
    });

    // Send initial data immediately
    for (const symbol of symbols) {
      await this.sendPriceUpdate(clientId, symbol, chain);
    }
  }

  /**
   * Handle batch subscribe
   */
  private async handleBatchSubscribe(
    clientId: string,
    message: { subscriptions: Array<{ symbol: string; chain?: SupportedChain }> },
  ): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    const symbols: string[] = [];

    for (const sub of message.subscriptions) {
      const key = `${sub.symbol}:${sub.chain || 'ethereum'}`;
      client.subscriptions.add(key);
      symbols.push(sub.symbol);
    }

    logger.debug(`Client ${clientId} batch subscribed to ${symbols.length} symbols`);

    this.sendToClient(clientId, {
      type: 'subscribed',
      symbols,
    });
  }

  /**
   * Handle unsubscribe message
   */
  private handleUnsubscribe(clientId: string, message: { symbols: string[] }): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { symbols } = message;

    for (const symbol of symbols) {
      // Remove all chain variants
      for (const chain of ['ethereum', 'polygon', 'arbitrum', 'optimism']) {
        client.subscriptions.delete(`${symbol}:${chain}`);
      }
    }

    logger.debug(`Client ${clientId} unsubscribed from ${symbols.join(', ')}`);

    this.sendToClient(clientId, {
      type: 'unsubscribed',
      symbols,
    });
  }

  /**
   * Handle ping message
   */
  private handlePing(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.isAlive = true;
    client.lastPingAt = new Date();

    this.sendToClient(clientId, {
      type: 'pong',
      timestamp: Date.now(),
    });
  }

  /**
   * Handle get comparison message
   */
  private async handleGetComparison(
    clientId: string,
    message: { symbol: string; chain?: SupportedChain },
  ): Promise<void> {
    const { symbol, chain = 'ethereum' } = message;

    try {
      const comparison = await priceAggregationEngine.getCrossOracleComparison(symbol, chain);

      if (comparison) {
        this.sendToClient(clientId, {
          type: 'comparison_update',
          data: comparison,
        });
      } else {
        this.sendToClient(clientId, {
          type: 'error',
          message: `No comparison data available for ${symbol}`,
          code: 'NO_DATA',
        });
      }
    } catch (error) {
      logger.error(`Failed to get comparison for ${symbol}`, { error });
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Failed to fetch comparison data',
        code: 'FETCH_ERROR',
      });
    }
  }

  /**
   * Handle get stats message
   */
  private handleGetStats(clientId: string): void {
    this.sendToClient(clientId, {
      type: 'stats',
      data: this.getStats(),
    });
  }

  /**
   * Send price update to client
   */
  private async sendPriceUpdate(
    clientId: string,
    symbol: string,
    chain: SupportedChain,
  ): Promise<void> {
    try {
      const price = await priceAggregationEngine.getAggregatedPrice(symbol, chain);

      if (price) {
        this.sendToClient(clientId, {
          type: 'price_update',
          data: {
            symbol,
            chain,
            price: price.price,
            timestamp: price.timestamp,
            source: price.primarySource as OracleProtocol,
            confidence: price.confidence,
          },
        });
      }
    } catch (error) {
      logger.error(`Failed to send price update for ${symbol}`, { error });
    }
  }

  /**
   * Send message to client
   */
  private sendToClient(clientId: string, message: PriceStreamResponse): void {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== 1) return; // 1 = WebSocket.OPEN

    try {
      client.ws.send(JSON.stringify(message));
      this.messageCount++;
    } catch (error) {
      logger.error(`Failed to send message to client ${clientId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Start heartbeat to check client connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      for (const [clientId, client] of this.clients) {
        // Check if client is still alive
        if (!client.isAlive) {
          logger.debug(`Client ${clientId} is not responding, terminating`);
          client.ws.terminate?.();
          this.removeClient(clientId);
          continue;
        }

        // Check for timeout
        const timeSinceLastPing = Date.now() - client.lastPingAt.getTime();
        if (timeSinceLastPing > this.CLIENT_TIMEOUT) {
          logger.debug(`Client ${clientId} timed out`);
          client.ws.close(1001, 'Timeout');
          this.removeClient(clientId);
          continue;
        }

        // Send ping
        client.isAlive = false;
        try {
          if (client.ws.ping) {
            client.ws.ping();
          }
        } catch (error) {
          logger.error(`Failed to ping client ${clientId}`, { error });
        }
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Start broadcasting price updates
   */
  private startBroadcast(): void {
    this.broadcastInterval = setInterval(async () => {
      if (!this.isRunning || this.clients.size === 0) return;

      for (const [clientId, client] of this.clients) {
        for (const subscription of client.subscriptions) {
          const [symbol, chain] = subscription.split(':') as [string, SupportedChain];
          await this.sendPriceUpdate(clientId, symbol, chain);
        }
      }
    }, this.BROADCAST_INTERVAL);
  }

  /**
   * Start stats collection
   */
  private startStatsCollection(): void {
    this.statsInterval = setInterval(() => {
      const stats = this.getStats();
      logger.info('WebSocket stats', stats);
    }, this.STATS_INTERVAL);
  }

  /**
   * Track latency measurement
   */
  private trackLatency(latency: number): void {
    this.latencyMeasurements.push(latency);
    if (this.latencyMeasurements.length > this.MAX_LATENCY_MEASUREMENTS) {
      this.latencyMeasurements.shift();
    }
  }

  /**
   * Get current statistics
   */
  getStats(): WebSocketStats {
    let totalSubscriptions = 0;
    for (const client of this.clients.values()) {
      totalSubscriptions += client.subscriptions.size;
    }

    const now = Date.now();
    const timeWindow = (now - this.lastStatsTime) / 1000;
    const messagesPerSecond = timeWindow > 0 ? this.messageCount / timeWindow : 0;

    const averageLatency =
      this.latencyMeasurements.length > 0
        ? this.latencyMeasurements.reduce((a, b) => a + b, 0) / this.latencyMeasurements.length
        : 0;

    // Reset counters
    this.messageCount = 0;
    this.lastStatsTime = now;

    return {
      totalClients: this.clients.size,
      totalSubscriptions,
      messagesPerSecond: Math.round(messagesPerSecond * 100) / 100,
      averageLatency: Math.round(averageLatency * 100) / 100,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: PriceStreamResponse): void {
    if (!this.isRunning || this.clients.size === 0) return;

    for (const clientId of this.clients.keys()) {
      this.sendToClient(clientId, message);
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const priceStreamManager = new PriceStreamManager();

// ============================================================================
// Convenience Functions
// ============================================================================

export function startPriceStream(): void {
  priceStreamManager.start();
}

export function stopPriceStream(): void {
  priceStreamManager.stop();
}

export function addStreamClient(id: string, ws: ExtendedWebSocket): void {
  priceStreamManager.addClient(id, ws);
}

export function getStreamStats(): ReturnType<typeof priceStreamManager.getStats> {
  return priceStreamManager.getStats();
}

// Re-export ExtendedWebSocket type for consumers
export type { ExtendedWebSocket };
