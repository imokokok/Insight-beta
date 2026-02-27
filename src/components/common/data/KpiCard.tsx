import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';
import type { KpiCardData, KpiTrendDirection, KpiStatus } from '@/types/shared/kpi';
import { DEFAULT_KPI_DATA, TREND_COLORS, STATUS_COLORS } from '@/types/shared/kpi';

import { MiniTrend } from './MiniTrend';

export { DEFAULT_KPI_DATA, TREND_COLORS, STATUS_COLORS };
export type { KpiCardData, KpiStatus };
export type { KpiTrendDirection as TrendDirection };

const TREND_ICONS: Record<KpiTrendDirection, React.ReactNode> = {
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

interface KpiCardProps {
  data: KpiCardData;
  compact?: boolean;
}

export function KpiCard({ data, compact }: KpiCardProps) {
  const { t } = useI18n();
  const {
    value,
    label,
    trend = 'neutral',
    changePercent,
    status = 'neutral',
    trendData,
    showTrend,
  } = data;
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.neutral!;

  const trendColor = trend === 'up' ? 'success' : trend === 'down' ? 'error' : 'neutral';

  return (
    <div
      className={cn('flex flex-col', 'transition-colors duration-200', compact ? 'py-2' : 'py-3')}
    >
      <div className="mb-0.5 flex items-center justify-between">
        <span
          className={cn('font-medium text-muted-foreground', compact ? 'text-[10px]' : 'text-xs')}
        >
          {label}
        </span>
        {trend && trend !== 'neutral' && (
          <span
            className={cn(
              'flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[10px] font-medium',
              TREND_COLORS[trend],
            )}
          >
            {TREND_ICONS[trend]}
            {changePercent !== undefined && `${Math.abs(changePercent)}%`}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            'font-mono font-bold tracking-tight',
            colors.text,
            compact ? 'text-base' : 'text-lg',
          )}
        >
          {value}
        </span>
        {showTrend && trendData && trendData.length >= 2 && (
          <MiniTrend data={trendData} color={trendColor} mode="line" />
        )}
      </div>

      {changePercent !== undefined && trend === 'neutral' && (
        <div className={cn('mt-0.5 text-[10px]', TREND_COLORS[trend])}>
          {t('common.kpi.comparedToLastPeriod')} {changePercent > 0 ? '+' : ''}
          {changePercent}%
        </div>
      )}
    </div>
  );
}

interface KpiGridProps {
  kpis: KpiCardData[];
  labels?: string[];
  loading?: boolean;
  compact?: boolean;
  className?: string;
}

export function KpiGrid({
  kpis,
  labels,
  loading = false,
  compact = false,
  className,
}: KpiGridProps) {
  if (loading) {
    return (
      <div
        className={cn(
          'grid gap-2 md:gap-3',
          compact ? 'grid-cols-2 xl:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4',
          className,
        )}
      >
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded border border-border/20 bg-muted/30" />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-2 sm:grid-cols-4',
        'divide-x divide-y divide-border/30 sm:divide-y-0',
        'overflow-hidden rounded-lg border border-border/30',
        'px-3',
        className,
      )}
    >
      {kpis.map((kpi, index) => (
        <KpiCard
          key={index}
          data={{ ...kpi, label: kpi.label || labels?.[index] || '' }}
          compact={compact}
        />
      ))}
    </div>
  );
}
