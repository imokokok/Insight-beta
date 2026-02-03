/**
 * WebSocket Price Stream Service
 *
 * Real-time price data streaming service
 * - Supports multi-protocol real-time price push
 * - Subscribe to specific trading pairs
 * - Cross-protocol price comparison stream
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
// Configuration
// ============================================================================

const STREAM_CONFIG = {
  /** Heartbeat interval in milliseconds */
  heartbeatInterval: 30000,

  /** Price push interval in milliseconds */
  pricePushInterval: 5000,

  /** Comparison data push interval in milliseconds */
  comparisonInterval: 10000,

  /** Maximum number of client connections */
  maxClients: 1000,

  /** Maximum subscriptions per client */
  maxSubscriptionsPerClient: 50,

  /** Data freshness threshold in seconds */
  dataFreshnessThreshold: 60,
} as const;

// ============================================================================
// Price Stream Manager
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
   * Start the price stream service
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Price stream manager already running');
      return;
    }

    logger.info('Starting price stream manager');
    this.isRunning = true;

    // Start heartbeat check
    this.heartbeatInterval = setInterval(() => {
      this.checkClientHealth();
    }, STREAM_CONFIG.heartbeatInterval);

    // Start price push
    this.pricePushInterval = setInterval(() => {
      this.pushPriceUpdates();
    }, STREAM_CONFIG.pricePushInterval);

    // Start comparison data push
    this.comparisonInterval = setInterval(() => {
      this.pushComparisonUpdates();
    }, STREAM_CONFIG.comparisonInterval);

    logger.info('Price stream manager started');
  }

  /**
   * Stop the price stream service
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

    // Close all client connections
    for (const client of this.clients.values()) {
      client.ws.close();
    }
    this.clients.clear();
    this.symbolSubscriptions.clear();

    logger.info('Price stream manager stopped');
  }

  /**
   * Add a client
   */
  addClient(id: string, ws: ExtendedWebSocket): void {
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

    // Set message handler
    ws.onmessage = (event) => {
      this.handleMessage(id, event.data as string);
    };

    // Set close handler
    ws.onclose = () => {
      this.removeClient(id);
    };

    // Set error handler
    ws.onerror = (error) => {
      logger.error(`WebSocket error for client ${id}`, { error });
    };

    // Set pong handler
    ws.onpong = () => {
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
   * Remove a client
   */
  removeClient(id: string): void {
    const client = this.clients.get(id);
    if (!client) return;

    // Unsubscribe from all symbols
    for (const symbol of client.subscriptions) {
      this.unsubscribeFromSymbol(id, symbol);
    }

    this.clients.delete(id);
    logger.info(`Client ${id} disconnected`, {
      totalClients: this.clients.size,
    });
  }

  /**
   * Handle client messages
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
   * Handle subscription request
   */
  private handleSubscribe(clientId: string, symbols: string[], chain?: SupportedChain): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Check subscription limit
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

      // Add to global subscription mapping
      if (!this.symbolSubscriptions.has(subscriptionKey)) {
        this.symbolSubscriptions.set(subscriptionKey, new Set());
      }
      const subscriptionSet = this.symbolSubscriptions.get(subscriptionKey);
      if (subscriptionSet) {
        subscriptionSet.add(clientId);
      }
    }

    this.sendToClient(clientId, { type: 'subscribed', symbols });

    // Push current data immediately
    this.pushCurrentData(clientId, symbols, chain);

    logger.debug(`Client ${clientId} subscribed to ${symbols.join(', ')}`, {
      chain,
    });
  }

  /**
   * Handle unsubscribe request
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
   * Unsubscribe from a specific symbol
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
   * Handle get comparison data request
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
   * Push current data to newly subscribed client
   */
  private async pushCurrentData(
    clientId: string,
    symbols: string[],
    chain?: SupportedChain,
  ): Promise<void> {
    for (const symbol of symbols) {
      // Push latest price
      const lastPrice = this.lastPrices.get(symbol);
      if (lastPrice) {
        this.sendToClient(clientId, {
          type: 'price_update',
          data: lastPrice,
        });
      }

      // Push comparison data
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
   * Check client health status
   */
  private checkClientHealth(): void {
    for (const [clientId, client] of this.clients.entries()) {
      if (!client.isAlive) {
        logger.debug(`Client ${clientId} is not alive, terminating connection`);
        // Use optional chaining for terminate method
        client.ws.terminate?.();
        this.removeClient(clientId);
        continue;
      }

      client.isAlive = false;
      // Use optional chaining for ping method
      client.ws.ping?.();
    }
  }

  /**
   * Push price updates
   */
  private async pushPriceUpdates(): Promise<void> {
    if (this.symbolSubscriptions.size === 0) return;

    try {
      // Get latest prices for all subscribed symbols
      const symbols = Array.from(this.symbolSubscriptions.keys());

      for (const symbol of symbols) {
        const subscribers = this.symbolSubscriptions.get(symbol);
        if (!subscribers || subscribers.size === 0) continue;

        // Get latest price data
        const priceData = await this.fetchLatestPrice(symbol);
        if (!priceData) continue;

        // Check if price has changed
        const lastPrice = this.lastPrices.get(symbol);
        if (lastPrice && lastPrice.price === priceData.price) {
          continue; // Price unchanged, skip
        }

        // Update cache
        this.lastPrices.set(symbol, priceData);

        // Push to all subscribers
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
   * Push comparison data updates
   */
  private async pushComparisonUpdates(): Promise<void> {
    if (this.symbolSubscriptions.size === 0) return;

    try {
      const symbols = Array.from(this.symbolSubscriptions.keys());

      for (const symbol of symbols) {
        const subscribers = this.symbolSubscriptions.get(symbol);
        if (!subscribers || subscribers.size === 0) continue;

        // Get comparison data
        const comparison = await priceAggregationEngine.aggregatePrices(symbol);
        if (!comparison) continue;

        // Push to all subscribers
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
   * Get latest price
   */
  private async fetchLatestPrice(symbol: string): Promise<PriceUpdateData | null> {
    try {
      // Get latest price from database
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
   * Send message to client
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
   * Broadcast message to all clients
   */
  broadcast(message: PriceStreamResponse): void {
    for (const clientId of this.clients.keys()) {
      this.sendToClient(clientId, message);
    }
  }

  /**
   * Get statistics
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
