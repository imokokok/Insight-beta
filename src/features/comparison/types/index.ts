export interface PriceComparison {
  protocol: string;
  price: number;
  timestamp: string;
  deviation: number;
}

export interface ComparisonConfig {
  symbol: string;
  timeRange: string;
  protocols: string[];
}
