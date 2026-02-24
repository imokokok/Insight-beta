import * as React from 'react';

import { STATUS_INDICATOR_COLORS } from '@/lib/design-system/tokens/colors';
import { cn } from '@/shared/utils';

export interface StatusIndicatorProps {
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: {
    dot: 'h-1.5 w-1.5',
    ring: 'inset-[-2px]',
  },
  md: {
    dot: 'h-2 w-2',
    ring: 'inset-[-3px]',
  },
  lg: {
    dot: 'h-2.5 w-2.5',
    ring: 'inset-[-4px]',
  },
} as const;

const StatusIndicator = React.memo(function StatusIndicator({
  status,
  size = 'md',
  pulse = false,
  className,
}: StatusIndicatorProps) {
  const colors = STATUS_INDICATOR_COLORS[status];
  const sizes = SIZE_MAP[size];
  const shouldPulse = pulse && status === 'healthy';

  return (
    <span className={cn('relative inline-flex', sizes.dot, className)}>
      {shouldPulse && (
        <span
          className={cn('absolute animate-ping rounded-full', sizes.ring)}
          style={{ backgroundColor: colors.ring }}
        />
      )}
      <span className={cn('relative rounded-full', colors.bg, shouldPulse && 'animate-pulse')} />
    </span>
  );
});

StatusIndicator.displayName = 'StatusIndicator';

export { StatusIndicator };
