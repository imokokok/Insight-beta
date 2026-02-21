export interface PriceComparison {
  protocol: string;
  price: number;
  timestamp: string;
  deviation: number;
}

export interface ComparisonQueryParams {
  symbol: string;
  timeRange: string;
  protocols: string[];
}

export type ComparisonConfig = ComparisonQueryParams;
