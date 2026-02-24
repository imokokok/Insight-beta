export interface HeatmapCell {
  protocol: string;
  symbol: string;
  price: number;
  referencePrice: number;
  deviation: number;
  deviationPercent: number;
  deviationLevel: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  isStale: boolean;
}

export interface HeatmapRow {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  cells: HeatmapCell[];
  maxDeviation: number;
  avgDeviation: number;
  consensusPrice: number;
  consensusMethod: 'median';
}

export interface HeatmapResponse {
  rows: HeatmapRow[];
  protocols: string[];
  lastUpdated: string;
  totalPairs: number;
  criticalDeviations: number;
}

export interface FetchHeatmapOptions {
  symbols?: string;
  protocols?: string;
}

export async function fetchHeatmap(options: FetchHeatmapOptions = {}): Promise<HeatmapResponse> {
  const { symbols: symbolsParam, protocols: protocolsParam } = options;

  const symbols = symbolsParam ? symbolsParam.split(',') : ['ETH/USD', 'BTC/USD', 'LINK/USD'];
  const protocols = protocolsParam ? protocolsParam.split(',') : undefined;

  const { PriceAggregationEngine } = await import('@/features/oracle/services/priceAggregation');
  const priceEngine = new PriceAggregationEngine();

  const comparisons = await priceEngine.aggregateMultipleSymbols(symbols);

  const rows = comparisons.map((comparison) => {
    const cells = comparison.prices.map((price) => {
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

  return {
    rows,
    protocols: protocols || comparisons.flatMap((c) => c.prices.map((p) => p.protocol)),
    lastUpdated: new Date().toISOString(),
    totalPairs: rows.length,
    criticalDeviations,
  };
}
