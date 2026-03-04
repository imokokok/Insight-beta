'use client';

import type { ComponentPropsWithoutRef } from 'react';
import { forwardRef } from 'react';

import { cn } from '@/shared/utils';

export interface ListContainerProps extends ComponentPropsWithoutRef<'div'> {
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg';
}

export const ListContainer = forwardRef<HTMLDivElement, ListContainerProps>(
  ({ style, children, className, gap = 'md', padding = 'none', ...props }, ref) => {
    const gapClasses = {
      xs: 'space-y-1',
      sm: 'space-y-2',
      md: 'space-y-3',
      lg: 'space-y-4',
      xl: 'space-y-6',
    };

    const paddingClasses = {
      none: '',
      xs: 'p-1',
      sm: 'p-2',
      md: 'p-3',
      lg: 'p-4',
    };

    return (
      <div
        ref={ref}
        {...props}
        style={style}
        className={cn(gapClasses[gap], paddingClasses[padding], className)}
      >
        {children}
      </div>
    );
  },
);

ListContainer.displayName = 'ListContainer';
