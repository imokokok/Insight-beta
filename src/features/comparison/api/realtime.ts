export interface ProtocolPriceData {
  protocol: string;
  price: number;
  timestamp: string;
  confidence: number;
  latency: number;
  deviationFromConsensus: number;
  status: 'stale' | 'active';
}

export interface RealtimeSymbolData {
  symbol: string;
  protocols: ProtocolPriceData[];
  consensus: {
    median: number;
    mean: number;
    weighted: number;
  };
  spread: {
    min: number;
    max: number;
    absolute: number;
    percent: number;
  };
  lastUpdated: string;
}

export interface FetchRealtimeOptions {
  symbols?: string;
  protocols?: string;
}

import { calculateMedian } from '@/shared/utils/math';

export async function fetchRealtime(
  options: FetchRealtimeOptions = {},
): Promise<RealtimeSymbolData[]> {
  const { symbols: symbolsParam, protocols: protocolsParam } = options;

  const symbols = symbolsParam
    ? symbolsParam.split(',')
    : ['ETH/USD', 'BTC/USD', 'LINK/USD', 'MATIC/USD', 'AVAX/USD', 'SOL/USD'];
  const protocols = protocolsParam ? protocolsParam.split(',') : undefined;

  const { PriceAggregationEngine } = await import('@/features/oracle/services/priceAggregation');
  const priceEngine = new PriceAggregationEngine();

  const comparisons = await priceEngine.aggregateMultipleSymbols(symbols);

  return comparisons.map((comparison) => {
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
    const median = calculateMedian(prices);

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
        percent: median !== 0 ? (max - min) / median : 0,
      },
      lastUpdated: comparison.timestamp,
    };
  });
}
