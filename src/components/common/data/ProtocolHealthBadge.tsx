import * as React from 'react';

import { Badge } from '@/components/ui';
import { useI18n } from '@/i18n';
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
    labelKey: string;
    dotColor: string;
    variant: 'success' | 'warning' | 'danger';
  }
> = {
  healthy: {
    labelKey: 'common.status.healthy',
    dotColor: 'bg-success',
    variant: 'success',
  },
  warning: {
    labelKey: 'common.status.warning',
    dotColor: 'bg-warning',
    variant: 'warning',
  },
  critical: {
    labelKey: 'common.status.critical',
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
  const { t } = useI18n();
  const config = healthConfig[status];
  const displayLabel = label ?? t(config.labelKey);

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
