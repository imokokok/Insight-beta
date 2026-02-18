'use client';

import { BarChart3, AlertTriangle, Activity, Zap } from 'lucide-react';

import { SummaryStatsBase, type StatItemBase } from '@/components/common';
import { useI18n } from '@/i18n';

import type { DeviationReport } from '../types/deviation';

interface SummaryStatsProps {
  report: DeviationReport | null;
}

export function SummaryStats({ report }: SummaryStatsProps) {
  const { t } = useI18n();

  if (!report) {
    return <SummaryStatsBase stats={[]} loading />;
  }

  const { summary } = report;

  const stats: StatItemBase[] = [
    {
      title: t('analytics:deviation.summary.totalSymbols'),
      value: summary.totalSymbols,
      icon: <BarChart3 className="h-5 w-5" />,
      color: 'blue',
      tooltip: t('analytics.deviation.help.totalSymbols'),
    },
    {
      title: t('analytics:deviation.summary.highDeviation'),
      value: summary.symbolsWithHighDeviation,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'red',
      tooltip: t('analytics.deviation.help.highDeviation'),
    },
    {
      title: t('analytics:deviation.summary.avgDeviation'),
      value: `${(summary.avgDeviationAcrossAll * 100).toFixed(2)}%`,
      icon: <Activity className="h-5 w-5" />,
      color: 'amber',
      tooltip: t('analytics.deviation.help.avgDeviation'),
    },
    {
      title: t('analytics:deviation.summary.mostVolatile'),
      value: summary.mostVolatileSymbol || 'N/A',
      icon: <Zap className="h-5 w-5" />,
      color: 'purple',
      tooltip: t('analytics.deviation.help.mostVolatile'),
    },
  ];

  return <SummaryStatsBase stats={stats} variant="detailed" />;
}
