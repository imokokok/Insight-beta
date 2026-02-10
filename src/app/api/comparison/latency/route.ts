/**
 * Comparison Latency API
 *
 * P2 优化：RESTful API 路由
 * GET /api/comparison/latency
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { query } from '@/server/db';

interface LatencyRow {
  protocol: string;
  symbol: string;
  chain: string;
  latency_ms: string;
  timestamp: string;
  block_number: number;
  is_stale: boolean;
}

export async function GET(request: NextRequest) {
  const requestStartTime = performance.now();

  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get('symbols');
    const protocolsParam = searchParams.get('protocols');

    const symbols = symbolsParam ? symbolsParam.split(',') : ['ETH/USD', 'BTC/USD', 'LINK/USD'];
    const protocols = protocolsParam ? protocolsParam.split(',') : undefined;

    // 查询延迟数据
    const sql = `
      SELECT
        protocol,
        symbol,
        chain,
        EXTRACT(EPOCH FROM (NOW() - timestamp)) * 1000 as latency_ms,
        timestamp,
        block_number,
        is_stale
      FROM unified_price_feeds
      WHERE symbol = ANY($1)
        ${protocols ? 'AND protocol = ANY($2)' : ''}
        AND timestamp > NOW() - INTERVAL '1 hour'
      ORDER BY timestamp DESC
    `;

    const params: (string[] | string)[] = [symbols];
    if (protocols) {
      params.push(protocols);
    }

    const result = await query(sql, params);

    // 按协议和交易对分组计算统计信息
    const metricsMap = new Map<string, LatencyRow[]>();

    for (const row of result.rows) {
      const key = `${row.protocol}:${row.symbol}`;
      if (!metricsMap.has(key)) {
        metricsMap.set(key, []);
      }
      metricsMap.get(key)!.push(row as LatencyRow);
    }

    const metrics = Array.from(metricsMap.entries()).map(([key, rows]) => {
      const [protocol, symbol] = key.split(':');
      const firstRow = rows[0];
      if (!firstRow) {
        throw new Error(`No data for ${key}`);
      }
      const latencies = rows.map((r) => parseFloat(r.latency_ms));
      const sortedLatencies = [...latencies].sort((a, b) => a - b);

      const p50Index = Math.floor(sortedLatencies.length * 0.5);
      const p90Index = Math.floor(sortedLatencies.length * 0.9);
      const p99Index = Math.floor(sortedLatencies.length * 0.99);

      const maxLatency = Math.max(...latencies);

      let status: 'healthy' | 'degraded' | 'stale' = 'healthy';
      if (maxLatency > 600000) status = 'stale';
      else if (maxLatency > 300000) status = 'degraded';

      return {
        protocol,
        symbol,
        chain: firstRow.chain,
        lastUpdateTimestamp: firstRow.timestamp,
        latencyMs: latencies[0] ?? 0,
        latencySeconds: (latencies[0] ?? 0) / 1000,
        blockLag: 0,
        updateFrequency: 300,
        expectedFrequency: 300,
        frequencyDeviation: 0,
        percentile50: sortedLatencies[p50Index] ?? latencies[0] ?? 0,
        percentile90: sortedLatencies[p90Index] ?? latencies[0] ?? 0,
        percentile99: sortedLatencies[p99Index] ?? latencies[0] ?? 0,
        status,
      };
    });

    const allLatencies = metrics.map((m) => m.latencyMs);
    const staleCount = metrics.filter((m) => m.status === 'stale').length;
    const degradedCount = metrics.filter((m) => m.status === 'degraded').length;

    const response = {
      metrics,
      summary: {
        avgLatency:
          allLatencies.length > 0
            ? allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length
            : 0,
        maxLatency: allLatencies.length > 0 ? Math.max(...allLatencies) : 0,
        minLatency: allLatencies.length > 0 ? Math.min(...allLatencies) : 0,
        totalFeeds: metrics.length,
        staleFeeds: staleCount,
        degradedFeeds: degradedCount,
        healthyFeeds: metrics.length - staleCount - degradedCount,
      },
      lastUpdated: new Date().toISOString(),
    };

    const requestTime = performance.now() - requestStartTime;
    logger.info('Latency API request completed', {
      performance: { totalRequestTimeMs: Math.round(requestTime) },
      requestParams: { symbols, protocols },
      responseStats: { totalFeeds: metrics.length },
    });

    return NextResponse.json({
      ok: true,
      data: response,
      meta: {
        timestamp: new Date().toISOString(),
        requestTimeMs: Math.round(requestTime),
      },
    });
  } catch (error) {
    const requestTime = performance.now() - requestStartTime;
    logger.error('Latency API request failed', {
      error,
      performance: { totalRequestTimeMs: Math.round(requestTime) },
    });

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to fetch latency data',
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 },
    );
  }
}
