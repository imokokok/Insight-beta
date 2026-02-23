import {
  KpiGrid,
  DEFAULT_KPI_DATA,
  type KpiCardData,
  type TrendDirection,
} from '@/components/common';
import { formatLatency } from '@/shared/utils/format';

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

export function PythKpiOverview({
  stats,
  loading = false,
  className,
  compact = false,
}: PythKpiOverviewProps) {
  const getLatencyStatus = (ms: number): 'success' | 'warning' | 'error' => {
    if (ms < 200) return 'success';
    if (ms < 500) return 'warning';
    return 'error';
  };

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
          status: getLatencyStatus(stats.avgLatency),
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
