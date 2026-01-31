/**
 * Unified Oracle API Routes
 *
 * 通用预言机平台 API
 * - 价格对比
 * - 协议统计
 * - 告警管理
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { aggregatePrices, getHistoricalComparisons } from '@/server/oracle/priceAggregationService';
import { query } from '@/server/db';
import type { SupportedChain } from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// GET /api/oracle/unified/comparison
// 获取价格对比数据
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const chain = searchParams.get('chain') as SupportedChain | null;
    const type = searchParams.get('type') || 'comparison';

    switch (type) {
      case 'comparison':
        if (!symbol) {
          return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 });
        }
        return await getComparison(symbol, chain);

      case 'history': {
        if (!symbol) {
          return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 });
        }
        const hours = parseInt(searchParams.get('hours') || '24', 10);
        return await getHistory(symbol, hours);
      }

      case 'stats':
        return await getStats();

      case 'protocols':
        return await getProtocols();

      case 'alerts': {
        const status = searchParams.get('status') || 'open';
        return await getAlerts(status);
      }

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Unified API error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// POST /api/oracle/unified/comparison
// 触发价格聚合
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols, chain } = body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ error: 'Symbols array is required' }, { status: 400 });
    }

    const results = [];
    for (const symbol of symbols) {
      const comparison = await aggregatePrices(symbol, chain);
      if (comparison) {
        results.push(comparison);
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        requested: symbols.length,
        returned: results.length,
      },
    });
  } catch (error) {
    logger.error('Failed to aggregate prices', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to aggregate prices' }, { status: 500 });
  }
}

// ============================================================================
// 辅助函数
// ============================================================================

async function getComparison(symbol: string, chain?: SupportedChain | null) {
  const comparison = await aggregatePrices(symbol, chain || undefined);

  if (!comparison) {
    return NextResponse.json({ error: 'No comparison data available' }, { status: 404 });
  }

  return NextResponse.json(comparison);
}

async function getHistory(symbol: string, hours: number) {
  const history = await getHistoricalComparisons(symbol, hours);
  return NextResponse.json(history);
}

async function getStats() {
  try {
    // 获取协议数量
    const protocolsResult = await query(
      `SELECT COUNT(DISTINCT protocol) as count FROM unified_oracle_instances WHERE enabled = true`,
    );

    // 获取价格喂价数量
    const feedsResult = await query(
      `SELECT COUNT(*) as count FROM unified_price_feeds 
       WHERE timestamp > NOW() - INTERVAL '5 minutes'`,
    );

    // 获取活跃告警数量
    const alertsResult = await query(
      `SELECT COUNT(*) as count FROM unified_alerts WHERE status = 'open'`,
    );

    // 计算平均偏差
    const deviationResult = await query(
      `SELECT AVG(max_deviation_percent) as avg_deviation 
       FROM cross_oracle_comparisons 
       WHERE timestamp > NOW() - INTERVAL '1 hour'`,
    );

    const stats = {
      totalProtocols: parseInt(protocolsResult.rows[0]?.count || '0', 10),
      totalFeeds: parseInt(feedsResult.rows[0]?.count || '0', 10),
      activeAlerts: parseInt(alertsResult.rows[0]?.count || '0', 10),
      avgDeviation: parseFloat(deviationResult.rows[0]?.avg_deviation || '0'),
    };

    return NextResponse.json(stats);
  } catch (error) {
    logger.error('Failed to get stats', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 });
  }
}

async function getProtocols() {
  try {
    const result = await query(
      `SELECT 
        p.id as protocol,
        p.name,
        p.supported_chains as "supportedChains",
        COUNT(DISTINCT i.id) as "totalFeeds",
        AVG(CASE 
          WHEN s.status = 'healthy' THEN 100 
          WHEN s.status = 'lagging' THEN 80 
          WHEN s.status = 'error' THEN 0 
          ELSE 50 
        END) as uptime,
        AVG(s.avg_sync_duration_ms) as "avgLatency",
        CASE 
          WHEN COUNT(CASE WHEN s.status = 'error' THEN 1 END) > 0 THEN 'down'
          WHEN COUNT(CASE WHEN s.status = 'lagging' THEN 1 END) > 0 THEN 'degraded'
          ELSE 'healthy'
        END as status
      FROM oracle_protocols_info p
      LEFT JOIN unified_oracle_instances i ON p.id = i.protocol AND i.enabled = true
      LEFT JOIN unified_sync_state s ON i.id = s.instance_id
      WHERE p.is_active = true
      GROUP BY p.id, p.name, p.supported_chains`,
    );

    const protocols = result.rows.map((row) => ({
      protocol: row.protocol,
      name: row.name,
      supportedChains: row.supportedChains || [],
      totalFeeds: parseInt(row.totalFeeds || '0', 10),
      uptime: parseFloat(row.uptime || '99.9'),
      avgLatency: parseInt(row.avgLatency || '100', 10),
      status: row.status,
    }));

    return NextResponse.json(protocols);
  } catch (error) {
    logger.error('Failed to get protocols', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to get protocols' }, { status: 500 });
  }
}

async function getAlerts(status: string) {
  try {
    const result = await query(
      `SELECT 
        id,
        event,
        severity,
        title,
        message,
        protocol,
        chain,
        symbol,
        context,
        status,
        occurrences,
        first_seen_at as "firstSeenAt",
        last_seen_at as "lastSeenAt",
        created_at as "createdAt"
      FROM unified_alerts
      WHERE status = $1
      ORDER BY created_at DESC
      LIMIT 100`,
      [status],
    );

    const alerts = result.rows.map((row) => ({
      id: row.id,
      event: row.event,
      severity: row.severity,
      title: row.title,
      message: row.message,
      protocol: row.protocol,
      chain: row.chain,
      symbol: row.symbol,
      context: row.context,
      status: row.status,
      occurrences: row.occurrences,
      firstSeenAt: row.firstSeenAt,
      lastSeenAt: row.lastSeenAt,
      createdAt: row.createdAt,
    }));

    return NextResponse.json(alerts);
  } catch (error) {
    logger.error('Failed to get alerts', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to get alerts' }, { status: 500 });
  }
}
