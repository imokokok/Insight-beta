'use client';

import { useState, useCallback } from 'react';

import { HelpCircle } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/shared/utils';

interface HelpTooltipProps {
  content: string;
  title?: string;
  className?: string;
  iconClassName?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  trigger?: 'hover' | 'click';
}

export function HelpTooltip({
  content,
  title,
  className,
  iconClassName,
  side = 'top',
  trigger = 'hover',
}: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = useCallback(() => {
    if (trigger === 'click') {
      setIsOpen(!isOpen);
    }
  }, [trigger, isOpen]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (trigger === 'hover') {
        setIsOpen(open);
      }
    },
    [trigger]
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip open={isOpen} onOpenChange={handleOpenChange}>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            className={cn(
              'inline-flex items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20',
              className
            )}
          >
            <HelpCircle className={cn('h-4 w-4', iconClassName)} />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          className="max-w-xs border-border/50 bg-popover/95 backdrop-blur-sm"
          sideOffset={8}
        >
          <div className="space-y-1">
            {title && (
              <p className="text-sm font-medium text-foreground">{title}</p>
            )}
            <p className="text-xs text-muted-foreground">{content}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface HelpIconProps {
  className?: string;
}

export function HelpIcon({ className }: HelpIconProps) {
  return (
    <HelpCircle className={cn('h-4 w-4 text-muted-foreground', className)} />
  );
}
