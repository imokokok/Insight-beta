import * as React from 'react';

import { cn } from '@/shared/utils';

export interface StatusIndicatorProps {
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

const STATUS_COLORS = {
  healthy: {
    bg: 'bg-[#22C55E]',
    ring: 'rgba(34, 197, 94, 0.4)',
  },
  warning: {
    bg: 'bg-[#F59E0B]',
    ring: 'rgba(245, 158, 11, 0.4)',
  },
  critical: {
    bg: 'bg-[#EF4444]',
    ring: 'rgba(239, 68, 68, 0.4)',
  },
  unknown: {
    bg: 'bg-[#6B7280]',
    ring: 'rgba(107, 114, 128, 0.4)',
  },
} as const;

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
  const colors = STATUS_COLORS[status];
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
