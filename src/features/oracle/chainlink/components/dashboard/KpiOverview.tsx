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

interface KpiOverviewProps {
  totalFeeds?: KpiCardData;
  activeNodes?: KpiCardData;
  avgLatency?: KpiCardData;
  ocrRounds?: KpiCardData;
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

function KpiCard({ data, compact }: { data: KpiCardData; compact?: boolean }) {
  const { value, label, trend = 'neutral', changePercent, status = 'neutral' } = data;
  const colors = statusColors[status] ?? statusColors.neutral!;

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

export function KpiOverview({
  totalFeeds = defaultKpiData,
  activeNodes = defaultKpiData,
  avgLatency = defaultKpiData,
  ocrRounds = defaultKpiData,
  className,
  compact = false,
}: KpiOverviewProps) {
  const kpis = [
    { ...totalFeeds, label: totalFeeds.label || '总 Feed 数', key: 'feeds' },
    { ...activeNodes, label: activeNodes.label || '活跃节点', key: 'nodes' },
    { ...avgLatency, label: avgLatency.label || '平均延迟', key: 'latency' },
    { ...ocrRounds, label: ocrRounds.label || 'OCR 轮次', key: 'rounds' },
  ];

  return (
    <div
      className={cn(
        'grid gap-2 md:gap-3',
        compact ? 'grid-cols-2 xl:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4',
        className,
      )}
    >
      {kpis.map((kpi) => (
        <KpiCard key={kpi.key} data={kpi} compact={compact} />
      ))}
    </div>
  );
}

export default KpiOverview;
