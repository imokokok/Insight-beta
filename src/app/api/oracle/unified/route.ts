/**
 * Unified Oracle API Routes
 *
 * 通用预言机监控平台统一 API 入口
 * 支持多预言机协议的统一管理和查询
 */

import type { NextRequest } from 'next/server';
import { query } from '@/server/db';
import { logger } from '@/lib/logger';
import { handleApi, rateLimit } from '@/server/apiResponse';
import {
  createUnifiedInstance,
  listUnifiedInstances,
  getUnifiedInstance,
  updateUnifiedInstance,
  deleteUnifiedInstance,
  getInstanceStats,
} from '@/server/oracle/unifiedConfig';
import { startChainlinkSync, stopChainlinkSync } from '@/server/oracle/chainlinkSync';
import { startPythSync, stopPythSync } from '@/server/oracle/pythSync';
import type { OracleProtocol, SupportedChain } from '@/lib/types/unifiedOracleTypes';

const RATE_LIMITS = {
  GET: { key: 'unified_get', limit: 100, windowMs: 60_000 },
  POST: { key: 'unified_post', limit: 20, windowMs: 60_000 },
  PUT: { key: 'unified_put', limit: 20, windowMs: 60_000 },
  DELETE: { key: 'unified_delete', limit: 10, windowMs: 60_000 },
} as const;

// ============================================================================
// GET /api/oracle/unified
// ============================================================================

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    return await handleApi(request, async () => {
      const limited = await rateLimit(request, RATE_LIMITS.GET);
      if (limited) return limited;

      const url = new URL(request.url);
      const action = url.searchParams.get('action') || 'overview';

      switch (action) {
        case 'overview':
          return await getOverview();
        case 'instances':
          return await listInstances(url.searchParams);
        case 'instance':
          return await getInstance(url.searchParams.get('id'));
        case 'prices':
          return await getPrices(url.searchParams);
        case 'comparison':
          return await getPriceComparison(url.searchParams);
        case 'protocols':
          return await getProtocols();
        case 'chains':
          return await getChains();
        case 'stats':
          return await getGlobalStats();
        default:
          return { error: 'Unknown action' };
      }
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('Unified API GET failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
      durationMs,
    });
    throw error;
  }
}

// ============================================================================
// POST /api/oracle/unified
// ============================================================================

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    return await handleApi(request, async () => {
      const limited = await rateLimit(request, RATE_LIMITS.POST);
      if (limited) return limited;

      const body = await request.json();
      const { action } = body;

      switch (action) {
        case 'create':
          return await createInstance(body);
        case 'start':
          return await startSync(body.instanceId, body.protocol);
        case 'stop':
          return await stopSync(body.instanceId, body.protocol);
        case 'batchCreate':
          return await batchCreateInstances(body.instances);
        case 'batchUpdateStatus':
          return await batchUpdateStatus(body.ids, body.enabled);
        default:
          return { error: 'Unknown action' };
      }
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('Unified API POST failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
      durationMs,
    });
    throw error;
  }
}

// ============================================================================
// PUT /api/oracle/unified
// ============================================================================

export async function PUT(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    return await handleApi(request, async () => {
      const limited = await rateLimit(request, RATE_LIMITS.PUT);
      if (limited) return limited;

      const body = await request.json();
      const { id, updates } = body;

      if (!id) {
        return { error: 'Instance ID is required' };
      }

      const instance = await updateUnifiedInstance(id, updates);

      if (!instance) {
        return { error: 'Instance not found' };
      }

      logger.info('Unified instance updated', { id, updates: Object.keys(updates) });

      return {
        success: true,
        instance: {
          id: instance.id,
          name: instance.name,
          protocol: instance.protocol,
          chain: instance.chain,
          enabled: instance.enabled,
          updatedAt: instance.updatedAt,
        },
      };
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('Unified API PUT failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
      durationMs,
    });
    throw error;
  }
}

// ============================================================================
// DELETE /api/oracle/unified
// ============================================================================

