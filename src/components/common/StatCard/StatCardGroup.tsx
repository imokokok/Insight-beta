import { memo } from 'react';

import { cn } from '@/shared/utils';

import type { StatCardGroupProps, DashboardStatsSectionProps } from './types';

export const StatCardGroup = memo(function StatCardGroup({
  children,
  className,
  columns = 4,
  gap = 'md',
}: StatCardGroupProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  };

  const gapClass = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
  }[gap];

  return <div className={cn('grid', gridCols[columns], gapClass, className)}>{children}</div>;
});

export const DashboardStatsSection = memo(function DashboardStatsSection({
  title,
  description,
  children,
  className,
  icon,
  color = 'blue',
}: DashboardStatsSectionProps) {
  const colorConfig = {
    blue: { bg: 'bg-primary/5', border: 'border-primary/20', icon: 'text-primary' },
    green: { bg: 'bg-success/5', border: 'border-success/20', icon: 'text-success' },
    amber: { bg: 'bg-warning/5', border: 'border-warning/20', icon: 'text-warning' },
    purple: { bg: 'bg-primary/5', border: 'border-primary/20', icon: 'text-primary' },
    red: { bg: 'bg-error/5', border: 'border-error/20', icon: 'text-error' },
  }[color];

  return (
    <div className={cn('rounded-xl border p-4', colorConfig.bg, colorConfig.border, className)}>
      <div className="mb-4 flex items-center gap-2">
        {icon && <div className={cn('rounded-lg bg-card/50 p-1.5', colorConfig.icon)}>{icon}</div>}
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
});
