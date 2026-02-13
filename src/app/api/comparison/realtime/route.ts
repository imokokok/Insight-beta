/**
 * Comparison Realtime API
 *
 * P2 优化：RESTful API 路由
 * GET /api/comparison/realtime
 */

import type { NextRequest } from 'next/server';

import { withMiddleware, DEFAULT_RATE_LIMIT } from '@/lib/api/middleware';
import { logger } from '@/shared/logger';
import { apiSuccess, getQueryParam } from '@/shared/utils';

async function handleGet(request: NextRequest) {
  const requestStartTime = performance.now();

  const symbolsParam = getQueryParam(request, 'symbols');
  const protocolsParam = getQueryParam(request, 'protocols');

  const symbols = symbolsParam
    ? symbolsParam.split(',')
    : ['ETH/USD', 'BTC/USD', 'LINK/USD', 'MATIC/USD', 'AVAX/USD', 'SOL/USD'];
  const protocols = protocolsParam ? protocolsParam.split(',') : undefined;

  const { PriceAggregationEngine } = await import('@/services/oracle/priceAggregation');
  const priceEngine = new PriceAggregationEngine();

  const comparisons = await priceEngine.aggregateMultipleSymbols(symbols);

  const response = comparisons.map((comparison) => {
    const protocolData = comparison.prices.map((price) => {
      const deviationFromConsensus =
        (price.price - comparison.medianPrice) / comparison.medianPrice;

      return {
        protocol: price.protocol,
        price: price.price,
        timestamp: new Date(price.timestamp).toISOString(),
        confidence: price.confidence,
        latency: 0,
        deviationFromConsensus,
        status: price.isStale ? ('stale' as const) : ('active' as const),
      };
    });

    const filteredData = protocols
      ? protocolData.filter((p) => protocols.includes(p.protocol))
      : protocolData;

    const prices = filteredData.map((p) => p.price);
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
}

export const GET = withMiddleware({
  rateLimit: DEFAULT_RATE_LIMIT,
  validate: { allowedMethods: ['GET'] },
})(handleGet);
