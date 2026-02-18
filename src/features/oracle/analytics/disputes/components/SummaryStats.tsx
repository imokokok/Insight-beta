'use client';

import { Gavel, Clock, CheckCircle, DollarSign } from 'lucide-react';

import { SummaryStatsBase, type StatItemBase } from '@/components/common';
import { useI18n } from '@/i18n';
import type { DisputeReport } from '@/types/oracle/dispute';

interface SummaryStatsProps {
  report: DisputeReport | null;
}

export function SummaryStats({ report }: SummaryStatsProps) {
  const { t } = useI18n();

  if (!report) {
    return <SummaryStatsBase stats={[]} loading />;
  }

  const { summary } = report;

  const stats: StatItemBase[] = [
    {
      title: t('analytics:disputes.summary.totalDisputes'),
      value: summary.totalDisputes,
      icon: <Gavel className="h-5 w-5" />,
      color: 'blue',
    },
    {
      title: t('analytics:disputes.summary.activeDisputes'),
      value: summary.activeDisputes,
      icon: <Clock className="h-5 w-5" />,
      color: 'amber',
    },
    {
      title: t('analytics:disputes.summary.successRate'),
      value: `${summary.successRate.toFixed(1)}%`,
      icon: <CheckCircle className="h-5 w-5" />,
      color: 'green',
    },
    {
      title: t('analytics:disputes.summary.totalBonded'),
      value: `${summary.totalBonded.toFixed(0)}`,
      icon: <DollarSign className="h-5 w-5" />,
      color: 'purple',
    },
  ];

  return <SummaryStatsBase stats={stats} />;
}