export async function DELETE(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    return await handleApi(request, async () => {
      const limited = await rateLimit(request, RATE_LIMITS.DELETE);
      if (limited) return limited;

      const url = new URL(request.url);
      const id = url.searchParams.get('id');

      if (!id) {
        return { error: 'Instance ID is required' };
      }

      // 获取实例信息以停止同步
      const instance = await getUnifiedInstance(id);
      if (instance) {
        // 停止同步
        switch (instance.protocol) {
          case 'chainlink':
            stopChainlinkSync(id);
            break;
          // 其他协议类似处理
        }
      }

      // 删除实例
      const deleted = await deleteUnifiedInstance(id);

      if (!deleted) {
        return { error: 'Instance not found' };
      }

      logger.info('Unified instance deleted', { id });

      return {
        success: true,
        message: 'Instance deleted successfully',
      };
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('Unified API DELETE failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
      durationMs,
    });
    throw error;
  }
}

// ============================================================================
// 辅助函数
// ============================================================================

async function getOverview() {
  const stats = await getInstanceStats();

  // 获取最近的价格更新
  const recentPrices = await query(`
    SELECT 
      protocol,
      COUNT(*) as update_count,
      COUNT(DISTINCT symbol) as symbol_count
    FROM unified_price_feeds
    WHERE timestamp > NOW() - INTERVAL '1 hour'
    GROUP BY protocol
    ORDER BY update_count DESC
  `);

  // 获取同步状态概览
  const syncOverview = await query(`
    SELECT
      protocol,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'healthy') as healthy,
      COUNT(*) FILTER (WHERE status = 'error') as error
    FROM unified_sync_state
    GROUP BY protocol
    ORDER BY total DESC
  `);

  // 获取活跃告警
  const activeAlerts = await query(`
    SELECT
      severity,
      COUNT(*) as count
    FROM unified_alerts
    WHERE status = 'open'
    GROUP BY severity
    ORDER BY 
      CASE severity
        WHEN 'critical' THEN 1
        WHEN 'warning' THEN 2
        WHEN 'info' THEN 3
      END
  `);

  return {
    timestamp: new Date().toISOString(),
    instances: stats,
    prices: {
      recentUpdates: recentPrices.rows,
      totalUpdates1h: recentPrices.rows.reduce((sum, row) => sum + parseInt(row.update_count), 0),
    },
    sync: syncOverview.rows,
    alerts: {
      active: activeAlerts.rows,
      totalActive: activeAlerts.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
    },
  };
}

async function listInstances(searchParams: URLSearchParams) {
  const protocol = searchParams.get('protocol') as OracleProtocol | undefined;
  const chain = searchParams.get('chain') as SupportedChain | undefined;
  const enabled = searchParams.get('enabled');

  const filters = {
    ...(protocol && { protocol }),
    ...(chain && { chain }),
    ...(enabled !== null && { enabled: enabled === 'true' }),
  };

  const instances = await listUnifiedInstances(
    Object.keys(filters).length > 0 ? filters : undefined,
  );

  return {
    instances: instances.map((instance) => ({
      id: instance.id,
      name: instance.name,
      protocol: instance.protocol,
      chain: instance.chain,
      enabled: instance.enabled,
      createdAt: instance.createdAt,
      updatedAt: instance.updatedAt,
    })),
    total: instances.length,
    filters,
  };
}

