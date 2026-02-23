export interface KPI {
  id: string;
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down';
}
