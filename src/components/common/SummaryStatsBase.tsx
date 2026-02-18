'use client';

import { StatCard } from './StatCard';

import type { StatCardColor, StatCardVariant } from './StatCard';

export interface StatItemBase {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: StatCardColor;
  tooltip?: string;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
}

export interface SummaryStatsBaseProps {
  stats: StatItemBase[];
  loading?: boolean;
  loadingItemCount?: number;
  variant?: StatCardVariant;
  columns?: 2 | 3 | 4 | 6;
  className?: string;
}

export function SummaryStatsBase({
  stats,
  loading = false,
  loadingItemCount = 4,
  variant = 'default',
  columns = 4,
  className = '',
}: SummaryStatsBaseProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  };

  if (loading) {
    return (
      <div className={`grid ${gridCols[columns]} gap-4 ${className}`}>
        {Array.from({ length: loadingItemCount }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-4 ${className}`}>
      {stats.map((stat, index) => (
        <StatCard
          key={index}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          color={stat.color}
          tooltip={stat.tooltip}
          subtitle={stat.subtitle}
          trend={stat.trend}
          variant={variant}
        />
      ))}
    </div>
  );
}
