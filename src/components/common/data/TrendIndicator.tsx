'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

import { cn } from '@/shared/utils';

export type Trend = 'up' | 'down' | 'neutral';

export interface TrendIndicatorProps {
  trend: Trend;
  value?: number;
  showValue?: boolean;
  className?: string;
  iconClassName?: string;
  valueClassName?: string;
}

const trendConfig = {
  up: {
    icon: TrendingUp,
    iconColor: 'text-emerald-500',
    valueColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  down: {
    icon: TrendingDown,
    iconColor: 'text-rose-500',
    valueColor: 'text-rose-600',
    bgColor: 'bg-rose-50',
  },
  neutral: {
    icon: Minus,
    iconColor: 'text-gray-400',
    valueColor: 'text-gray-500',
    bgColor: 'bg-gray-50',
  },
};

export function TrendIndicator({
  trend,
  value,
  showValue = true,
  className,
  iconClassName,
  valueClassName,
}: TrendIndicatorProps) {
  const config = trendConfig[trend];
  const Icon = config.icon;

  const formatValue = (val: number): string => {
    const sign = trend === 'up' ? '+' : trend === 'down' ? '-' : '';
    return `${sign}${Math.abs(val).toFixed(2)}%`;
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1',
        trend !== 'neutral' && config.bgColor,
        trend !== 'neutral' && 'rounded px-2 py-0.5',
        className,
      )}
    >
      <Icon className={cn('h-4 w-4', config.iconColor, iconClassName)} />
      {showValue && value !== undefined && (
        <span className={cn('text-sm font-medium', config.valueColor, valueClassName)}>
          {formatValue(value)}
        </span>
      )}
    </span>
  );
}

export function TrendIndicatorCompact({
  trend,
  value,
  showValue = true,
  className,
}: Omit<TrendIndicatorProps, 'iconClassName' | 'valueClassName'>) {
  const config = trendConfig[trend];
  const Icon = config.icon;

  const formatValue = (val: number): string => {
    const sign = trend === 'up' ? '+' : trend === 'down' ? '-' : '';
    return `${sign}${Math.abs(val).toFixed(2)}%`;
  };

  return (
    <span className={cn('inline-flex items-center gap-0.5', config.valueColor, className)}>
      <Icon className="h-3.5 w-3.5" />
      {showValue && value !== undefined && (
        <span className="text-xs font-medium">{formatValue(value)}</span>
      )}
    </span>
  );
}

export function TrendIndicatorBadge({
  trend,
  value,
  showValue = true,
  className,
}: Omit<TrendIndicatorProps, 'iconClassName' | 'valueClassName'>) {
  const config = trendConfig[trend];
  const Icon = config.icon;

  const formatValue = (val: number): string => {
    const sign = trend === 'up' ? '+' : trend === 'down' ? '-' : '';
    return `${sign}${Math.abs(val).toFixed(2)}%`;
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
        config.bgColor,
        config.valueColor,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {showValue && value !== undefined && formatValue(value)}
    </span>
  );
}
