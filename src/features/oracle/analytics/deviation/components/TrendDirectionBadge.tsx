'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/shared/utils';
import type { DeviationTrend } from '../types/deviation';

interface TrendDirectionBadgeProps {
  direction: DeviationTrend['trendDirection'];
  strength: number;
}

export function TrendDirectionBadge({ direction, strength }: TrendDirectionBadgeProps) {
  const config = {
    increasing: {
      icon: TrendingUp,
      color: 'bg-red-500',
      label: 'Increasing',
    },
    decreasing: {
      icon: TrendingDown,
      color: 'bg-green-500',
      label: 'Decreasing',
    },
    stable: {
      icon: Minus,
      color: 'bg-blue-500',
      label: 'Stable',
    },
  };

  const { icon: Icon, color, label } = config[direction];

  return (
    <Badge className={cn('gap-1', color)}>
      <Icon className="h-3 w-3" />
      {label}
      <span className="ml-1 opacity-75">({(strength * 100).toFixed(0)}%)</span>
    </Badge>
  );
}
