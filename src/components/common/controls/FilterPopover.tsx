'use client';

import * as React from 'react';

import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui';
import { cn } from '@/shared/utils';

export interface FilterPopoverProps {
  icon?: React.ReactNode;
  label: string;
  count?: number;
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
  disabled?: boolean;
  popoverClassName?: string;
  onOpenChange?: (open: boolean) => void;
}

const FilterPopover = React.forwardRef<HTMLButtonElement, FilterPopoverProps>(
  (
    {
      icon,
      label,
      count,
      children,
      className,
      align = 'start',
      disabled = false,
      popoverClassName,
      onOpenChange,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);

    const handleOpenChange = React.useCallback(
      (newOpen: boolean) => {
        setOpen(newOpen);
        onOpenChange?.(newOpen);
      },
      [onOpenChange],
    );

    const hasActiveFilters = count !== undefined && count > 0;

    return (
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            disabled={disabled}
            className={cn(
              'h-9 gap-1.5 px-3 text-sm font-medium transition-all duration-200',
              'border-border/50 bg-card/50 backdrop-blur-sm',
              'hover:border-primary/30 hover:bg-primary/5',
              hasActiveFilters && 'border-primary/40 bg-primary/5 text-primary',
              className,
            )}
          >
            {icon && <span className="flex-shrink-0 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
            <span className="truncate">{label}</span>
            {hasActiveFilters && (
              <Badge
                variant="default"
                className="ml-0.5 flex h-5 min-w-[20px] items-center justify-center px-1.5 text-[10px] font-bold"
              >
                {count}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn(
            'w-72 border-border/50 bg-card/95 backdrop-blur-xl',
            'shadow-lg shadow-primary/5',
            popoverClassName,
          )}
          align={align}
          sideOffset={8}
        >
          {children}
        </PopoverContent>
      </Popover>
    );
  },
);

FilterPopover.displayName = 'FilterPopover';

export { FilterPopover };
