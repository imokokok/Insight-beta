export type KpiTrendDirection = 'up' | 'down' | 'neutral';

export type KpiStatus = 'success' | 'warning' | 'error' | 'neutral';

export interface KpiCardData {
  value: string | number;
  label: string;
  trend?: KpiTrendDirection;
  changePercent?: number;
  status?: KpiStatus;
  trendData?: number[];
  showTrend?: boolean;
}

export const DEFAULT_KPI_DATA: KpiCardData = {
  value: '-',
  label: '',
  trend: 'neutral',
  status: 'neutral',
};

export const TREND_COLORS: Record<KpiTrendDirection, string> = {
  up: 'text-success',
  down: 'text-error',
  neutral: 'text-muted-foreground',
};

export const STATUS_COLORS: Record<KpiStatus, { text: string; bg: string; border: string }> = {
  success: {
    text: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/20',
  },
  warning: {
    text: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/20',
  },
  error: {
    text: 'text-error',
    bg: 'bg-error/10',
    border: 'border-error/20',
  },
  neutral: {
    text: 'text-muted-foreground',
    bg: 'bg-muted/10',
    border: 'border-border/20',
  },
};
