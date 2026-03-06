/**
 * RefreshRateSelector Component
 * 
 * 允许用户选择数据刷新频率
 */

'use client';

import { Clock } from 'lucide-react';

import { cn } from '@/shared/utils/ui';

export interface RefreshRateOption {
  value: number;
  label: string;
  description: string;
}

export const REFRESH_RATE_OPTIONS: RefreshRateOption[] = [
  { value: 5000, label: '5 秒', description: '实时' },
  { value: 10000, label: '10 秒', description: '快速' },
  { value: 30000, label: '30 秒', description: '标准' },
  { value: 60000, label: '60 秒', description: '省电' },
];

interface RefreshRateSelectorProps {
  currentRate: number;
  onChange: (rate: number) => void;
  className?: string;
}

export function RefreshRateSelector({
  currentRate,
  onChange,
  className,
}: RefreshRateSelectorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">刷新频率:</span>
      
      <div className="flex gap-1">
        {REFRESH_RATE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'px-2 py-1 text-xs rounded transition-colors',
              currentRate === option.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
            title={option.description}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
