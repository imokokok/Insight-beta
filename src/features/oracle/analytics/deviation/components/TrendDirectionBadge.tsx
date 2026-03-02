'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

import { Badge } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

import type { DeviationTrend } from '../types/deviation';

interface TrendDirectionBadgeProps {
  direction: DeviationTrend['trendDirection'];
  strength: number;
}

export function TrendDirectionBadge({ direction, strength }: TrendDirectionBadgeProps) {
  const { t } = useI18n();
  const config: Record<string, { icon: typeof TrendingUp; color: string; label: string }> = {
    increasing: {
      icon: TrendingUp,
      color: 'bg-red-500',
      label: t('common.trendIncreasing'),
    },
    decreasing: {
      icon: TrendingDown,
      color: 'bg-green-500',
      label: t('common.trendDecreasing'),
    },
    stable: {
      icon: Minus,
      color: 'bg-blue-500',
      label: t('common.trendStable'),
    },
    up: {
      icon: TrendingUp,
      color: 'bg-green-500',
      label: t('common.trendUp'),
    },
    down: {
      icon: TrendingDown,
      color: 'bg-red-500',
      label: t('common.trendDown'),
    },
    neutral: {
      icon: Minus,
      color: 'bg-gray-500',
      label: t('common.trendNeutral'),
    },
  };

  const { icon: Icon, color, label } = config[direction] ?? config.stable!;

  return (
    <Badge className={cn('gap-1', color)}>
      <Icon className="h-3 w-3" />
      {label}
      <span className="ml-1 opacity-75">({(strength * 100).toFixed(0)}%)</span>
    </Badge>
  );
}
