/**
 * GraphQL API Route
 *
 * GraphQL API 路由 - 提供灵活的预言机数据查询
 */

// GraphQL dependencies temporarily disabled - install with: npm install graphql-yoga @graphql-tools/schema
// import { createYoga } from 'graphql-yoga';
// import { makeExecutableSchema } from '@graphql-tools/schema';
import { query } from '@/server/db';
import type { NextRequest } from 'next/server';

// Placeholder for missing dependencies - will be properly imported when graphql packages are installed
// const createYoga = () => ({ handle: () => new Response('GraphQL not configured') });
// const makeExecutableSchema = () => ({});

// ============================================================================
// GraphQL Schema
// ============================================================================

// GraphQL temporarily disabled - typeDefs and resolvers defined but not used
const _typeDefs = `
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

// GraphQL temporarily disabled - resolvers defined but not used
const _resolvers = {
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
         ORDER BY timestamp ASC`,
        [protocol, chain, symbol, from, to],
      );
      return result.rows;
    },

    // Oracle Instance Queries
    oracleInstance: async (_: unknown, { id }: { id: string }) => {
      const result = await query(`SELECT * FROM unified_oracle_instances WHERE id = $1`, [id]);
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
      const result = await query(`SELECT * FROM unified_alerts WHERE id = $1`, [id]);
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
          query('SELECT COUNT(*) as total FROM unified_alerts'),
          query('SELECT severity, COUNT(*) as count FROM unified_alerts GROUP BY severity'),
          query('SELECT status, COUNT(*) as count FROM unified_alerts GROUP BY status'),
          query(
            'SELECT protocol, COUNT(*) as count FROM unified_alerts WHERE protocol IS NOT NULL GROUP BY protocol',
          ),
          query(
            `SELECT COUNT(*) as count FROM unified_alerts WHERE created_at > NOW() - INTERVAL '24 hours'`,
          ),
        ]);

      return {
        total: parseInt(totalResult.rows[0]?.total || 0),
        bySeverity: Object.fromEntries(
          bySeverityResult.rows.map((r) => [r.severity, parseInt(r.count)]),
        ),
        byStatus: Object.fromEntries(byStatusResult.rows.map((r) => [r.status, parseInt(r.count)])),
        byProtocol: Object.fromEntries(
          byProtocolResult.rows.map((r) => [r.protocol, parseInt(r.count)]),
        ),
        recent24h: parseInt(recentResult.rows[0]?.count || 0),
        avgResolutionTime: 0,
      };
    },

    // Price Comparison
    priceComparison: async (_: unknown, { symbol }: { symbol: string }) => {
      const result = await query(
        `SELECT DISTINCT ON (protocol, chain)
          protocol, chain, price, timestamp, is_stale
        FROM unified_price_feeds
        WHERE symbol = $1
        ORDER BY protocol, chain, timestamp DESC`,
        [symbol],
      );

      const prices = result.rows.map((row) => ({
        protocol: row.protocol,
        chain: row.chain,
        price: parseFloat(row.price),
        timestamp: row.timestamp,
        isStale: row.is_stale,
        confidence: row.metadata?.confidence || 1,
      }));

      if (prices.length === 0) {
        return null;
      }

      const priceValues = prices.map((p) => p.price);
      const averagePrice = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
      const sortedPrices = [...priceValues].sort((a, b) => a - b);
      const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];
      const minPrice = Math.min(...priceValues);
      const maxPrice = Math.max(...priceValues);
      const deviation = ((maxPrice - minPrice) / averagePrice) * 100;

      return {
        symbol,
        prices,
        averagePrice,
        medianPrice,
        minPrice,
        maxPrice,
        deviation,
        recommendedPrice: medianPrice,
        timestamp: new Date(),
      };
    },

    crossProtocolComparison: async (_: unknown, { symbols }: { symbols: string[] }) => {
      const comparisons = await Promise.all(
        symbols.map(async (symbol) => {
          const result = await query(
            `SELECT DISTINCT ON (protocol, chain)
              protocol, chain, price, timestamp, is_stale
            FROM unified_price_feeds
            WHERE symbol = $1
            ORDER BY protocol, chain, timestamp DESC`,
            [symbol],
          );

          const prices = result.rows.map((row) => ({
            protocol: row.protocol,
            chain: row.chain,
            price: parseFloat(row.price),
            timestamp: row.timestamp,
            isStale: row.is_stale,
            confidence: row.metadata?.confidence || 1,
          }));

          if (prices.length === 0) return null;

          const priceValues = prices.map((p) => p.price);
          const averagePrice = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
          const sortedPrices = [...priceValues].sort((a, b) => a - b);
          const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];

          return {
            symbol,
            prices,
            averagePrice,
            medianPrice,
            minPrice: Math.min(...priceValues),
            maxPrice: Math.max(...priceValues),
            deviation: ((Math.max(...priceValues) - Math.min(...priceValues)) / averagePrice) * 100,
            recommendedPrice: medianPrice,
            timestamp: new Date(),
          };
        }),
      );

      return comparisons.filter(Boolean);
    },

    // Statistics
    protocolStats: async (_: unknown, { protocol }: { protocol?: string }) => {
      let sql = `
        SELECT 
          protocol,
          COUNT(DISTINCT instance_id) as total_instances,
          COUNT(DISTINCT CASE WHEN us.status = 'healthy' THEN instance_id END) as active_instances,
          COUNT(*) as total_prices,
          AVG(EXTRACT(EPOCH FROM (NOW() - timestamp))) as avg_latency
        FROM unified_price_feeds upf
        LEFT JOIN unified_sync_state us ON upf.instance_id = us.instance_id
        WHERE 1=1
      `;
      const params: string[] = [];

      if (protocol) {
        sql += ` AND upf.protocol = $1`;
        params.push(protocol);
      }

      sql += ` GROUP BY protocol`;

      const result = await query(sql, params);
      return result.rows.map((row) => ({
        protocol: row.protocol,
        totalInstances: parseInt(row.total_instances),
        activeInstances: parseInt(row.active_instances),
        totalPrices: parseInt(row.total_prices),
        averageLatency: parseFloat(row.avg_latency) || 0,
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

// Note: GraphQL dependencies are temporarily disabled
// const schema = makeExecutableSchema({
//   typeDefs,
//   resolvers,
// });

// ============================================================================
// Create Yoga Instance
// ============================================================================

// const yoga = createYoga({
//   schema,
//   graphqlEndpoint: '/api/graphql',
//   fetchAPI: {
//     Request: Request,
//     Response: Response,
//   },
// });

// ============================================================================
// Route Handler
// ============================================================================

export async function GET(_request: NextRequest) {
  // return yoga.handle(_request);
  return new Response(JSON.stringify({ error: 'GraphQL not configured' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(_request: NextRequest) {
  // return yoga.handle(_request);
  return new Response(JSON.stringify({ error: 'GraphQL not configured' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function OPTIONS(_request: NextRequest) {
  // 引用未使用的变量以避免 TypeScript 错误
  void _typeDefs;
  void _resolvers;

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
