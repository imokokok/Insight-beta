import React from 'react';

import { cn } from '@/shared/utils';

export type TrendDirection = 'up' | 'down' | 'neutral';

interface KpiCardData {
  value: string | number;
  label: string;
  trend?: TrendDirection;
  changePercent?: number;
  status?: 'success' | 'warning' | 'error' | 'neutral';
}

export interface Api3KpiStats {
  totalAirnodes: number;
  onlineAirnodes: number;
  priceUpdateEvents: number;
  totalDapis: number;
}

interface Api3KpiOverviewProps {
  stats: Api3KpiStats | null;
  loading?: boolean;
  className?: string;
  compact?: boolean;
}

const defaultKpiData: KpiCardData = {
  value: '-',
  label: '',
  trend: 'neutral',
  status: 'neutral',
};

const trendIcons: Record<TrendDirection, React.ReactNode> = {
  up: (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ),
  down: (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  neutral: (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
    </svg>
  ),
};

const statusColors: Record<string, { text: string; bg: string; border: string }> = {
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

const trendColors: Record<TrendDirection, string> = {
  up: 'text-success',
  down: 'text-error',
  neutral: 'text-muted-foreground',
};

function KpiCard({
  data,
  compact,
  loading,
}: {
  data: KpiCardData;
  compact?: boolean;
  loading?: boolean;
}) {
  const { value, label, trend = 'neutral', changePercent, status = 'neutral' } = data;
  const colors = statusColors[status] ?? statusColors.neutral!;

  if (loading) {
    return (
      <div
        className={cn(
          'rounded border bg-[rgba(15,23,42,0.8)] backdrop-blur-sm',
          colors.border,
          compact ? 'p-2.5' : 'p-3',
        )}
      >
        <div className="mb-1 h-3 w-16 animate-pulse rounded bg-muted/30" />
        <div className="h-6 w-20 animate-pulse rounded bg-muted/30" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded border bg-[rgba(15,23,42,0.8)] backdrop-blur-sm',
        'transition-all duration-200 ease-in-out',
        'hover:border-primary/30 hover:shadow-md hover:shadow-primary/5',
        colors.border,
        compact ? 'p-2.5' : 'p-3',
      )}
    >
      <div className="mb-1 flex items-start justify-between">
        <span
          className={cn('font-medium text-muted-foreground', compact ? 'text-[11px]' : 'text-xs')}
        >
          {label}
        </span>
        {trend && trend !== 'neutral' && (
          <span
            className={cn('flex items-center gap-0.5 text-[10px] font-medium', trendColors[trend])}
          >
            {trendIcons[trend]}
            {changePercent !== undefined && `${Math.abs(changePercent)}%`}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            'font-mono font-bold tracking-tight',
            colors.text,
            compact ? 'text-lg' : 'text-xl',
          )}
        >
          {value}
        </span>
      </div>

      {changePercent !== undefined && trend === 'neutral' && (
        <div className={cn('mt-0.5 text-[10px]', trendColors[trend])}>
          较上期 {changePercent > 0 ? '+' : ''}
          {changePercent}%
        </div>
      )}
    </div>
  );
}

export function Api3KpiOverview({
  stats,
  loading = false,
  className,
  compact = false,
}: Api3KpiOverviewProps) {
  const kpis: KpiCardData[] = stats
    ? [
        {
          value: stats.totalAirnodes,
          label: '总 Airnodes',
          trend: 'neutral' as TrendDirection,
          status: 'neutral' as const,
        },
        {
          value: stats.onlineAirnodes,
          label: '在线 Airnodes',
          trend: 'up' as TrendDirection,
          status: stats.onlineAirnodes > 0 ? ('success' as const) : ('warning' as const),
        },
        {
          value: stats.priceUpdateEvents,
          label: '价格更新事件',
          trend: 'up' as TrendDirection,
          status: 'success' as const,
        },
        {
          value: stats.totalDapis,
          label: 'dAPIs 数量',
          trend: 'neutral' as TrendDirection,
          status: 'neutral' as const,
        },
      ]
    : [defaultKpiData, defaultKpiData, defaultKpiData, defaultKpiData];

  return (
    <div
      className={cn(
        'grid gap-2 md:gap-3',
        compact ? 'grid-cols-2 xl:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4',
        className,
      )}
    >
      {kpis.map((kpi, index) => (
        <KpiCard key={index} data={kpi} compact={compact} loading={loading} />
      ))}
    </div>
  );
}

export default Api3KpiOverview;
