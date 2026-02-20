import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/shared/utils';

export type ProtocolHealthStatus = 'healthy' | 'warning' | 'critical';

interface ProtocolHealthBadgeProps {
  status: ProtocolHealthStatus;
  label?: string;
  showDot?: boolean;
  className?: string;
}

const healthConfig: Record<
  ProtocolHealthStatus,
  {
    defaultLabel: string;
    dotColor: string;
    variant: 'success' | 'warning' | 'danger';
  }
> = {
  healthy: {
    defaultLabel: '健康',
    dotColor: 'bg-success',
    variant: 'success',
  },
  warning: {
    defaultLabel: '警告',
    dotColor: 'bg-warning',
    variant: 'warning',
  },
  critical: {
    defaultLabel: '异常',
    dotColor: 'bg-error',
    variant: 'danger',
  },
};

const ProtocolHealthBadge = React.memo(function ProtocolHealthBadge({
  status,
  label,
  showDot = true,
  className,
}: ProtocolHealthBadgeProps) {
  const config = healthConfig[status];
  const displayLabel = label ?? config.defaultLabel;

  return (
    <Badge variant={config.variant} className={cn('gap-1.5', className)}>
      {showDot && (
        <span className="relative flex h-2 w-2">
          <span
            className={cn(
              'absolute inset-0 rounded-full opacity-75',
              config.dotColor,
              status === 'healthy' && 'animate-ping',
            )}
          />
          <span className={cn('relative rounded-full', config.dotColor)} />
        </span>
      )}
      {displayLabel}
    </Badge>
  );
});

export { ProtocolHealthBadge };
export type { ProtocolHealthBadgeProps };