async function getInstance(id: string | null) {
  if (!id) {
    return { error: 'Instance ID is required' };
  }

  const instance = await getUnifiedInstance(id);

  if (!instance) {
    return { error: 'Instance not found' };
  }

  // 获取同步状态
  const syncState = await query(`SELECT * FROM unified_sync_state WHERE instance_id = $1`, [id]);

  // 获取最新数据（根据协议类型）
  let latestData: unknown = null;

  if (instance.protocol === 'chainlink') {
    const prices = await query(
      `SELECT symbol, price, timestamp, is_stale
       FROM unified_price_feeds
       WHERE instance_id = $1
       ORDER BY timestamp DESC
       LIMIT 10`,
      [id],
    );
    latestData = prices.rows;
  } else if (['uma', 'insight'].includes(instance.protocol)) {
    const assertions = await query(
      `SELECT id, identifier, status, proposed_at, disputed
       FROM unified_assertions
       WHERE instance_id = $1
       ORDER BY proposed_at DESC
       LIMIT 10`,
      [id],
    );
    latestData = assertions.rows;
  }

  return {
    instance: {
      id: instance.id,
      name: instance.name,
      protocol: instance.protocol,
      chain: instance.chain,
      enabled: instance.enabled,
      config: {
        rpcUrl: instance.config.rpcUrl,
        startBlock: instance.config.startBlock,
        maxBlockRange: instance.config.maxBlockRange,
        confirmationBlocks: instance.config.confirmationBlocks,
        syncIntervalMs: instance.config.syncIntervalMs,
      },
      createdAt: instance.createdAt,
      updatedAt: instance.updatedAt,
    },
    sync: syncState.rows[0] || null,
    latestData,
  };
}

