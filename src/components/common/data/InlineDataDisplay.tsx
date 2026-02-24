'use client';

import { memo } from 'react';

import { STATUS_TEXT_COLORS, TREND_COLORS } from '@/lib/design-system/tokens/colors';
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

const trendIcons = {
  up: '↑',
  down: '↓',
  neutral: '→',
};

const getDividerClasses = (index: number, total: number, columns: 2 | 3 | 4 | 6): string => {
  if (index >= total - 1) return '';

  switch (columns) {
    case 2:
      return index % 2 === 0 ? 'border-r border-border/20' : '';
    case 3:
      return index % 3 !== 2 ? 'sm:border-r sm:border-border/20' : '';
    case 4: {
      const isMobileRowEnd = index % 2 === 1;
      const isSmRowEnd = index % 4 === 3;
      if (isMobileRowEnd && isSmRowEnd) return '';
      if (isMobileRowEnd) return 'sm:border-r sm:border-border/20';
      if (isSmRowEnd) return 'border-r border-border/20 sm:border-r-0';
      return 'border-r border-border/20';
    }
    case 6: {
      const isMobileRowEnd = index % 2 === 1;
      const isSmRowEnd = index % 3 === 2;
      const isLgRowEnd = index % 6 === 5;
      if (isMobileRowEnd && isSmRowEnd && isLgRowEnd) return '';
      if (isMobileRowEnd && isSmRowEnd) return 'lg:border-r lg:border-border/20';
      if (isMobileRowEnd && isLgRowEnd) return 'sm:border-r sm:border-border/20 lg:border-r-0';
      if (isSmRowEnd && isLgRowEnd) return 'border-r border-border/20 sm:border-r-0';
      if (isMobileRowEnd) return 'sm:border-r sm:border-border/20';
      if (isSmRowEnd) return 'border-r border-border/20 lg:border-r lg:border-border/20';
      if (isLgRowEnd) return 'border-r border-border/20 sm:border-r lg:border-r-0';
      return 'border-r border-border/20';
    }
    default:
      return '';
  }
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
              showDividers && getDividerClasses(index, items.length, columns),
            )}
          >
            <div className="flex items-center gap-1.5">
              {item.icon && (
                <span
                  className={cn(
                    'text-muted-foreground',
                    STATUS_TEXT_COLORS[item.status || 'neutral'],
                  )}
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
                  STATUS_TEXT_COLORS[item.status || 'neutral'],
                )}
              >
                {item.value}
              </span>
              {item.suffix && <span className="text-sm text-muted-foreground">{item.suffix}</span>}
              {item.trend && (
                <span className={cn('text-xs font-medium', TREND_COLORS[item.trend])}>
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
            <span
              className={cn('text-muted-foreground', STATUS_TEXT_COLORS[item.status || 'neutral'])}
            >
              {item.icon}
            </span>
          )}
          <span className="text-sm text-muted-foreground">{item.label}</span>
          <span className={cn('font-semibold', STATUS_TEXT_COLORS[item.status || 'neutral'])}>
            {item.prefix}
            {item.value}
            {item.suffix}
          </span>
          {item.trend && (
            <span className={cn('text-xs font-medium', TREND_COLORS[item.trend])}>
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
