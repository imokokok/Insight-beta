/**
 * Chainlink API Routes
 *
 * Chainlink 预言机 API 路由
 * 支持价格查询、实例管理等功能
 */

import type { NextRequest } from 'next/server';

import { logger } from '@/lib/logger';
import type { SupportedChain, UnifiedOracleConfig } from '@/lib/types/unifiedOracleTypes';
import { handleApi, rateLimit } from '@/server/apiResponse';
import { query } from '@/server/db';
import { startChainlinkSync, stopChainlinkSync } from '@/server/oracle/sync/ChainlinkSync';
import {
  createUnifiedInstance,
  listUnifiedInstances,
  getUnifiedInstance,
  updateUnifiedInstance,
  deleteUnifiedInstance,
} from '@/server/oracle/unifiedConfig';

const RATE_LIMITS = {
  GET: { key: 'chainlink_get', limit: 60, windowMs: 60_000 },
  POST: { key: 'chainlink_post', limit: 10, windowMs: 60_000 },
  PUT: { key: 'chainlink_put', limit: 10, windowMs: 60_000 },
  DELETE: { key: 'chainlink_delete', limit: 5, windowMs: 60_000 },
} as const;

// ============================================================================
// GET /api/oracle/chainlink
// ============================================================================

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    return await handleApi(request, async () => {
      const limited = await rateLimit(request, RATE_LIMITS.GET);
      if (limited) return limited;

      const url = new URL(request.url);
      const action = url.searchParams.get('action');

      switch (action) {
        case 'list':
          return await listInstances();
        case 'get':
          return await getInstance(url.searchParams.get('id'));
        case 'prices':
          return await getPrices(url.searchParams);
        case 'stats':
          return await getStats();
        default:
          return await getOverview();
      }
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('Chainlink API GET failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
      durationMs,
    });
    throw error;
  }
}

// ============================================================================
// POST /api/oracle/chainlink
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
          return await startSync(body.instanceId);
        case 'stop':
          return await stopSync(body.instanceId);
        default:
          return { error: 'Unknown action' };
      }
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('Chainlink API POST failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
      durationMs,
    });
    throw error;
  }
}

// ============================================================================
// PUT /api/oracle/chainlink
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

      logger.info('Chainlink instance updated', { id, updates: Object.keys(updates) });

      return {
        success: true,
        instance: {
          id: instance.id,
          name: instance.name,
          chain: instance.chain,
          enabled: instance.enabled,
          updatedAt: instance.updatedAt,
        },
      };
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('Chainlink API PUT failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
      durationMs,
    });
    throw error;
  }
}

