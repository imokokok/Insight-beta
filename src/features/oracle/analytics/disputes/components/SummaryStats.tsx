'use client';

import { Gavel, Clock, CheckCircle, DollarSign } from 'lucide-react';

import { StatCard } from '@/components/common';
import { useI18n } from '@/i18n';

import type { DisputeReport } from '../types/disputes';

interface SummaryStatsProps {
  report: DisputeReport | null;
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

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <StatCard
        title={t('analytics:disputes.summary.totalDisputes')}
        value={summary.totalDisputes}
        icon={<Gavel className="h-5 w-5" />}
        color="blue"
      />
      <StatCard
        title={t('analytics:disputes.summary.activeDisputes')}
        value={summary.activeDisputes}
        icon={<Clock className="h-5 w-5" />}
        color="amber"
      />
      <StatCard
        title={t('analytics:disputes.summary.successRate')}
        value={`${summary.successRate.toFixed(1)}%`}
        icon={<CheckCircle className="h-5 w-5" />}
        color="green"
      />
      <StatCard
        title={t('analytics:disputes.summary.totalBonded')}
        value={`${summary.totalBonded.toFixed(0)}`}
        icon={<DollarSign className="h-5 w-5" />}
        color="purple"
      />
    </div>
  );
}
