import React from 'react';

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
    sm: 'space-y-2',
    md: 'space-y-4',
    lg: 'space-y-6',
    xl: 'space-y-8',
  };

  return (
    <div className={cn(className)} {...props}>
      {(title || description) && (
        <div className="mb-4">
          {title && <h3 className="text-sm font-medium text-foreground">{title}</h3>}
          {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
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
  return (
    <section className={cn('mb-6', className)} {...props}>
      {(title || description || action) && (
        <div className="mb-4 flex items-start justify-between">
          <div>
            {title && typeof title === 'string' ? (
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            ) : (
              title
            )}
            {description && typeof description === 'string' ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
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
  gap?: 'sm' | 'md' | 'lg';
}

export function ContentGrid({
  children,
  columns = 4,
  gap = 'md',
  className,
  ...props
}: ContentGridProps) {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  };

  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
  };

  return (
    <div className={cn('grid', columnClasses[columns], gapClasses[gap], className)} {...props}>
      {children}
    </div>
  );
}
