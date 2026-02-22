'use client';

import { memo } from 'react';

import { cn } from '@/shared/utils';

export interface InlineDataItem {
  label: string;
  value: string | number | React.ReactNode;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  status?: 'healthy' | 'warning' | 'critical' | 'neutral';
  suffix?: string;
  prefix?: string;
}

export interface InlineDataDisplayProps {
  items: InlineDataItem[];
  columns?: 2 | 3 | 4 | 6;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
  showDividers?: boolean;
  compact?: boolean;
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

const trendIcons = {
  up: '↑',
  down: '↓',
  neutral: '→',
};

export const InlineDataDisplay = memo(function InlineDataDisplay({
  items,
  columns = 4,
  gap = 'md',
  className,
  showDividers = true,
  compact = false,
}: InlineDataDisplayProps) {
  const columnClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  };

  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  return (
    <div className={cn('rounded-xl border border-border/30 bg-card/30 p-4', className)}>
      <div className={cn('grid', columnClasses[columns], gapClasses[gap])}>
        {items.map((item, index) => (
          <div
            key={index}
            className={cn(
              'flex flex-col',
              compact ? 'py-1' : 'py-2',
              showDividers &&
                index < items.length - 1 &&
                'border-r border-border/20 last:border-r-0',
              showDividers && columns === 4 && index % 4 !== 3 && 'sm:border-r',
            )}
          >
            <div className="flex items-center gap-1.5">
              {item.icon && (
                <span
                  className={cn('text-muted-foreground', statusColors[item.status || 'neutral'])}
                >
                  {item.icon}
                </span>
              )}
              <span
                className={cn(
                  'text-xs',
                  compact ? 'text-muted-foreground' : 'text-sm text-muted-foreground',
                )}
              >
                {item.label}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              {item.prefix && <span className="text-sm text-muted-foreground">{item.prefix}</span>}
              <span
                className={cn(
                  'font-semibold',
                  compact ? 'text-base' : 'text-lg',
                  statusColors[item.status || 'neutral'],
                )}
              >
                {item.value}
              </span>
              {item.suffix && <span className="text-sm text-muted-foreground">{item.suffix}</span>}
              {item.trend && (
                <span className={cn('text-xs font-medium', trendColors[item.trend])}>
                  {trendIcons[item.trend]}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export interface InlineDataRowProps {
  items: InlineDataItem[];
  className?: string;
  separator?: string;
}

export const InlineDataRow = memo(function InlineDataRow({
  items,
  className,
  separator = '│',
}: InlineDataRowProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1', className)}>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1.5">
          {item.icon && (
            <span className={cn('text-muted-foreground', statusColors[item.status || 'neutral'])}>
              {item.icon}
            </span>
          )}
          <span className="text-sm text-muted-foreground">{item.label}</span>
          <span className={cn('font-semibold', statusColors[item.status || 'neutral'])}>
            {item.prefix}
            {item.value}
            {item.suffix}
          </span>
          {item.trend && (
            <span className={cn('text-xs font-medium', trendColors[item.trend])}>
              {trendIcons[item.trend]}
            </span>
          )}
          {index < items.length - 1 && separator && (
            <span className="text-border">{separator}</span>
          )}
        </div>
      ))}
    </div>
  );
});

export default InlineDataDisplay;
