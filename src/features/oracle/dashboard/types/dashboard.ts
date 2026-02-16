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

export interface AreaChartConfig {
  data: ChartDataPoint[];
  dataKey: string;
  color: string;
  valueFormatter?: (value: number) => string;
  labelFormatter?: (label: string | number) => string;
}

export interface LineChartConfig {
  data: ChartDataPoint[];
  lines: Array<{
    dataKey: string;
    name: string;
    color: string;
  }>;
  valueFormatter?: (value: number) => string;
}

export interface BarChartConfig {
  data: ComparisonDataPoint[];
  bars: Array<{
    dataKey: string;
    name: string;
    color: string;
  }>;
  valueFormatter?: (value: number) => string;
}
