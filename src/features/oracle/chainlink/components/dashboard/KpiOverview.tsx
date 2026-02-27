import {
  KpiCard,
  DEFAULT_KPI_DATA,
  type KpiCardData,
  type TrendDirection,
} from '@/components/common';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

interface KpiOverviewProps {
  totalFeeds?: KpiCardData;
  activeNodes?: KpiCardData;
  avgLatency?: KpiCardData;
  ocrRounds?: KpiCardData;
  className?: string;
  compact?: boolean;
}

export function KpiOverview({
  totalFeeds = DEFAULT_KPI_DATA,
  activeNodes = DEFAULT_KPI_DATA,
  avgLatency = DEFAULT_KPI_DATA,
  ocrRounds = DEFAULT_KPI_DATA,
  className,
  compact = false,
}: KpiOverviewProps) {
  const { t } = useI18n();
  const kpis = [
    { ...totalFeeds, label: totalFeeds.label || t('chainlink.kpi.totalFeeds'), key: 'feeds' },
    { ...activeNodes, label: activeNodes.label || t('chainlink.kpi.activeNodes'), key: 'nodes' },
    { ...avgLatency, label: avgLatency.label || t('chainlink.kpi.avgLatency'), key: 'latency' },
    { ...ocrRounds, label: ocrRounds.label || t('chainlink.kpi.ocrRounds'), key: 'rounds' },
  ];

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
      {kpis.map((kpi) => (
        <KpiCard key={kpi.key} data={kpi} compact={compact} />
      ))}
    </div>
  );
}

export default KpiOverview;

export { DEFAULT_KPI_DATA, type KpiCardData, type TrendDirection };
