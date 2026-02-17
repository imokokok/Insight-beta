'use client';

import type { StatCardColor } from './StatCard';
import { StatCard } from './StatCard';

export interface StatItem {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: StatCardColor;
}

export interface SummaryStatsGridProps {
  stats: StatItem[];
  loading?: boolean;
  loadingItemCount?: number;
  className?: string;
}

export function SummaryStatsGrid({
  stats,
  loading = false,
  loadingItemCount = 4,
  className = '',
}: SummaryStatsGridProps) {
  if (loading) {
    return (
      <div className={`grid grid-cols-2 gap-4 md:grid-cols-4 ${className}`}>
        {Array.from({ length: loadingItemCount }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 gap-4 md:grid-cols-4 ${className}`}>
      {stats.map((stat, index) => (
        <StatCard
          key={index}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          color={stat.color}
        />
      ))}
    </div>
  );
}
