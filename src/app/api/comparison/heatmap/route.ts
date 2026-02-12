/**
 * Comparison Heatmap API
 *
 * P2 优化：RESTful API 路由
 * GET /api/comparison/heatmap
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { logger } from '@/shared/logger';

export async function GET(request: NextRequest) {
  const requestStartTime = performance.now();

  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get('symbols');
    const protocolsParam = searchParams.get('protocols');

    const symbols = symbolsParam ? symbolsParam.split(',') : ['ETH/USD', 'BTC/USD', 'LINK/USD'];
    const protocols = protocolsParam ? protocolsParam.split(',') : undefined;

    // 动态导入 PriceAggregationEngine 以避免构建时执行
    const { PriceAggregationEngine } = await import('@/server/oracle/priceAggregation');
    const priceEngine = new PriceAggregationEngine();

    // 并行获取所有交易对的聚合数据
    const comparisons = await priceEngine.aggregateMultipleSymbols(symbols);

    // 构建热力图数据
    const rows = comparisons.map((comparison) => {
      const cells = comparison.prices.map((price) => {
        // 使用小数形式存储偏差 (0.01 = 1%)
        const deviationPercent = (price.price - comparison.medianPrice) / comparison.medianPrice;

        let deviationLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
        const absDeviation = Math.abs(deviationPercent);
        if (absDeviation > 0.02) deviationLevel = 'critical';
        else if (absDeviation > 0.01) deviationLevel = 'high';
        else if (absDeviation > 0.005) deviationLevel = 'medium';

        return {
          protocol: price.protocol,
          symbol: comparison.symbol,
          price: price.price,
          referencePrice: comparison.medianPrice,
          deviation: price.price - comparison.medianPrice,
          deviationPercent,
          deviationLevel,
          timestamp: new Date(price.timestamp).toISOString(),
          isStale: price.isStale ?? false,
        };
      });

      // 过滤协议
      const filteredCells = protocols ? cells.filter((c) => protocols.includes(c.protocol)) : cells;

      const deviations = filteredCells.map((c) => Math.abs(c.deviationPercent));

      return {
        symbol: comparison.symbol,
        baseAsset: comparison.baseAsset,
        quoteAsset: comparison.quoteAsset,
        cells: filteredCells,
        maxDeviation: Math.max(...deviations, 0),
        avgDeviation:
          deviations.length > 0 ? deviations.reduce((a, b) => a + b, 0) / deviations.length : 0,
        consensusPrice: comparison.medianPrice,
        consensusMethod: 'median' as const,
      };
    });

    const criticalDeviations = rows.reduce(
      (sum, row) => sum + row.cells.filter((c) => c.deviationLevel === 'critical').length,
      0,
    );

    const response = {
      rows,
      protocols: protocols || comparisons.flatMap((c) => c.prices.map((p) => p.protocol)),
      lastUpdated: new Date().toISOString(),
      totalPairs: rows.length,
      criticalDeviations,
    };

    const requestTime = performance.now() - requestStartTime;
    logger.info('Heatmap API request completed', {
      performance: { totalRequestTimeMs: Math.round(requestTime) },
      requestParams: { symbols, protocols },
      responseStats: { totalPairs: rows.length, criticalDeviations },
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
    logger.error('Heatmap API request failed', {
      error,
      performance: { totalRequestTimeMs: Math.round(requestTime) },
    });

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to fetch heatmap data',
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 },
    );
  }
}
