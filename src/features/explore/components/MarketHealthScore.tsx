'use client';

import { ShieldCheck, CheckCircle2, Activity, AlertTriangle } from 'lucide-react';

import { useI18n } from '@/i18n/LanguageProvider';
import { cn } from '@/shared/utils';

interface MarketHealthScoreProps {
  score: number;
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function MarketHealthScore({ score, isLoading, size = 'md' }: MarketHealthScoreProps) {
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-16 w-16 animate-pulse rounded-full bg-gray-200" />
      </div>
    );
  }

  let color = 'text-emerald-500';
  let strokeColor = '#10b981';
  let Icon = ShieldCheck;
  let statusText = t('market.healthScore.excellent');

  if (score < 90) {
    color = 'text-green-500';
    strokeColor = '#22c55e';
    Icon = CheckCircle2;
    statusText = t('market.healthScore.good');
  }
  if (score < 80) {
    color = 'text-amber-500';
    strokeColor = '#f59e0b';
    Icon = Activity;
    statusText = t('market.healthScore.degraded');
  }
  if (score < 60) {
    color = 'text-red-500';
    strokeColor = '#ef4444';
    Icon = AlertTriangle;
    statusText = t('market.healthScore.critical');
  }

  const sizeClasses = {
    sm: { container: 'h-20 w-20', icon: 'h-8 w-8', text: 'text-xs', score: 'text-sm' },
    md: { container: 'h-28 w-28', icon: 'h-10 w-10', text: 'text-sm', score: 'text-base' },
    lg: { container: 'h-36 w-36', icon: 'h-12 w-12', text: 'text-base', score: 'text-lg' },
  };

  const currentSize = sizeClasses[size];
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-4 text-center">
      <div className={cn('relative', currentSize.container)}>
        <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-gray-200"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className={cn(currentSize.icon, color)} />
          <span className={cn('mt-1 font-bold', currentSize.score, color)}>{score}</span>
        </div>
      </div>
      <h3 className={cn('mt-3 font-semibold text-foreground', currentSize.text)}>
        {statusText}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">{t('market.healthScore.title')}</p>
    </div>
  );
}
