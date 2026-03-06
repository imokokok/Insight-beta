'use client';

import { memo } from 'react';

import { cn } from '@/shared/utils';

import type { TimeRange } from '../../types';

const TIME_RANGES: Array<{
  key: TimeRange;
  label: string;
  description: string;
}> = [
  { key: '1h', label: '1 小时', description: '最近 60 分钟' },
  { key: '24h', label: '24 小时', description: '最近 1 天' },
  { key: '7d', label: '7 天', description: '最近 1 周' },
  { key: '30d', label: '30 天', description: '最近 1 个月' },
  { key: '90d', label: '90 天', description: '最近 3 个月' },
];

export interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  className?: string;
  disabled?: boolean;
}

export const TimeRangeSelector = memo(function TimeRangeSelector({
  value,
  onChange,
  className,
  disabled = false,
}: TimeRangeSelectorProps) {
  return (
    <div
      className={cn(
        'inline-flex rounded-lg border border-border bg-muted p-1',
        className
      )}
      role="group"
      aria-label="时间范围选择"
    >
      {TIME_RANGES.map((range) => (
        <button
          key={range.key}
          type="button"
          disabled={disabled}
          onClick={() => onChange(range.key)}
          className={cn(
            'relative rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1',
            'disabled:pointer-events-none disabled:opacity-50',
            value === range.key
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
          aria-pressed={value === range.key}
          aria-label={range.description}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
});
