'use client';

import { Activity, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';

import { useI18n } from '@/i18n/LanguageProvider';
import { cn } from '@/shared/utils';

interface OracleHealthScoreProps {
  score: number;
  isLoading?: boolean;
}

export function OracleHealthScore({ score, isLoading }: OracleHealthScoreProps) {
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-16 w-16 animate-pulse rounded-full bg-gray-200" />
      </div>
    );
  }

  let color = 'text-green-500';
  let bgColor = 'bg-green-50';
  let ringColor = 'ring-green-100';
  let Icon = ShieldCheck;
  let statusText = t('oracle.healthScore.excellent');

  if (score < 90) {
    color = 'text-yellow-500';
    bgColor = 'bg-yellow-50';
    ringColor = 'ring-yellow-100';
    Icon = CheckCircle2;
    statusText = t('oracle.healthScore.good');
  }
  if (score < 80) {
    color = 'text-amber-500';
    bgColor = 'bg-amber-50';
    ringColor = 'ring-amber-100';
    Icon = Activity;
    statusText = t('oracle.healthScore.degraded');
  }
  if (score < 60) {
    color = 'text-red-500';
    bgColor = 'bg-red-50';
    ringColor = 'ring-red-100';
    Icon = AlertTriangle;
    statusText = t('oracle.healthScore.critical');
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <div
        className={cn(
          'relative mb-4 flex h-24 w-24 items-center justify-center rounded-full border-4',
          bgColor,
          ringColor,
          color.replace('text-', 'border-'),
        )}
      >
        <Icon className={cn('h-10 w-10', color)} />
        <span
          className={cn(
            'absolute -bottom-2 rounded-full border bg-white px-2 py-0.5 text-xs font-bold shadow-sm',
            color.replace('text-', 'border-'),
            color,
          )}
        >
          {score}/100
        </span>
      </div>
      <h3 className="text-2xl font-bold text-gray-900">{statusText}</h3>
      <p className="mt-1 text-sm text-gray-500">{t('oracle.healthScore.title')}</p>
    </div>
  );
}
