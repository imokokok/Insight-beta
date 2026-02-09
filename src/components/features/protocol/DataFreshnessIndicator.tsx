'use client';

import { useMemo } from 'react';

import { Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

interface DataFreshnessIndicatorProps {
  lastUpdate: Date;
  className?: string;
  showLabel?: boolean;
  thresholds?: {
    fresh: number;    // seconds
    warning: number;  // seconds
    stale: number;    // seconds
  };
}

export function DataFreshnessIndicator({
  lastUpdate,
  className,
  showLabel = true,
  thresholds = { fresh: 60, warning: 300, stale: 600 }
}: DataFreshnessIndicatorProps) {
  const { t } = useI18n();

  const status = useMemo(() => {
    const seconds = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);
    
    if (seconds < thresholds.fresh) {
      return {
        level: 'fresh' as const,
        icon: CheckCircle,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        label: t('protocol:freshness.fresh'),
        description: t('protocol:freshness.freshDesc'),
        seconds
      };
    } else if (seconds < thresholds.warning) {
      return {
        level: 'warning' as const,
        icon: Clock,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        label: t('protocol:freshness.warning'),
        description: t('protocol:freshness.warningDesc'),
        seconds
      };
    } else if (seconds < thresholds.stale) {
      return {
        level: 'stale' as const,
        icon: AlertTriangle,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        label: t('protocol:freshness.stale'),
        description: t('protocol:freshness.staleDesc'),
        seconds
      };
    } else {
      return {
        level: 'expired' as const,
        icon: XCircle,
        color: 'text-rose-600',
        bgColor: 'bg-rose-50',
        borderColor: 'border-rose-200',
        label: t('protocol:freshness.expired'),
        description: t('protocol:freshness.expiredDesc'),
        seconds
      };
    }
  }, [lastUpdate, thresholds, t]);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  const Icon = status.icon;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn(
        'flex items-center gap-1.5 rounded-full border px-2.5 py-1',
        status.bgColor,
        status.borderColor
      )}>
        <Icon className={cn('h-3.5 w-3.5', status.color)} />
        <span className={cn('text-xs font-medium', status.color)}>
          {formatTime(status.seconds)}
        </span>
      </div>
      {showLabel && (
        <span className={cn('text-xs', status.color)}>
          {status.label}
        </span>
      )}
    </div>
  );
}

interface DataFreshnessBadgeProps {
  lastUpdate: Date;
  className?: string;
}

export function DataFreshnessBadge({ lastUpdate, className }: DataFreshnessBadgeProps) {
  const { t } = useI18n();
  
  const seconds = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);
  
  let config = {
    color: 'bg-emerald-100 text-emerald-800',
    label: t('protocol:freshness.fresh')
  };
  
  if (seconds >= 600) {
    config = { color: 'bg-rose-100 text-rose-800', label: t('protocol:freshness.expired') };
  } else if (seconds >= 300) {
    config = { color: 'bg-orange-100 text-orange-800', label: t('protocol:freshness.stale') };
  } else if (seconds >= 60) {
    config = { color: 'bg-amber-100 text-amber-800', label: t('protocol:freshness.warning') };
  }

  return (
    <Badge className={cn(config.color, className)}>
      {config.label}
    </Badge>
  );
}