// ============================================================================
// DELETE /api/oracle/chainlink
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

      // 先停止同步
      stopChainlinkSync(id);

      // 删除实例
      const deleted = await deleteUnifiedInstance(id);

      if (!deleted) {
        return { error: 'Instance not found' };
      }

      logger.info('Chainlink instance deleted', { id });

      return {
        success: true,
        message: 'Instance deleted successfully',
      };
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('Chainlink API DELETE failed', {
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
  const instances = await listUnifiedInstances({ protocol: 'chainlink' });

  // 获取价格统计
  const priceStats = await query(`
    SELECT
      COUNT(*) as total_feeds,
      COUNT(DISTINCT symbol) as unique_symbols,
      COUNT(*) FILTER (WHERE is_stale = true) as stale_feeds
    FROM unified_price_feeds
    WHERE protocol = 'chainlink'
    AND timestamp > NOW() - INTERVAL '1 hour'
  `);

  // 获取同步状态统计
  const syncStats = await query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'healthy') as healthy,
      COUNT(*) FILTER (WHERE status = 'error') as error
    FROM unified_sync_state
    WHERE protocol = 'chainlink'
  `);

  return {
    protocol: 'chainlink',
    timestamp: new Date().toISOString(),
    instances: {
      total: instances.length,
      enabled: instances.filter((i) => i.enabled).length,
      chains: [...new Set(instances.map((i) => i.chain))],
    },
    prices: {
      totalFeeds: parseInt(priceStats.rows[0]?.total_feeds || 0),
      uniqueSymbols: parseInt(priceStats.rows[0]?.unique_symbols || 0),
      staleFeeds: parseInt(priceStats.rows[0]?.stale_feeds || 0),
    },
    sync: {
      total: parseInt(syncStats.rows[0]?.total || 0),
      healthy: parseInt(syncStats.rows[0]?.healthy || 0),
      error: parseInt(syncStats.rows[0]?.error || 0),
    },
  };
}

async function listInstances() {
  const instances = await listUnifiedInstances({ protocol: 'chainlink' });

  return {
    instances: instances.map((instance) => ({
      id: instance.id,
      name: instance.name,
      chain: instance.chain,
      enabled: instance.enabled,
      createdAt: instance.createdAt,
      updatedAt: instance.updatedAt,
    })),
    total: instances.length,
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

  // 获取最新价格
  const latestPrices = await query(
    `SELECT symbol, price, timestamp, is_stale
     FROM unified_price_feeds
     WHERE instance_id = $1
     ORDER BY timestamp DESC
     LIMIT 10`,
    [id],
  );

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
    latestPrices: latestPrices.rows,
  };
}

async function getPrices(searchParams: URLSearchParams) {
  const instanceId = searchParams.get('instanceId');
  const symbol = searchParams.get('symbol');
  const chain = searchParams.get('chain') as SupportedChain | null;
  const limit = parseInt(searchParams.get('limit') || '10');
  const offset = parseInt(searchParams.get('offset') || '0');

  let sql = `
    SELECT * FROM unified_price_feeds
    WHERE protocol = 'chainlink'
  `;
  const params: (string | number | boolean | Date | null | undefined | string[] | number[])[] = [];
  let paramIndex = 1;

  if (instanceId) {
    sql += ` AND instance_id = $${paramIndex++}`;
    params.push(instanceId);
  }

  if (symbol) {
    sql += ` AND symbol = $${paramIndex++}`;
    params.push(symbol);
  }

  if (chain) {
    sql += ` AND chain = $${paramIndex++}`;
    params.push(chain);
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
      symbol: row.symbol,
      baseAsset: row.base_asset,
      quoteAsset: row.quote_asset,
      price: parseFloat(row.price),
      decimals: row.decimals,
      timestamp: row.timestamp,
      blockNumber: row.block_number,
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

async function getStats() {
  // 按链统计
  const chainStats = await query(`
    SELECT
      chain,
      COUNT(*) as instance_count,
      COUNT(*) FILTER (WHERE enabled = true) as enabled_count
    FROM unified_oracle_instances
    WHERE protocol = 'chainlink'
    GROUP BY chain
    ORDER BY instance_count DESC
  `);

  // 价格统计
  const priceStats = await query(`
    SELECT
      symbol,
      COUNT(*) as update_count,
      AVG(price) as avg_price,
      MIN(price) as min_price,
      MAX(price) as max_price,
      MAX(timestamp) as last_update
    FROM unified_price_feeds
    WHERE protocol = 'chainlink'
    AND timestamp > NOW() - INTERVAL '24 hours'
    GROUP BY symbol
    ORDER BY update_count DESC
    LIMIT 20
  `);

  // 同步性能统计
  const syncStats = await query(`
    SELECT
      AVG(last_sync_duration_ms) as avg_sync_duration,
      MAX(last_sync_duration_ms) as max_sync_duration,
      COUNT(*) FILTER (WHERE status = 'healthy') as healthy_count,
      COUNT(*) FILTER (WHERE status = 'error') as error_count
    FROM unified_sync_state
    WHERE protocol = 'chainlink'
  `);

  return {
    chains: chainStats.rows,
    prices: priceStats.rows.map((row) => ({
      symbol: row.symbol,
      updateCount: parseInt(row.update_count),
      avgPrice: parseFloat(row.avg_price),
      minPrice: parseFloat(row.min_price),
      maxPrice: parseFloat(row.max_price),
      lastUpdate: row.last_update,
    })),
    sync: {
      avgSyncDuration: parseFloat(syncStats.rows[0]?.avg_sync_duration || 0),
      maxSyncDuration: parseFloat(syncStats.rows[0]?.max_sync_duration || 0),
      healthyCount: parseInt(syncStats.rows[0]?.healthy_count || 0),
      errorCount: parseInt(syncStats.rows[0]?.error_count || 0),
    },
  };
}

async function createInstance(body: Record<string, unknown>) {
  const { name, chain, config } = body;

  if (!name || !chain || !config) {
    return { error: 'Missing required fields: name, chain, config' };
  }

  try {
    const instance = await createUnifiedInstance({
      name: name as string,
      protocol: 'chainlink',
      chain: chain as SupportedChain,
      config: { ...config, chain: chain as SupportedChain } as UnifiedOracleConfig,
    });

    logger.info('Chainlink instance created', {
      id: instance.id,
      name: instance.name,
      chain: instance.chain,
    });

    return {
      success: true,
      instance: {
        id: instance.id,
        name: instance.name,
        chain: instance.chain,
        enabled: instance.enabled,
        createdAt: instance.createdAt,
      },
    };
  } catch (error) {
    logger.error('Failed to create Chainlink instance', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      error: 'Failed to create instance',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

async function startSync(instanceId: string) {
  if (!instanceId) {
    return { error: 'Instance ID is required' };
  }

  try {
    await startChainlinkSync(instanceId);

    logger.info('Chainlink sync started', { instanceId });

    return {
      success: true,
      message: 'Sync started successfully',
      instanceId,
    };
  } catch (error) {
    logger.error('Failed to start Chainlink sync', {
      instanceId,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      error: 'Failed to start sync',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

async function stopSync(instanceId: string) {
  if (!instanceId) {
    return { error: 'Instance ID is required' };
  }

  try {
    stopChainlinkSync(instanceId);

    logger.info('Chainlink sync stopped', { instanceId });

    return {
      success: true,
      message: 'Sync stopped successfully',
      instanceId,
    };
  } catch (error) {
    logger.error('Failed to stop Chainlink sync', {
      instanceId,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      error: 'Failed to stop sync',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}
