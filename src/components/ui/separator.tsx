'use client';

import * as React from 'react';

import { cn } from '@/shared/utils';

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  decorative?: boolean;
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = 'horizontal', decorative: _decorative, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
        className,
      )}
      role={_decorative ? 'none' : undefined}
      {...props}
    />
  ),
);
Separator.displayName = 'Separator';

export { Separator };
