import * as React from 'react';

import { cn } from '@/shared/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  _ignored?: never;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm',
          'transition-all duration-200 ease-out',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-muted-foreground',
          'hover:border-primary/30 hover:shadow-md',
          'focus-visible:border-primary focus-visible:shadow-lg focus-visible:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
