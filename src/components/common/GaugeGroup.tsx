'use client';

import { memo } from 'react';

import { cn } from '@/shared/utils';

import { Gauge } from './Gauge';

import type { GaugeProps } from './Gauge';

export interface GaugeGroupProps {
  title?: string;
  description?: string;
  gauges: Array<Omit<GaugeProps, 'size'> & { size?: GaugeProps['size'] }>;
  progressItems?: Array<{
    label: string;
    value: number;
    max?: number;
    color?: string;
  }>;
  layout?: 'horizontal' | 'vertical' | 'grid';
  className?: string;
}

export const GaugeGroup = memo(function GaugeGroup({
  title,
  description,
  gauges,
  progressItems,
  layout = 'horizontal',
  className,
}: GaugeGroupProps) {
  const layoutClasses = {
    horizontal: 'flex flex-wrap items-start justify-center gap-6',
    vertical: 'flex flex-col items-center gap-6',
    grid: 'grid gap-6 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('rounded-xl border border-border/50 bg-card/30 p-6', className)}>
      {(title || description) && (
        <div className="mb-6">
          {title && <h3 className="text-lg font-semibold text-foreground">{title}</h3>}
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
      )}

      <div className={layoutClasses[layout]}>
        {gauges.map((gauge, index) => (
          <Gauge key={index} {...gauge} size={gauge.size || 'md'} />
        ))}
      </div>

      {progressItems && progressItems.length > 0 && (
        <div className="mt-6 space-y-4">
          {progressItems.map((item, index) => {
            const percentage = item.max ? (item.value / item.max) * 100 : item.value;
            return (
              <div key={index}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-medium text-foreground">
                    {item.value}
                    {item.max ? `/${item.max}` : '%'}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${Math.min(percentage, 100)}%`,
                      backgroundColor: item.color || 'hsl(var(--primary))',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default GaugeGroup;
