import {
  KpiCard,
  DEFAULT_KPI_DATA,
  type KpiCardData,
  type TrendDirection,
} from '@/components/common';
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
  const kpis = [
    { ...totalFeeds, label: totalFeeds.label || '总 Feed 数', key: 'feeds' },
    { ...activeNodes, label: activeNodes.label || '活跃节点', key: 'nodes' },
    { ...avgLatency, label: avgLatency.label || '平均延迟', key: 'latency' },
    { ...ocrRounds, label: ocrRounds.label || 'OCR 轮次', key: 'rounds' },
  ];

  return (
    <div
      className={cn(
        'grid grid-cols-2 sm:grid-cols-4',
        'divide-x divide-y divide-border/30 sm:divide-y-0',
        'overflow-hidden rounded-lg border border-border/30',
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
