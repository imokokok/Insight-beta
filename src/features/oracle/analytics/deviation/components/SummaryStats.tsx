'use client';

import { BarChart3, AlertTriangle, Activity, Zap } from 'lucide-react';

import { SummaryStatsGrid } from '@/components/common/SummaryStatsGrid';
import { useI18n } from '@/i18n';

import type { DeviationReport } from '../types/deviation';

interface SummaryStatsProps {
  report: DeviationReport | null;
}

export function SummaryStats({ report }: SummaryStatsProps) {
  const { t } = useI18n();

  if (!report) {
    return <SummaryStatsGrid stats={[]} loading />;
  }

  const { summary } = report;

  const stats = [
    {
      title: t('analytics:deviation.summary.totalSymbols'),
      value: summary.totalSymbols,
      icon: <BarChart3 className="h-5 w-5" />,
      color: 'blue' as const,
    },
    {
      title: t('analytics:deviation.summary.highDeviation'),
      value: summary.symbolsWithHighDeviation,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'red' as const,
    },
    {
      title: t('analytics:deviation.summary.avgDeviation'),
      value: `${(summary.avgDeviationAcrossAll * 100).toFixed(2)}%`,
      icon: <Activity className="h-5 w-5" />,
      color: 'amber' as const,
    },
    {
      title: t('analytics:deviation.summary.mostVolatile'),
      value: summary.mostVolatileSymbol || 'N/A',
      icon: <Zap className="h-5 w-5" />,
      color: 'purple' as const,
    },
  ];

  return <SummaryStatsGrid stats={stats} />;
}
