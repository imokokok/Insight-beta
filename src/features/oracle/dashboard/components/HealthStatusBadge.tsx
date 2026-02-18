'use client';

import { Shield, AlertTriangle, AlertCircle } from 'lucide-react';

import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

interface HealthStatusBadgeProps {
  activeAlerts: number;
  isConnected: boolean;
}

const getHealthStatus = (activeAlerts: number, isConnected: boolean) => {
  if (!isConnected) return 'incident';
  if (activeAlerts === 0) return 'online';
  if (activeAlerts <= 3) return 'degraded';
  return 'incident';
};

export function HealthStatusBadge({ activeAlerts, isConnected }: HealthStatusBadgeProps) {
  const status = getHealthStatus(activeAlerts, isConnected);
  const { t } = useI18n();
  const statusConfig = {
    online: {
      label: t('common.healthStatus.online'),
      icon: <Shield className="h-4 w-4" />,
      bgColor: 'bg-success/20',
      textColor: 'text-success-dark',
      borderColor: 'border-success/30',
      dotColor: 'bg-success',
      description: t('common.healthStatus.allOperational'),
    },
    degraded: {
      label: t('common.healthStatus.degraded'),
      icon: <AlertTriangle className="h-4 w-4" />,
      bgColor: 'bg-warning/20',
      textColor: 'text-warning-dark',
      borderColor: 'border-warning/30',
      dotColor: 'bg-warning',
      description: `${activeAlerts}${activeAlerts > 1 ? t('common.healthStatus.activeAlerts') : t('common.healthStatus.activeAlert')}`,
    },
    incident: {
      label: t('common.healthStatus.incident'),
      icon: <AlertCircle className="h-4 w-4" />,
      bgColor: 'bg-error/20',
      textColor: 'text-error-dark',
      borderColor: 'border-error/30',
      dotColor: 'bg-error',
      description: !isConnected
        ? t('common.healthStatus.connectionLost')
        : `${activeAlerts}${activeAlerts > 1 ? t('common.healthStatus.criticalAlerts') : t('common.healthStatus.criticalAlert')}`,
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2 transition-all duration-200 hover:shadow-md',
        config.bgColor,
        config.borderColor,
      )}
    >
      <div className={cn('flex-shrink-0', config.textColor)}>{config.icon}</div>
      <div className="flex flex-col">
        <span className={cn('text-xs font-semibold uppercase tracking-wide', config.textColor)}>
          {config.label}
        </span>
        <span className={cn('text-[10px] opacity-80', config.textColor)}>{config.description}</span>
      </div>
      <div className="relative ml-1 flex h-2.5 w-2.5">
        <span
          className={cn(
            'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
            config.dotColor,
          )}
        />
        <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', config.dotColor)} />
      </div>
    </div>
  );
}
