export interface PriceDeviationPoint {
  timestamp: string;
  symbol: string;
  protocols: string[];
  prices: Record<string, number>;
  avgPrice: number;
  medianPrice: number;
  maxDeviation: number;
  maxDeviationPercent: number;
  outlierProtocols: string[];
}

export interface DeviationTrend {
  symbol: string;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  trendStrength: number;
  avgDeviation: number;
  maxDeviation: number;
  volatility: number;
  anomalyScore: number;
  recommendation: string;
}

export interface DeviationReport {
  generatedAt: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalSymbols: number;
    symbolsWithHighDeviation: number;
    avgDeviationAcrossAll: number;
    mostVolatileSymbol: string;
  };
  trends: DeviationTrend[];
  anomalies: PriceDeviationPoint[];
}
