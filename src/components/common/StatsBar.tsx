'use client';

import { memo } from 'react';

import { TrendingUp, TrendingDown } from 'lucide-react';

import { cn } from '@/shared/utils';

export interface StatsBarItem {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  status?: 'healthy' | 'warning' | 'critical' | 'neutral';
  icon?: React.ReactNode;
}

export interface ProgressSegment {
  label: string;
  value: number;
  color: string;
}

export interface StatsBarProps {
  items: StatsBarItem[];
  showProgress?: boolean;
  progressData?: ProgressSegment[];
  title?: string;
  className?: string;
}

const statusColors = {
  healthy: 'text-success',
  warning: 'text-warning',
  critical: 'text-error',
  neutral: 'text-foreground',
};

const trendColors = {
  up: 'text-success',
  down: 'text-error',
  neutral: 'text-muted-foreground',
};

export const StatsBar = memo(function StatsBar({
  items,
  showProgress = false,
  progressData,
  title,
  className,
}: StatsBarProps) {
  const totalProgress = progressData?.reduce((sum, seg) => sum + seg.value, 0) || 0;

  return (
    <div className={cn('rounded-xl border border-border/50 bg-card/50 p-4', className)}>
      {title && <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            {item.icon && (
              <span className={cn('text-muted-foreground', statusColors[item.status || 'neutral'])}>
                {item.icon}
              </span>
            )}
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className={cn('text-lg font-bold', statusColors[item.status || 'neutral'])}>
                {item.value}
              </span>
              {item.trend && item.trend !== 'neutral' && (
                <span className={trendColors[item.trend]}>
                  {item.trend === 'up' ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                </span>
              )}
            </div>
            {index < items.length - 1 && <span className="hidden text-border sm:inline">│</span>}
          </div>
        ))}
      </div>

      {showProgress && progressData && progressData.length > 0 && (
        <div className="mt-4">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
            {progressData.map((segment, index) => {
              const width = totalProgress > 0 ? (segment.value / totalProgress) * 100 : 0;
              return (
                <div
                  key={index}
                  className="transition-all duration-300"
                  style={{
                    width: `${width}%`,
                    backgroundColor: segment.color,
                  }}
                />
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            {progressData.map((segment, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: segment.color }} />
                <span className="text-xs text-muted-foreground">
                  {segment.label}{' '}
                  {totalProgress > 0 ? `${Math.round((segment.value / totalProgress) * 100)}%` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default StatsBar;
