'use client';

import * as React from 'react';

import { cn } from '@/shared/utils';

export interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
  showDivider?: boolean;
}

const FilterBar = React.forwardRef<HTMLDivElement, FilterBarProps>(
  ({ children, className, showDivider = false }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-wrap items-center gap-2',
          showDivider && 'divide-x divide-border/50',
          className,
        )}
      >
        {children}
      </div>
    );
  },
);

FilterBar.displayName = 'FilterBar';

export { FilterBar };
