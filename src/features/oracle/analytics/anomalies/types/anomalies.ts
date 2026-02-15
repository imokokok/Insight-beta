export interface AnomalyData {
  id: string;
  timestamp: string;
  symbol: string;
  protocols: string[];
  prices: Record<string, number>;
  avgPrice: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  outlierProtocols: string[];
}

export interface AnomalyTrend {
  symbol: string;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  anomalyCount: number;
  avgDeviation: number;
  maxDeviation: number;
}

export interface AnomalyReport {
  generatedAt: string;
  period: { start: string; end: string };
  summary: {
    totalAnomalies: number;
    highSeverityCount: number;
    avgDeviation: number;
    mostAffectedSymbol: string;
  };
  anomalies: AnomalyData[];
  trends: AnomalyTrend[];
}
