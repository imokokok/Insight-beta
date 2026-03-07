import React from 'react';

import { useDensity } from '@/components/common/controls/DensityProvider';
import { cn } from '@/shared/utils';

export interface ContentGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  divided?: boolean;
  title?: string;
  description?: string;
}

export function ContentGroup({
  children,
  gap = 'md',
  divided = false,
  title,
  description,
  className,
  ...props
}: ContentGroupProps) {
  const gapClasses = {
    sm: 'space-y-3',
    md: 'space-y-4',
    lg: 'space-y-5',
    xl: 'space-y-6',
  };

  return (
    <div className={cn('py-4', className)} {...props}>
      {(title || description) && (
        <div className="mb-3 border-b border-border/20 pb-2">
          {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
      )}
      <div
        className={cn(
          gapClasses[gap],
          divided &&
            '[&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:border-border/30 [&>*:not(:last-child)]:pb-4',
        )}
      >
        {children}
      </div>
    </div>
  );
}

export interface ContentSectionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  children: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export function ContentSection({
  children,
  title,
  description,
  action,
  className,
  ...props
}: ContentSectionProps) {
  const { config } = useDensity();

  return (
    <section
      className={cn('py-3', className)}
      style={{ paddingTop: config.spacing.md, paddingBottom: config.spacing.md }}
      {...props}
    >
      {(title || description || action) && (
        <div
          className="mb-2 flex items-start justify-between border-b border-border/20 pb-2"
          style={{ marginBottom: config.spacing.sm }}
        >
          <div>
            {title && typeof title === 'string' ? (
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            ) : (
              title
            )}
            {description && typeof description === 'string' ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            ) : (
              description
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export interface ContentGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4 | 6;
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg';
  densityAware?: boolean;
}

export function ContentGrid({
  children,
  columns = 4,
  gap = 'sm',
  densityAware = true,
  className,
  ...props
}: ContentGridProps) {
  const { config } = useDensity();

  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  };

  const gapClasses = {
    none: 'gap-0',
    xs: 'gap-1',
    sm: densityAware ? 'gap-2' : 'gap-2',
    md: densityAware ? 'gap-3' : 'gap-3',
    lg: densityAware ? 'gap-4' : 'gap-4',
  };

  const gapValue = densityAware ? { padding: config.gap.grid } : {};

  return (
    <div
      className={cn('grid', columnClasses[columns], gapClasses[gap], className)}
      style={gapValue}
      {...props}
    >
      {children}
    </div>
  );
}
