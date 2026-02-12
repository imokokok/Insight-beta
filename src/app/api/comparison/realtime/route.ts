/**
 * Comparison Realtime API
 *
 * P2 优化：RESTful API 路由
 * GET /api/comparison/realtime
 */

import type { NextRequest } from 'next/server';

import { logger } from '@/shared/logger';
import { apiSuccess, withErrorHandler, getQueryParam } from '@/shared/utils';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const requestStartTime = performance.now();

  const symbolsParam = getQueryParam(request, 'symbols');
  const protocolsParam = getQueryParam(request, 'protocols');

  const symbols = symbolsParam
    ? symbolsParam.split(',')
    : ['ETH/USD', 'BTC/USD', 'LINK/USD', 'MATIC/USD', 'AVAX/USD', 'SOL/USD'];
  const protocols = protocolsParam ? protocolsParam.split(',') : undefined;

  // 动态导入 PriceAggregationEngine 以避免构建时执行
  const { PriceAggregationEngine } = await import('@/services/oracle/priceAggregation');
  const priceEngine = new PriceAggregationEngine();

  // 并行获取所有交易对的聚合数据
  const comparisons = await priceEngine.aggregateMultipleSymbols(symbols);

  // 构建实时对比数据
  const response = comparisons.map((comparison) => {
    const protocolData = comparison.prices.map((price) => {
      // 使用小数形式存储偏差 (0.01 = 1%)
      const deviationFromConsensus =
        (price.price - comparison.medianPrice) / comparison.medianPrice;

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
    // 检查 prices 数组是否为空
    if (prices.length === 0) {
      return {
        symbol: comparison.symbol,
        protocols: [],
        consensus: {
          median: comparison.recommendedPrice,
          mean: comparison.recommendedPrice,
          weighted: comparison.recommendedPrice,
        },
        spread: {
          min: comparison.recommendedPrice,
          max: comparison.recommendedPrice,
          absolute: 0,
          percent: 0,
        },
        lastUpdated: comparison.timestamp,
      };
    }

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
        // 价差百分比，小数形式 (0.01 = 1%)
        percent: (max - min) / median,
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

  return apiSuccess({
    data: response,
    meta: {
      timestamp: new Date().toISOString(),
      requestTimeMs: Math.round(requestTime),
    },
  });
});
