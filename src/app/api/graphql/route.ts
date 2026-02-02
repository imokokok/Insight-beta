/**
 * GraphQL API Route
 *
 * GraphQL API 路由 - 提供灵活的预言机数据查询
 * 支持 Query, Mutation 和 Subscription
 */

import { createYoga, createSchema } from 'graphql-yoga';
import { query } from '@/server/db';
import type { NextRequest } from 'next/server';

// ============================================================================
// PubSub System for Subscriptions
// ============================================================================

type SubscriptionPayload = {
  priceUpdate?: PriceFeedPayload;
  alertCreated?: AlertPayload;
  syncStatusUpdate?: SyncStatusPayload;
};

type PriceFeedPayload = {
  id: string;
  instanceId: string;
  protocol: string;
  chain: string;
  symbol: string;
  price: number;
  timestamp: Date;
  blockNumber?: number;
  isStale: boolean;
  metadata?: Record<string, unknown>;
};

type AlertPayload = {
  id: string;
  ruleId: string;
  event: string;
  severity: string;
  title: string;
  message: string;
  protocol?: string;
  chain?: string;
  instanceId?: string;
  symbol?: string;
  context?: Record<string, unknown>;
  status: string;
  occurrences: number;
  createdAt: Date;
  updatedAt: Date;
};

type SyncStatusPayload = {
  id: string;
  instanceId: string;
  protocol: string;
  status: string;
  lastSyncAt?: Date;
  lastProcessedBlock?: number;
  lagBlocks?: number;
  errorCount: number;
  lastError?: string;
  updatedAt: Date;
};

type Listener = (payload: SubscriptionPayload) => void;

class PubSub {
  private listeners: Map<string, Set<Listener>> = new Map();

  subscribe(event: string, listener: Listener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.add(listener);
    }

    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  publish(event: string, payload: SubscriptionPayload): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((listener) => listener(payload));
    }
  }

  // Helper methods for specific events
  subscribePriceUpdate(
    protocol: string | undefined,
    chain: string | undefined,
    symbol: string | undefined,
    listener: Listener,
  ): () => void {
    const eventKey = this.getPriceUpdateEventKey(protocol, chain, symbol);
    return this.subscribe(eventKey, listener);
  }

  subscribeAlertCreated(
    severity: string | undefined,
    protocol: string | undefined,
    listener: Listener,
  ): () => void {
    const eventKey = this.getAlertCreatedEventKey(severity, protocol);
    return this.subscribe(eventKey, listener);
  }

  subscribeSyncStatusUpdate(instanceId: string, listener: Listener): () => void {
    return this.subscribe(`sync:${instanceId}`, listener);
  }

  publishPriceUpdate(payload: PriceFeedPayload): void {
    // Publish to specific channel
    const specificKey = this.getPriceUpdateEventKey(
      payload.protocol,
      payload.chain,
      payload.symbol,
    );
    this.publish(specificKey, { priceUpdate: payload });

    // Publish to wildcard channels
    this.publish(`price:${payload.protocol}:*`, { priceUpdate: payload });
    this.publish(`price:*:${payload.symbol}`, { priceUpdate: payload });
    this.publish('price:*:*', { priceUpdate: payload });
  }

  publishAlertCreated(payload: AlertPayload): void {
    const specificKey = this.getAlertCreatedEventKey(payload.severity, payload.protocol);
    this.publish(specificKey, { alertCreated: payload });
    this.publish('alert:*', { alertCreated: payload });
  }

  publishSyncStatusUpdate(instanceId: string, payload: SyncStatusPayload): void {
    this.publish(`sync:${instanceId}`, { syncStatusUpdate: payload });
  }

  private getPriceUpdateEventKey(
    protocol: string | undefined,
    chain: string | undefined,
    symbol: string | undefined,
  ): string {
    return `price:${protocol || '*'}:${chain || '*'}:${symbol || '*'}`;
  }

  private getAlertCreatedEventKey(
    severity: string | undefined,
    protocol: string | undefined,
  ): string {
    return `alert:${severity || '*'}:${protocol || '*'}`;
  }
}

// Global PubSub instance
const pubsub = new PubSub();

// ============================================================================
// GraphQL Schema
// ============================================================================

