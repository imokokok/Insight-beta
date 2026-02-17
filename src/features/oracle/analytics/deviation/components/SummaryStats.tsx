'use client';

import { BarChart3, AlertTriangle, Activity, Zap } from 'lucide-react';

import { StatCard } from '@/components/common/StatCard';
import { useI18n } from '@/i18n';

import type { DeviationReport } from '../types/deviation';

interface SummaryStatsProps {
  report: DeviationReport | null;
}

export function SummaryStats({ report }: SummaryStatsProps) {
  const { t } = useI18n();

  if (!report) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  const { summary } = report;

  const stats = [
    {
      title: t('analytics:deviation.summary.totalSymbols'),
      value: summary.totalSymbols,
      icon: <BarChart3 className="h-5 w-5" />,
      color: 'blue' as const,
      tooltip: t('analytics.deviation.help.totalSymbols'),
    },
    {
      title: t('analytics:deviation.summary.highDeviation'),
      value: summary.symbolsWithHighDeviation,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'red' as const,
      tooltip: t('analytics.deviation.help.highDeviation'),
    },
    {
      title: t('analytics:deviation.summary.avgDeviation'),
      value: `${(summary.avgDeviationAcrossAll * 100).toFixed(2)}%`,
      icon: <Activity className="h-5 w-5" />,
      color: 'amber' as const,
      tooltip: t('analytics.deviation.help.avgDeviation'),
    },
    {
      title: t('analytics:deviation.summary.mostVolatile'),
      value: summary.mostVolatileSymbol || 'N/A',
      icon: <Zap className="h-5 w-5" />,
      color: 'purple' as const,
      tooltip: t('analytics.deviation.help.mostVolatile'),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {stats.map((stat, index) => (
        <StatCard
          key={index}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          color={stat.color}
          tooltip={stat.tooltip}
          variant="detailed"
        />
      ))}
    </div>
  );
}
