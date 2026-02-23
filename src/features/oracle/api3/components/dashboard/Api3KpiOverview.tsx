import {
  KpiGrid,
  DEFAULT_KPI_DATA,
  type KpiCardData,
  type TrendDirection,
} from '@/components/common';

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
    : [DEFAULT_KPI_DATA, DEFAULT_KPI_DATA, DEFAULT_KPI_DATA, DEFAULT_KPI_DATA];

  return <KpiGrid kpis={kpis} loading={loading} compact={compact} className={className} />;
}

export default Api3KpiOverview;
