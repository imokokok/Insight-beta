export interface DashboardStats {
  totalProtocols: number;
  totalPriceFeeds: number;
  activeAlerts: number;
  avgLatency: number;
  totalValueSecured: string;
  priceUpdates24h: number;
  networkUptime?: number;
  staleFeeds?: number;
  activeNodes?: number;
}

export interface ChartDataPoint {
  timestamp: string;
  value: number;
  label: string;
  [key: string]: unknown;
}

export interface ComparisonDataPoint {
  label: string;
  latency: number;
  accuracy: number;
  uptime: number;
  [key: string]: unknown;
}
