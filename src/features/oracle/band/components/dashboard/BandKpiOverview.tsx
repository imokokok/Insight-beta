import {
  KpiGrid,
  DEFAULT_KPI_DATA,
  type KpiCardData,
  type TrendDirection,
} from '@/components/common';
import type { BandStats } from '@/types/stats';

export type BandKpiStats = Pick<
  BandStats,
  'activeBridges' | 'totalTransfers' | 'totalSources' | 'avgLatency'
> & {
  avgLatency: number;
};

interface BandKpiOverviewProps {
  stats: BandKpiStats | null;
  loading?: boolean;
  className?: string;
  compact?: boolean;
}

export function BandKpiOverview({
  stats,
  loading = false,
  className,
  compact = false,
}: BandKpiOverviewProps) {
  const kpis: KpiCardData[] = stats
    ? [
        {
          value: stats.activeBridges,
          label: '活跃数据桥',
          trend: 'up' as TrendDirection,
          status: stats.activeBridges > 0 ? ('success' as const) : ('warning' as const),
        },
        {
          value: stats.totalTransfers.toLocaleString(),
          label: '总传输量',
          trend: 'up' as TrendDirection,
          status: 'success' as const,
        },
        {
          value: stats.totalSources,
          label: '数据源数量',
          trend: 'neutral' as TrendDirection,
          status: stats.totalSources > 0 ? ('success' as const) : ('warning' as const),
        },
        {
          value: `${stats.avgLatency}ms`,
          label: '平均延迟',
          trend: 'down' as TrendDirection,
          status:
            stats.avgLatency < 200
              ? ('success' as const)
              : stats.avgLatency < 500
                ? ('warning' as const)
                : ('error' as const),
        },
      ]
    : [DEFAULT_KPI_DATA, DEFAULT_KPI_DATA, DEFAULT_KPI_DATA, DEFAULT_KPI_DATA];

  const kpiLabels = ['活跃数据桥', '总传输量', '数据源数量', '平均延迟'];

  return (
    <KpiGrid
      kpis={kpis}
      labels={kpiLabels}
      loading={loading}
      compact={compact}
      className={className}
    />
  );
}

export default BandKpiOverview;
