'use client';

import { useMemo, useState } from 'react';

import { Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

type FreshnessLevel = 'fresh' | 'warning' | 'stale' | 'expired' | 'updating';

interface DataFreshnessIndicatorProps {
  /** 最后更新时间（兼容两种参数名） */
  lastUpdated?: Date | null;
  lastUpdate?: Date | null;
  /** 自定义类名 */
  className?: string;
  /** 是否显示标签 */
  showLabel?: boolean;
  /** 过期阈值（秒）- 兼容旧版 */
  staleThreshold?: number;
  /** 多级阈值配置 */
  thresholds?: {
    fresh: number; // seconds
    warning: number; // seconds
    stale: number; // seconds
  };
}

export function DataFreshnessIndicator({
  lastUpdated,
  lastUpdate,
  className,
  showLabel = false,
  staleThreshold = 300,
  thresholds = { fresh: 60, warning: 300, stale: 600 },
}: DataFreshnessIndicatorProps) {
  const { t } = useI18n();

  // 兼容两种参数名
  const effectiveLastUpdate = lastUpdate ?? lastUpdated;

  const status = useMemo(() => {
    if (!effectiveLastUpdate) {
      return {
        level: 'expired' as FreshnessLevel,
        icon: XCircle,
        color: 'text-rose-600',
        bgColor: 'bg-rose-50',
        borderColor: 'border-rose-200',
        label: t('protocol:freshness.expired'),
        description: t('protocol:freshness.expiredDesc'),
        seconds: Infinity,
      };
    }

    const seconds = Math.floor((Date.now() - effectiveLastUpdate.getTime()) / 1000);

    // 使用多级阈值或旧版阈值
    const effectiveThresholds =
      staleThreshold !== 300
        ? { fresh: 5, warning: staleThreshold, stale: staleThreshold }
        : thresholds;

    if (seconds < effectiveThresholds.fresh) {
      return {
        level: 'fresh' as FreshnessLevel,
        icon: CheckCircle,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        label: t('protocol:freshness.fresh'),
        description: t('protocol:freshness.freshDesc'),
        seconds,
      };
    } else if (seconds < effectiveThresholds.warning) {
      return {
        level: 'warning' as FreshnessLevel,
        icon: Clock,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        label: t('protocol:freshness.warning'),
        description: t('protocol:freshness.warningDesc'),
        seconds,
      };
    } else if (seconds < effectiveThresholds.stale) {
      return {
        level: 'stale' as FreshnessLevel,
        icon: AlertTriangle,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        label: t('protocol:freshness.stale'),
        description: t('protocol:freshness.staleDesc'),
        seconds,
      };
    } else {
      return {
        level: 'expired' as FreshnessLevel,
        icon: XCircle,
        color: 'text-rose-600',
        bgColor: 'bg-rose-50',
        borderColor: 'border-rose-200',
        label: t('protocol:freshness.expired'),
        description: t('protocol:freshness.expiredDesc'),
        seconds,
      };
    }
  }, [effectiveLastUpdate, staleThreshold, thresholds, t]);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  const Icon = status.icon;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium transition-colors',
          status.bgColor,
          status.borderColor,
        )}
      >
        <Icon
          className={cn('h-3 w-3', status.color, status.level === 'updating' && 'animate-spin')}
        />
        <span className={status.color}>
          {showLabel ? status.label : formatTime(status.seconds)}
        </span>
      </div>
      {showLabel && <span className={cn('text-xs', status.color)}>{status.label}</span>}
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
    label: t('protocol:freshness.fresh'),
  };

  if (seconds >= 600) {
    config = { color: 'bg-rose-100 text-rose-800', label: t('protocol:freshness.expired') };
  } else if (seconds >= 300) {
    config = { color: 'bg-amber-100 text-amber-800', label: t('protocol:freshness.stale') };
  } else if (seconds >= 60) {
    config = { color: 'bg-amber-100 text-amber-800', label: t('protocol:freshness.warning') };
  }

  return <Badge className={cn(config.color, className)}>{config.label}</Badge>;
}

// Hook to manage data freshness
export function useDataFreshness() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const markUpdating = () => setIsUpdating(true);
  const markUpdated = () => {
    setIsUpdating(false);
    setLastUpdated(new Date());
  };
  const markStale = () => setIsUpdating(false);

  return {
    lastUpdated,
    isUpdating,
    markUpdating,
    markUpdated,
    markStale,
  };
}
