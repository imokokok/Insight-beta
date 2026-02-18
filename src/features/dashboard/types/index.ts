export interface DashboardStats {
  totalProtocols: number;
  activeFeeds: number;
  avgDeviation: number;
  lastUpdated: string;
}

export interface KPI {
  id: string;
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down';
}
