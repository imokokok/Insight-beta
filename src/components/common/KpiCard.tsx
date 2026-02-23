import { cn } from '@/shared/utils';
import type { KpiCardData, KpiTrendDirection, KpiStatus } from '@/types/shared/kpi';
import { DEFAULT_KPI_DATA, TREND_COLORS, STATUS_COLORS } from '@/types/shared/kpi';

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
  const { value, label, trend = 'neutral', changePercent, status = 'neutral' } = data;
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.neutral!;

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
            className={cn('flex items-center gap-0.5 text-[10px] font-medium', TREND_COLORS[trend])}
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
            compact ? 'text-lg' : 'text-xl',
          )}
        >
          {value}
        </span>
      </div>

      {changePercent !== undefined && trend === 'neutral' && (
        <div className={cn('mt-0.5 text-[10px]', TREND_COLORS[trend])}>
          较上期 {changePercent > 0 ? '+' : ''}
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
          <div
            key={i}
            className="h-20 animate-pulse rounded border border-border/20 bg-[rgba(15,23,42,0.8)]"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid gap-2 md:gap-3',
        compact ? 'grid-cols-2 xl:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4',
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