const typeDefs = `
  scalar DateTime
  scalar JSON

  enum OracleProtocol {
    insight
    uma
    chainlink
    pyth
    band
    api3
    redstone
    switchboard
    flux
    dia
  }

  enum SupportedChain {
    ethereum
    polygon
    arbitrum
    optimism
    base
    avalanche
    bsc
    fantom
    celo
    gnosis
    linea
    scroll
    mantle
    mode
    blast
    solana
    near
    aptos
    sui
    polygonAmoy
    sepolia
    goerli
    mumbai
    local
  }

  enum AlertSeverity {
    info
    warning
    critical
  }

  enum AlertStatus {
    open
    acknowledged
    resolved
  }

  type PriceFeed {
    id: ID!
    instanceId: String!
    protocol: OracleProtocol!
    chain: SupportedChain!
    symbol: String!
    price: Float!
    timestamp: DateTime!
    blockNumber: Int
    isStale: Boolean!
    metadata: JSON
  }

  type OracleInstance {
    id: ID!
    name: String!
    protocol: OracleProtocol!
    chain: SupportedChain!
    address: String
    config: JSON
    enabled: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
    syncStatus: SyncStatus
    latestPrices: [PriceFeed!]!
  }

  type SyncStatus {
    id: ID!
    instanceId: String!
    protocol: OracleProtocol!
    status: String!
    lastSyncAt: DateTime
    lastProcessedBlock: Int
    lagBlocks: Int
    errorCount: Int!
    lastError: String
    updatedAt: DateTime!
  }

  type Alert {
    id: ID!
    ruleId: String!
    event: String!
    severity: AlertSeverity!
    title: String!
    message: String!
    protocol: OracleProtocol
    chain: SupportedChain
    instanceId: String
    symbol: String
    context: JSON
    status: AlertStatus!
    acknowledgedBy: String
    acknowledgedAt: DateTime
    resolvedBy: String
    resolvedAt: DateTime
    occurrences: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type PriceComparison {
    symbol: String!
    prices: [ProtocolPrice!]!
    averagePrice: Float!
    medianPrice: Float!
    minPrice: Float!
    maxPrice: Float!
    deviation: Float!
    recommendedPrice: Float!
    timestamp: DateTime!
  }

  type ProtocolPrice {
    protocol: OracleProtocol!
    chain: SupportedChain!
    price: Float!
    timestamp: DateTime!
    confidence: Float
    isStale: Boolean!
  }

  type ProtocolStats {
    protocol: OracleProtocol!
    totalInstances: Int!
    activeInstances: Int!
    totalPrices: Int!
    averageLatency: Float
    uptime: Float!
    lastUpdate: DateTime
  }

  type Query {
    # Price Feeds
    priceFeed(id: ID!): PriceFeed
    priceFeeds(
      protocol: OracleProtocol
      chain: SupportedChain
      symbol: String
      limit: Int = 100
      offset: Int = 0
    ): [PriceFeed!]!
    latestPrice(protocol: OracleProtocol!, chain: SupportedChain!, symbol: String!): PriceFeed
    historicalPrices(
      protocol: OracleProtocol!
      chain: SupportedChain!
      symbol: String!
      from: DateTime!
      to: DateTime!
    ): [PriceFeed!]!

    # Oracle Instances
    oracleInstance(id: ID!): OracleInstance
    oracleInstances(
      protocol: OracleProtocol
      chain: SupportedChain
      enabled: Boolean
      limit: Int = 100
      offset: Int = 0
    ): [OracleInstance!]!

    # Alerts
    alert(id: ID!): Alert
    alerts(
      status: AlertStatus
      severity: AlertSeverity
      protocol: OracleProtocol
      chain: SupportedChain
      limit: Int = 100
      offset: Int = 0
    ): [Alert!]!
    alertStats: AlertStats!

    # Price Comparison
    priceComparison(symbol: String!): PriceComparison
    crossProtocolComparison(symbols: [String!]!): [PriceComparison!]!

    # Statistics
    protocolStats(protocol: OracleProtocol): [ProtocolStats!]!
    globalStats: GlobalStats!
  }

  type AlertStats {
    total: Int!
    bySeverity: JSON!
    byStatus: JSON!
    byProtocol: JSON!
    recent24h: Int!
    avgResolutionTime: Float
  }

  type GlobalStats {
    totalInstances: Int!
    activeInstances: Int!
    totalProtocols: Int!
    totalChains: Int!
    totalPriceUpdates1h: Int!
    activeAlerts: Int!
    systemHealth: String!
  }

  type Mutation {
    # Instance Management
    createOracleInstance(
      name: String!
      protocol: OracleProtocol!
      chain: SupportedChain!
      address: String
      config: JSON
    ): OracleInstance!
    
    updateOracleInstance(
      id: ID!
      name: String
      config: JSON
      enabled: Boolean
    ): OracleInstance!
    
    deleteOracleInstance(id: ID!): Boolean!

    # Alert Management
    acknowledgeAlert(id: ID!, userId: String!): Alert!
    resolveAlert(id: ID!, userId: String!): Alert!
    
    # Sync Control
    startSync(instanceId: ID!): SyncStatus!
    stopSync(instanceId: ID!): SyncStatus!
  }

  type Subscription {
    priceUpdate(
      protocol: OracleProtocol
      chain: SupportedChain
      symbol: String
    ): PriceFeed!
    
    alertCreated(
      severity: AlertSeverity
      protocol: OracleProtocol
    ): Alert!
    
    syncStatusUpdate(instanceId: ID!): SyncStatus!
  }
`;

