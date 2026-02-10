/**
 * Comparison Realtime API
 *
 * P2 优化：RESTful API 路由
 * GET /api/comparison/realtime
 */

import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { PriceAggregationEngine } from '@/server/oracle/priceAggregation';

const priceEngine = new PriceAggregationEngine();

export async function GET(request: NextRequest) {
  const requestStartTime = performance.now();

  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get('symbols');
    const protocolsParam = searchParams.get('protocols');

    const symbols = symbolsParam
      ? symbolsParam.split(',')
      : ['ETH/USD', 'BTC/USD', 'LINK/USD', 'MATIC/USD', 'AVAX/USD', 'SOL/USD'];
    const protocols = protocolsParam ? protocolsParam.split(',') : undefined;

    // 并行获取所有交易对的聚合数据
    const comparisons = await priceEngine.aggregateMultipleSymbols(symbols);

    // 构建实时对比数据
    const response = comparisons.map((comparison) => {
      const protocolData = comparison.prices.map((price) => {
        const deviationFromConsensus =
          ((price.price - comparison.medianPrice) / comparison.medianPrice) * 100;

        return {
          protocol: price.protocol,
          price: price.price,
          timestamp: new Date(price.timestamp).toISOString(),
          confidence: price.confidence,
          latency: 0, // 可以从同步状态表获取
          deviationFromConsensus,
          status: price.isStale ? ('stale' as const) : ('active' as const),
        };
      });

      // 过滤协议
      const filteredData = protocols
        ? protocolData.filter((p) => protocols.includes(p.protocol))
        : protocolData;

      const prices = filteredData.map((p) => p.price);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
      const sortedPrices = [...prices].sort((a, b) => a - b);
      const median = sortedPrices[Math.floor(sortedPrices.length / 2)] ?? mean;

      return {
        symbol: comparison.symbol,
        protocols: filteredData,
        consensus: {
          median,
          mean,
          weighted: comparison.recommendedPrice,
        },
        spread: {
          min,
          max,
          absolute: max - min,
          percent: ((max - min) / median) * 100,
        },
        lastUpdated: comparison.timestamp,
      };
    });

    const requestTime = performance.now() - requestStartTime;
    logger.info('Realtime API request completed', {
      performance: { totalRequestTimeMs: Math.round(requestTime) },
      requestParams: { symbols, protocols },
      responseStats: { totalPairs: response.length },
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
    logger.error('Realtime API request failed', {
      error,
      performance: { totalRequestTimeMs: Math.round(requestTime) },
    });

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to fetch realtime data',
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 },
    );
  }
}
