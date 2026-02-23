import {
  KpiGrid,
  DEFAULT_KPI_DATA,
  type KpiCardData,
  type TrendDirection,
} from '@/components/common';
import { formatLatency, getLatencyStatus } from '@/shared/utils/format';

interface PythKpiStats {
  totalPublishers: number;
  activePublishers: number;
  activePriceFeeds: number;
  avgLatency: number;
}

interface PythKpiOverviewProps {
  stats: PythKpiStats | null;
  loading?: boolean;
  className?: string;
  compact?: boolean;
}

const mapLatencyStatusToKpi = (
  status: ReturnType<typeof getLatencyStatus>,
): 'success' | 'warning' | 'error' => {
  switch (status) {
    case 'excellent':
    case 'good':
      return 'success';
    case 'fair':
      return 'warning';
    case 'poor':
      return 'error';
  }
};

export function PythKpiOverview({
  stats,
  loading = false,
  className,
  compact = false,
}: PythKpiOverviewProps) {
  const kpis: KpiCardData[] = stats
    ? [
        {
          value: stats.totalPublishers,
          label: '总 Publisher',
          trend: 'neutral' as TrendDirection,
        },
        {
          value: stats.activePublishers,
          label: '活跃 Publisher',
          trend: 'up' as TrendDirection,
          status: stats.activePublishers > 0 ? ('success' as const) : ('warning' as const),
        },
        {
          value: stats.activePriceFeeds,
          label: '活跃价格源',
          trend: 'up' as TrendDirection,
          status: 'success' as const,
        },
        {
          value: formatLatency(stats.avgLatency),
          label: '平均延迟',
          trend: 'down' as TrendDirection,
          status: mapLatencyStatusToKpi(getLatencyStatus(stats.avgLatency)),
        },
      ]
    : [
        { ...DEFAULT_KPI_DATA, label: '总 Publisher' },
        { ...DEFAULT_KPI_DATA, label: '活跃 Publisher' },
        { ...DEFAULT_KPI_DATA, label: '活跃价格源' },
        { ...DEFAULT_KPI_DATA, label: '平均延迟' },
      ];

  return <KpiGrid kpis={kpis} loading={loading} compact={compact} className={className} />;
}

export default PythKpiOverview;
