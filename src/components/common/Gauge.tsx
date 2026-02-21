'use client';

import { memo } from 'react';

import { cn } from '@/shared/utils';

export interface GaugeProps {
  value: number;
  max?: number;
  label: string;
  subLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'auto' | 'success' | 'warning' | 'error' | 'primary';
  showValue?: boolean;
  unit?: string;
  className?: string;
}

const sizeConfig = {
  sm: { container: 'h-16 w-16', text: 'text-xs', value: 'text-sm' },
  md: { container: 'h-24 w-24', text: 'text-sm', value: 'text-lg' },
  lg: { container: 'h-32 w-32', text: 'text-base', value: 'text-xl' },
};

const colorMap = {
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  primary: '#3b82f6',
};

export const Gauge = memo(function Gauge({
  value,
  max = 100,
  label,
  subLabel,
  size = 'md',
  color = 'auto',
  showValue = true,
  unit = '%',
  className,
}: GaugeProps) {
  const config = sizeConfig[size];
  const percentage = Math.min((value / max) * 100, 100);
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  let strokeColor: string;
  if (color === 'auto') {
    if (percentage >= 80) {
      strokeColor = colorMap.success;
    } else if (percentage >= 60) {
      strokeColor = colorMap.warning;
    } else {
      strokeColor = colorMap.error;
    }
  } else {
    strokeColor = colorMap[color];
  }

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className={cn('relative', config.container)}>
        <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted/30"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('font-bold', config.value)}>
              {value}
              {unit}
            </span>
          </div>
        )}
      </div>
      <div className="mt-2 text-center">
        <p className={cn('font-medium text-foreground', config.text)}>{label}</p>
        {subLabel && <p className="text-xs text-muted-foreground">{subLabel}</p>}
      </div>
    </div>
  );
});

export default Gauge;
