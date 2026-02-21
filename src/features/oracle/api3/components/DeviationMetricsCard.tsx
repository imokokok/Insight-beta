'use client';

import { BarChart3, Maximize2, Minimize2, TrendingUp } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useI18n } from '@/i18n';

import type { ComparisonDeviation } from '../types/api3';

interface DeviationMetricsCardProps {
  deviations: ComparisonDeviation;
  className?: string;
}

const formatDeviation = (value: number): string => {
  return `${value.toFixed(4)}%`;
};

const MetricItem = ({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
}) => (
  <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
    <div
      className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full`}
      style={{ backgroundColor: `${color}20` }}
    >
      <Icon className="h-5 w-5" style={{ color }} />
    </div>
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  </div>
);

export function DeviationMetricsCard({ deviations, className }: DeviationMetricsCardProps) {
  const { t } = useI18n();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          {t('api3.deviation.metricsTitle') || '偏差统计指标'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">API3 vs Chainlink</h4>
            <div className="grid gap-3">
              <MetricItem
                label={t('api3.deviation.mean') || '均值'}
                value={formatDeviation(deviations.api3VsChainlink.mean)}
                icon={TrendingUp}
                color="#3b82f6"
              />
              <MetricItem
                label={t('api3.deviation.max') || '最大值'}
                value={formatDeviation(deviations.api3VsChainlink.max)}
                icon={Maximize2}
                color="#dc2626"
              />
              <MetricItem
                label={t('api3.deviation.min') || '最小值'}
                value={formatDeviation(deviations.api3VsChainlink.min)}
                icon={Minimize2}
                color="#22c55e"
              />
              <MetricItem
                label={t('api3.deviation.stdDev') || '标准差'}
                value={formatDeviation(deviations.api3VsChainlink.stdDev)}
                icon={TrendingUp}
                color="#8b5cf6"
              />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">API3 vs Pyth</h4>
            <div className="grid gap-3">
              <MetricItem
                label={t('api3.deviation.mean') || '均值'}
                value={formatDeviation(deviations.api3VsPyth.mean)}
                icon={TrendingUp}
                color="#3b82f6"
              />
              <MetricItem
                label={t('api3.deviation.max') || '最大值'}
                value={formatDeviation(deviations.api3VsPyth.max)}
                icon={Maximize2}
                color="#dc2626"
              />
              <MetricItem
                label={t('api3.deviation.min') || '最小值'}
                value={formatDeviation(deviations.api3VsPyth.min)}
                icon={Minimize2}
                color="#22c55e"
              />
              <MetricItem
                label={t('api3.deviation.stdDev') || '标准差'}
                value={formatDeviation(deviations.api3VsPyth.stdDev)}
                icon={TrendingUp}
                color="#8b5cf6"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