// ============================================================================
// Resolvers
// ============================================================================

const resolvers = {
  Query: {
    // Price Feed Queries
    priceFeed: async (_: unknown, { id }: { id: string }) => {
      const result = await query(`SELECT * FROM unified_price_feeds WHERE id = $1`, [id]);
      return result.rows[0] || null;
    },

    priceFeeds: async (
      _: unknown,
      {
        protocol,
        chain,
        symbol,
        limit = 100,
        offset = 0,
      }: {
        protocol?: string;
        chain?: string;
        symbol?: string;
        limit?: number;
        offset?: number;
      },
    ) => {
      let sql = `SELECT * FROM unified_price_feeds WHERE 1=1`;
      const params: (string | number)[] = [];
      let paramIndex = 1;

      if (protocol) {
        sql += ` AND protocol = $${paramIndex++}`;
        params.push(protocol);
      }
      if (chain) {
        sql += ` AND chain = $${paramIndex++}`;
        params.push(chain);
      }
      if (symbol) {
        sql += ` AND symbol = $${paramIndex++}`;
        params.push(symbol);
      }

      sql += ` ORDER BY timestamp DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, offset);

      const result = await query(sql, params);
      return result.rows;
    },

    latestPrice: async (
      _: unknown,
      { protocol, chain, symbol }: { protocol: string; chain: string; symbol: string },
    ) => {
      const result = await query(
        `SELECT * FROM unified_price_feeds 
         WHERE protocol = $1 AND chain = $2 AND symbol = $3
         ORDER BY timestamp DESC LIMIT 1`,
        [protocol, chain, symbol],
      );
      return result.rows[0] || null;
    },

    historicalPrices: async (
      _: unknown,
      {
        protocol,
        chain,
        symbol,
        from,
        to,
      }: {
        protocol: string;
        chain: string;
        symbol: string;
        from: string;
        to: string;
      },
    ) => {
      const result = await query(
        `SELECT * FROM unified_price_feeds 
         WHERE protocol = $1 AND chain = $2 AND symbol = $3
         AND timestamp >= $4 AND timestamp <= $5
         ORDER BY timestamp DESC`,
        [protocol, chain, symbol, from, to],
      );
      return result.rows;
    },

    // Oracle Instance Queries
    oracleInstance: async (_: unknown, { id }: { id: string }) => {
      const result = await query('SELECT * FROM unified_oracle_instances WHERE id = $1', [id]);
      return result.rows[0] || null;
    },

    oracleInstances: async (
      _: unknown,
      {
        protocol,
        chain,
        enabled,
        limit = 100,
        offset = 0,
      }: {
        protocol?: string;
        chain?: string;
        enabled?: boolean;
        limit?: number;
        offset?: number;
      },
    ) => {
      let sql = `SELECT * FROM unified_oracle_instances WHERE 1=1`;
      const params: (string | number | boolean)[] = [];
      let paramIndex = 1;

      if (protocol) {
        sql += ` AND protocol = $${paramIndex++}`;
        params.push(protocol);
      }
      if (chain) {
        sql += ` AND chain = $${paramIndex++}`;
        params.push(chain);
      }
      if (enabled !== undefined) {
        sql += ` AND enabled = $${paramIndex++}`;
        params.push(enabled);
      }

      sql += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, offset);

      const result = await query(sql, params);
      return result.rows;
    },

    // Alert Queries
    alert: async (_: unknown, { id }: { id: string }) => {
      const result = await query('SELECT * FROM unified_alerts WHERE id = $1', [id]);
      return result.rows[0] || null;
    },

    alerts: async (
      _: unknown,
      {
        status,
        severity,
        protocol,
        chain,
        limit = 100,
        offset = 0,
      }: {
        status?: string;
        severity?: string;
        protocol?: string;
        chain?: string;
        limit?: number;
        offset?: number;
      },
    ) => {
      let sql = `SELECT * FROM unified_alerts WHERE 1=1`;
      const params: (string | number)[] = [];
      let paramIndex = 1;

      if (status) {
        sql += ` AND status = $${paramIndex++}`;
        params.push(status);
      }
      if (severity) {
        sql += ` AND severity = $${paramIndex++}`;
        params.push(severity);
      }
      if (protocol) {
        sql += ` AND protocol = $${paramIndex++}`;
        params.push(protocol);
      }
      if (chain) {
        sql += ` AND chain = $${paramIndex++}`;
        params.push(chain);
      }

      sql += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, offset);

      const result = await query(sql, params);
      return result.rows;
    },

    alertStats: async () => {
      const [totalResult, bySeverityResult, byStatusResult, byProtocolResult, recentResult] =
        await Promise.all([
          query('SELECT COUNT(*) FROM unified_alerts'),
          query(`SELECT severity, COUNT(*) FROM unified_alerts GROUP BY severity`),
          query(`SELECT status, COUNT(*) FROM unified_alerts GROUP BY status`),
          query(
            `SELECT protocol, COUNT(*) FROM unified_alerts WHERE protocol IS NOT NULL GROUP BY protocol`,
          ),
          query(
            `SELECT COUNT(*) FROM unified_alerts WHERE created_at > NOW() - INTERVAL '24 hours'`,
          ),
        ]);

      const bySeverity: Record<string, number> = {};
      bySeverityResult.rows.forEach((row) => {
        bySeverity[row.severity as string] = parseInt(row.count as string);
      });

      const byStatus: Record<string, number> = {};
      byStatusResult.rows.forEach((row) => {
        byStatus[row.status as string] = parseInt(row.count as string);
      });

      const byProtocol: Record<string, number> = {};
      byProtocolResult.rows.forEach((row) => {
        byProtocol[row.protocol as string] = parseInt(row.count as string);
      });

      return {
        total: parseInt(totalResult.rows[0]?.count || 0),
        bySeverity,
        byStatus,
        byProtocol,
        recent24h: parseInt(recentResult.rows[0]?.count || 0),
        avgResolutionTime: null,
      };
    },

    // Price Comparison Queries
    priceComparison: async (_: unknown, { symbol }: { symbol: string }) => {
      const result = await query(
        `SELECT 
          protocol,
          chain,
          price,
          timestamp,
          CASE WHEN timestamp < NOW() - INTERVAL '5 minutes' THEN true ELSE false END as is_stale
        FROM unified_price_feeds
        WHERE symbol = $1
        AND timestamp > NOW() - INTERVAL '1 hour'
        ORDER BY timestamp DESC`,
        [symbol],
      );

      const prices = result.rows.map((row) => ({
        protocol: row.protocol as string,
        chain: row.chain as string,
        price: parseFloat(row.price as string),
        timestamp: row.timestamp as Date,
        confidence: 0.95,
        isStale: row.is_stale as boolean,
      }));

      if (prices.length === 0) {
        return null;
      }

      const priceValues = prices.map((p: { price: number }) => p.price);
      const avg = priceValues.reduce((a: number, b: number) => a + b, 0) / priceValues.length;
      const sorted = [...priceValues].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const min = Math.min(...priceValues);
      const max = Math.max(...priceValues);
      const deviation = ((max - min) / avg) * 100;

      return {
        symbol,
        prices,
        averagePrice: avg,
        medianPrice: median,
        minPrice: min,
        maxPrice: max,
        deviation,
        recommendedPrice: median,
        timestamp: new Date(),
      };
    },

    crossProtocolComparison: async (_: unknown, { symbols }: { symbols: string[] }) => {
      const comparisons = await Promise.all(
        symbols.map(async (symbol: string) => {
          const result = await query(
            `SELECT 
              protocol,
              chain,
              price,
              timestamp,
              CASE WHEN timestamp < NOW() - INTERVAL '5 minutes' THEN true ELSE false END as is_stale
            FROM unified_price_feeds
            WHERE symbol = $1
            AND timestamp > NOW() - INTERVAL '1 hour'
            ORDER BY timestamp DESC`,
            [symbol],
          );

          const prices = result.rows.map((row) => ({
            protocol: row.protocol as string,
            chain: row.chain as string,
            price: parseFloat(row.price as string),
            timestamp: row.timestamp as Date,
            confidence: 0.95,
            isStale: row.is_stale as boolean,
          }));

          if (prices.length === 0) {
            return null;
          }

          const priceValues = prices.map((p: { price: number }) => p.price);
          const avg = priceValues.reduce((a: number, b: number) => a + b, 0) / priceValues.length;
          const sorted = [...priceValues].sort((a, b) => a - b);
          const median = sorted[Math.floor(sorted.length / 2)];
          const min = Math.min(...priceValues);
          const max = Math.max(...priceValues);
          const deviation = ((max - min) / avg) * 100;

          return {
            symbol,
            prices,
            averagePrice: avg,
            medianPrice: median,
            minPrice: min,
            maxPrice: max,
            deviation,
            recommendedPrice: median,
            timestamp: new Date(),
          };
        }),
      );

      return comparisons.filter(Boolean);
    },

    // Statistics Queries
    protocolStats: async (_: unknown, { protocol }: { protocol?: string }) => {
      let sql = `
        SELECT 
          upf.protocol,
          COUNT(DISTINCT upf.instance_id) as total_instances,
          COUNT(DISTINCT CASE WHEN uoi.enabled THEN upf.instance_id END) as active_instances,
          COUNT(*) as total_prices,
          AVG(EXTRACT(EPOCH FROM (upf.timestamp - uoi.created_at))) as avg_latency
        FROM unified_price_feeds upf
        JOIN unified_oracle_instances uoi ON upf.instance_id = uoi.id
        WHERE upf.timestamp > NOW() - INTERVAL '24 hours'
      `;
      const params: string[] = [];

      if (protocol) {
        sql += ` AND upf.protocol = $1`;
        params.push(protocol);
      }

      sql += ` GROUP BY protocol`;

      const result = await query(sql, params);
      return result.rows.map((row) => ({
        protocol: row.protocol as string,
        totalInstances: parseInt(row.total_instances as string),
        activeInstances: parseInt(row.active_instances as string),
        totalPrices: parseInt(row.total_prices as string),
        averageLatency: parseFloat(row.avg_latency as string) || 0,
        uptime: 99.5,
        lastUpdate: new Date(),
      }));
    },

    globalStats: async () => {
      const [instancesResult, protocolsResult, chainsResult, pricesResult, alertsResult] =
        await Promise.all([
          query(
            'SELECT COUNT(*), COUNT(CASE WHEN enabled THEN 1 END) FROM unified_oracle_instances',
          ),
          query('SELECT COUNT(DISTINCT protocol) FROM unified_oracle_instances'),
          query('SELECT COUNT(DISTINCT chain) FROM unified_oracle_instances'),
          query(
            `SELECT COUNT(*) FROM unified_price_feeds WHERE timestamp > NOW() - INTERVAL '1 hour'`,
          ),
          query(`SELECT COUNT(*) FROM unified_alerts WHERE status = 'open'`),
        ]);

      return {
        totalInstances: parseInt(instancesResult.rows[0]?.count || 0),
        activeInstances: parseInt(instancesResult.rows[0]?.count || 0),
        totalProtocols: parseInt(protocolsResult.rows[0]?.count || 0),
        totalChains: parseInt(chainsResult.rows[0]?.count || 0),
        totalPriceUpdates1h: parseInt(pricesResult.rows[0]?.count || 0),
        activeAlerts: parseInt(alertsResult.rows[0]?.count || 0),
        systemHealth: 'healthy',
      };
    },
  },

  Mutation: {
    createOracleInstance: async (
      _: unknown,
      {
        name,
        protocol,
        chain,
        address,
        config,
      }: {
        name: string;
        protocol: string;
        chain: string;
        address?: string;
        config?: Record<string, unknown>;
      },
    ) => {
      const result = await query(
        `INSERT INTO unified_oracle_instances 
         (name, protocol, chain, address, config, enabled, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
         RETURNING *`,
        [name, protocol, chain, address, JSON.stringify(config || {})],
      );
      return result.rows[0];
    },

    updateOracleInstance: async (
      _: unknown,
      {
        id,
        name,
        config,
        enabled,
      }: {
        id: string;
        name?: string;
        config?: Record<string, unknown>;
        enabled?: boolean;
      },
    ) => {
      const updates: string[] = [];
      const values: (string | boolean)[] = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
      }
      if (config !== undefined) {
        updates.push(`config = $${paramIndex++}`);
        values.push(JSON.stringify(config));
      }
      if (enabled !== undefined) {
        updates.push(`enabled = $${paramIndex++}`);
        values.push(enabled);
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const result = await query(
        `UPDATE unified_oracle_instances SET ${updates.join(', ')} 
         WHERE id = $${paramIndex} RETURNING *`,
        values,
      );
      return result.rows[0];
    },

    deleteOracleInstance: async (_: unknown, { id }: { id: string }) => {
      const result = await query('DELETE FROM unified_oracle_instances WHERE id = $1', [id]);
      return (result.rowCount ?? 0) > 0;
    },

    acknowledgeAlert: async (_: unknown, { id, userId }: { id: string; userId: string }) => {
      const result = await query(
        `UPDATE unified_alerts 
         SET status = 'acknowledged', acknowledged_by = $2, acknowledged_at = NOW(), updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, userId],
      );
      return result.rows[0];
    },

    resolveAlert: async (_: unknown, { id, userId }: { id: string; userId: string }) => {
      const result = await query(
        `UPDATE unified_alerts 
         SET status = 'resolved', resolved_by = $2, resolved_at = NOW(), updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, userId],
      );
      return result.rows[0];
    },

    startSync: async (_: unknown, { instanceId }: { instanceId: string }) => {
      const result = await query(
        `UPDATE unified_sync_state 
         SET status = 'active', updated_at = NOW()
         WHERE instance_id = $1 RETURNING *`,
        [instanceId],
      );
      return result.rows[0];
    },

    stopSync: async (_: unknown, { instanceId }: { instanceId: string }) => {
      const result = await query(
        `UPDATE unified_sync_state 
         SET status = 'stopped', updated_at = NOW()
         WHERE instance_id = $1 RETURNING *`,
        [instanceId],
      );
      return result.rows[0];
    },
  },

  Subscription: {
    priceUpdate: {
      subscribe: async function* (
        _: unknown,
        { protocol, chain, symbol }: { protocol?: string; chain?: string; symbol?: string },
      ) {
        const eventKey = `price:${protocol || '*'}:${chain || '*'}:${symbol || '*'}`;

        // Create an async iterator that listens to pubsub events
        const queue: PriceFeedPayload[] = [];
        let resolveNext: ((value: IteratorResult<PriceFeedPayload>) => void) | null = null;

        const unsubscribe = pubsub.subscribe(eventKey, (payload) => {
          if (payload.priceUpdate) {
            if (resolveNext) {
              resolveNext({ value: payload.priceUpdate, done: false });
              resolveNext = null;
            } else {
              queue.push(payload.priceUpdate);
            }
          }
        });

        try {
          while (true) {
            if (queue.length > 0) {
              const item = queue.shift();
              if (item) {
                yield { priceUpdate: item };
              }
            } else {
              const promise = new Promise<IteratorResult<PriceFeedPayload>>((resolve) => {
                resolveNext = resolve;
              });
              const result = await promise;
              if (!result.done) {
                yield { priceUpdate: result.value };
              }
            }
          }
        } finally {
          unsubscribe();
        }
      },
      resolve: (payload: { priceUpdate: PriceFeedPayload }) => payload.priceUpdate,
    },

    alertCreated: {
      subscribe: async function* (
        _: unknown,
        { severity, protocol }: { severity?: string; protocol?: string },
      ) {
        const eventKey = `alert:${severity || '*'}:${protocol || '*'}`;

        const queue: AlertPayload[] = [];
        let resolveNext: ((value: IteratorResult<AlertPayload>) => void) | null = null;

        const unsubscribe = pubsub.subscribe(eventKey, (payload) => {
          if (payload.alertCreated) {
            if (resolveNext) {
              resolveNext({ value: payload.alertCreated, done: false });
              resolveNext = null;
            } else {
              queue.push(payload.alertCreated);
            }
          }
        });

        try {
          while (true) {
            if (queue.length > 0) {
              yield { alertCreated: queue.shift()! };
            } else {
              const promise = new Promise<IteratorResult<AlertPayload>>((resolve) => {
                resolveNext = resolve;
              });
              const result = await promise;
              if (!result.done) {
                yield { alertCreated: result.value };
              }
            }
          }
        } finally {
          unsubscribe();
        }
      },
      resolve: (payload: { alertCreated: AlertPayload }) => payload.alertCreated,
    },

    syncStatusUpdate: {
      subscribe: async function* (_: unknown, { instanceId }: { instanceId: string }) {
        const eventKey = `sync:${instanceId}`;

        const queue: SyncStatusPayload[] = [];
        let resolveNext: ((value: IteratorResult<SyncStatusPayload>) => void) | null = null;

        const unsubscribe = pubsub.subscribe(eventKey, (payload) => {
          if (payload.syncStatusUpdate) {
            if (resolveNext) {
              resolveNext({ value: payload.syncStatusUpdate, done: false });
              resolveNext = null;
            } else {
              queue.push(payload.syncStatusUpdate);
            }
          }
        });

        try {
          while (true) {
            if (queue.length > 0) {
              const item = queue.shift();
              if (item) {
                yield { syncStatusUpdate: item };
              }
            } else {
              const promise = new Promise<IteratorResult<SyncStatusPayload>>((resolve) => {
                resolveNext = resolve;
              });
              const result = await promise;
              if (!result.done) {
                yield { syncStatusUpdate: result.value };
              }
            }
          }
        } finally {
          unsubscribe();
        }
      },
      resolve: (payload: { syncStatusUpdate: SyncStatusPayload }) => payload.syncStatusUpdate,
    },
  },

  OracleInstance: {
    syncStatus: async (parent: { id: string }) => {
      const result = await query('SELECT * FROM unified_sync_state WHERE instance_id = $1', [
        parent.id,
      ]);
      return result.rows[0] || null;
    },
    latestPrices: async (parent: { id: string }) => {
      const result = await query(
        `SELECT DISTINCT ON (symbol)
          id, instance_id, protocol, chain, symbol, price, timestamp,
          block_number, is_stale, metadata
        FROM unified_price_feeds
        WHERE instance_id = $1
        ORDER BY symbol, timestamp DESC
        LIMIT 10`,
        [parent.id],
      );
      return result.rows;
    },
  },
};

// ============================================================================
// Create Schema
// ============================================================================

const schema = createSchema({
  typeDefs,
  resolvers,
});

// ============================================================================
// Create Yoga Instance
// ============================================================================

const yoga = createYoga({
  schema,
  graphqlEndpoint: '/api/graphql',
  fetchAPI: {
    Request: Request,
    Response: Response,
  },
  // Enable subscriptions
  graphiql: {
    subscriptionsProtocol: 'SSE', // Server-Sent Events for subscriptions
  },
});

// ============================================================================
// Route Handler
// ============================================================================

export async function GET(request: NextRequest) {
  return yoga.handle(request);
}

export async function POST(request: NextRequest) {
  return yoga.handle(request);
}

export async function OPTIONS(request: NextRequest) {
  return yoga.handle(request);
}