async function getPrices(searchParams: URLSearchParams) {
  const protocol = searchParams.get('protocol') as OracleProtocol | undefined;
  const chain = searchParams.get('chain') as SupportedChain | undefined;
  const symbol = searchParams.get('symbol');
  const instanceId = searchParams.get('instanceId');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  let sql = `SELECT * FROM unified_price_feeds WHERE 1=1`;
  const params: unknown[] = [];
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

  if (instanceId) {
    sql += ` AND instance_id = $${paramIndex++}`;
    params.push(instanceId);
  }

  // 获取总数
  const countResult = await query(`SELECT COUNT(*) as total FROM (${sql}) as subquery`, params);
  const total = parseInt(countResult.rows[0]?.total || 0);

  // 获取数据
  sql += ` ORDER BY timestamp DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  params.push(limit, offset);

  const result = await query(sql, params);

  return {
    prices: result.rows.map((row) => ({
      id: row.id,
      protocol: row.protocol,
      chain: row.chain,
      symbol: row.symbol,
      baseAsset: row.base_asset,
      quoteAsset: row.quote_asset,
      price: parseFloat(row.price),
      decimals: row.decimals,
      timestamp: row.timestamp,
      isStale: row.is_stale,
      stalenessSeconds: row.staleness_seconds,
    })),
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  };
}

async function getPriceComparison(searchParams: URLSearchParams) {
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return { error: 'Symbol is required for comparison' };
  }

  // 获取所有协议的最新价格
  const prices = await query(
    `SELECT DISTINCT ON (protocol, chain)
      protocol,
      chain,
      price,
      timestamp,
      confidence,
      is_stale
    FROM unified_price_feeds
    WHERE symbol = $1
    ORDER BY protocol, chain, timestamp DESC`,
    [symbol],
  );

  if (prices.rows.length === 0) {
    return {
      symbol,
      available: false,
      message: 'No price data available for this symbol',
    };
  }

  // 计算统计数据
  const priceValues = prices.rows.map((row) => parseFloat(row.price));
  const avgPrice = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
  const sortedPrices = [...priceValues].sort((a, b) => a - b);
  const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];
  const minPrice = Math.min(...priceValues);
  const maxPrice = Math.max(...priceValues);
  const priceRange = maxPrice - minPrice;
  const priceRangePercent = (priceRange / avgPrice) * 100;

  // 找出异常值（偏离平均值超过1%）
  const threshold = avgPrice * 0.01;
  const outliers = prices.rows.filter((row) => {
    const price = parseFloat(row.price);
    return Math.abs(price - avgPrice) > threshold;
  });

  // 推荐价格（使用中位数）
  const recommendedPrice = medianPrice;

  return {
    symbol,
    timestamp: new Date().toISOString(),
    available: true,
    prices: prices.rows.map((row) => ({
      protocol: row.protocol,
      chain: row.chain,
      price: parseFloat(row.price),
      timestamp: row.timestamp,
      confidence: row.confidence,
      isStale: row.is_stale,
    })),
    statistics: {
      count: prices.rows.length,
      avgPrice,
      medianPrice,
      minPrice,
      maxPrice,
      priceRange,
      priceRangePercent,
    },
    outliers: outliers.map((row) => ({
      protocol: row.protocol,
      chain: row.chain,
      price: parseFloat(row.price),
      deviation: parseFloat(row.price) - avgPrice,
      deviationPercent: ((parseFloat(row.price) - avgPrice) / avgPrice) * 100,
    })),
    recommended: {
      price: recommendedPrice,
      source: 'median',
      confidence: prices.rows.length > 2 ? 'high' : 'medium',
    },
  };
}

async function getProtocols() {
  const protocols = await query(`
    SELECT 
      id,
      name,
      description,
      supported_chains,
      features,
      tvl,
      market_share,
      is_active
    FROM oracle_protocols_info
    WHERE is_active = true
    ORDER BY name
  `);

  // 获取每个协议的实例数量
  const instanceCounts = await query(`
    SELECT protocol, COUNT(*) as count
    FROM unified_oracle_instances
    WHERE enabled = true
    GROUP BY protocol
  `);

  const countMap = new Map(instanceCounts.rows.map((row) => [row.protocol, parseInt(row.count)]));

  return {
    protocols: protocols.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      supportedChains: row.supported_chains,
      features: row.features,
      tvl: row.tvl,
      marketShare: row.market_share,
      activeInstances: countMap.get(row.id) || 0,
    })),
    total: protocols.rows.length,
  };
}

async function getChains() {
  const chains = await query(`
    SELECT DISTINCT chain
    FROM unified_oracle_instances
    WHERE enabled = true
    ORDER BY chain
  `);

  // 获取每个链的协议支持情况
  const chainProtocols = await query(`
    SELECT 
      chain,
      protocol,
      COUNT(*) as instance_count
    FROM unified_oracle_instances
    WHERE enabled = true
    GROUP BY chain, protocol
    ORDER BY chain, instance_count DESC
  `);

  const chainMap = new Map<string, Array<{ protocol: string; instances: number }>>();

  for (const row of chainProtocols.rows) {
    if (!chainMap.has(row.chain)) {
      chainMap.set(row.chain, []);
    }
    const chainData = chainMap.get(row.chain);
    if (chainData) {
      chainData.push({
        protocol: row.protocol,
        instances: parseInt(row.instance_count),
      });
    }
  }

  return {
    chains: chains.rows.map((row) => ({
      id: row.chain,
      protocols: chainMap.get(row.chain) || [],
    })),
    total: chains.rows.length,
  };
}

async function getGlobalStats() {
  const instanceStats = await getInstanceStats();

  // 24小时价格更新统计
  const priceStats = await query(`
    SELECT
      protocol,
      COUNT(*) as update_count,
      COUNT(DISTINCT symbol) as symbol_count,
      AVG(price) as avg_price
    FROM unified_price_feeds
    WHERE timestamp > NOW() - INTERVAL '24 hours'
    GROUP BY protocol
    ORDER BY update_count DESC
  `);

  // 同步性能统计
  const syncStats = await query(`
    SELECT
      protocol,
      AVG(last_sync_duration_ms) as avg_duration,
      MAX(last_sync_duration_ms) as max_duration,
      COUNT(*) FILTER (WHERE status = 'healthy') as healthy_count,
      COUNT(*) FILTER (WHERE status = 'error') as error_count
    FROM unified_sync_state
    GROUP BY protocol
  `);

  return {
    instances: instanceStats,
    prices: {
      last24h: priceStats.rows.map((row) => ({
        protocol: row.protocol,
        updates: parseInt(row.update_count),
        symbols: parseInt(row.symbol_count),
        avgPrice: parseFloat(row.avg_price || 0),
      })),
    },
    sync: syncStats.rows.map((row) => ({
      protocol: row.protocol,
      avgDurationMs: parseFloat(row.avg_duration || 0),
      maxDurationMs: parseFloat(row.max_duration || 0),
      healthy: parseInt(row.healthy_count),
      error: parseInt(row.error_count),
    })),
  };
}

async function createInstance(body: Record<string, unknown>) {
  const { name, protocol, chain, config } = body;

  if (!name || !protocol || !chain || !config) {
    return { error: 'Missing required fields: name, protocol, chain, config' };
  }

  try {
    const instance = await createUnifiedInstance({
      name: name as string,
      protocol: protocol as OracleProtocol,
      chain: chain as SupportedChain,
      config: config as { rpcUrl: string },
    });

    logger.info('Unified instance created', {
      id: instance.id,
      protocol: instance.protocol,
      chain: instance.chain,
    });

    return {
      success: true,
      instance: {
        id: instance.id,
        name: instance.name,
        protocol: instance.protocol,
        chain: instance.chain,
        enabled: instance.enabled,
        createdAt: instance.createdAt,
      },
    };
  } catch (error) {
    logger.error('Failed to create unified instance', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      error: 'Failed to create instance',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

async function startSync(instanceId: string, protocol: string) {
  if (!instanceId) {
    return { error: 'Instance ID is required' };
  }

  try {
    switch (protocol) {
      case 'chainlink':
        await startChainlinkSync(instanceId);
        break;
      case 'pyth':
        await startPythSync(instanceId);
        break;
      default:
        return { error: `Sync not implemented for protocol: ${protocol}` };
    }

    logger.info('Sync started', { instanceId, protocol });

    return {
      success: true,
      message: 'Sync started successfully',
      instanceId,
      protocol,
    };
  } catch (error) {
    logger.error('Failed to start sync', {
      instanceId,
      protocol,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      error: 'Failed to start sync',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

async function stopSync(instanceId: string, protocol: string) {
  if (!instanceId) {
    return { error: 'Instance ID is required' };
  }

  try {
    switch (protocol) {
      case 'chainlink':
        stopChainlinkSync(instanceId);
        break;
      case 'pyth':
        stopPythSync(instanceId);
        break;
      default:
        return { error: `Sync stop not implemented for protocol: ${protocol}` };
    }

    logger.info('Sync stopped', { instanceId, protocol });

    return {
      success: true,
      message: 'Sync stopped successfully',
      instanceId,
      protocol,
    };
  } catch (error) {
    logger.error('Failed to stop sync', {
      instanceId,
      protocol,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      error: 'Failed to stop sync',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

async function batchCreateInstances(instances: unknown[]) {
  if (!Array.isArray(instances) || instances.length === 0) {
    return { error: 'Instances array is required' };
  }

  const results = {
    success: [] as Array<Record<string, unknown>>,
    failed: [] as Array<{ instance: unknown; error: string }>,
  };

  for (const instanceData of instances) {
    const data = instanceData as Record<string, unknown>;
    try {
      const instance = await createUnifiedInstance({
        name: data.name as string,
        protocol: data.protocol as OracleProtocol,
        chain: data.chain as SupportedChain,
        config: data.config as { rpcUrl: string },
      });
      results.success.push({
        id: instance.id,
        name: instance.name,
        protocol: instance.protocol,
        chain: instance.chain,
      });
    } catch (error) {
      results.failed.push({
        instance: instanceData,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info('Batch create completed', {
    total: instances.length,
    success: results.success.length,
    failed: results.failed.length,
  });

  return {
    success: results.failed.length === 0,
    results,
  };
}

async function batchUpdateStatus(ids: string[], enabled: boolean) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { error: 'IDs array is required' };
  }

  const results = {
    updated: [] as string[],
    failed: [] as Array<{ id: string; error: string }>,
  };

  for (const id of ids) {
    try {
      const instance = await updateUnifiedInstance(id, { enabled });
      if (instance) {
        results.updated.push(id);
      } else {
        results.failed.push({ id, error: 'Instance not found' });
      }
    } catch (error) {
      results.failed.push({
        id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info('Batch update status completed', {
    total: ids.length,
    updated: results.updated.length,
    failed: results.failed.length,
    enabled,
  });

  return {
    success: results.failed.length === 0,
    results,
  };
}
