'use client';

import * as React from 'react';

import { RefreshCw, Clock, Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

import { AutoRefreshControl } from '@/components/common/controls';
import { Button, StatusBadge } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';
import type { StatusType } from '@/types/common/status';

export interface TopStatusBarProps {
  healthStatus: StatusType;
  lastUpdated: string | Date;
  onRefresh: () => void;
  isRefreshing?: boolean;
  autoRefreshEnabled?: boolean;
  onAutoRefreshToggle?: () => void;
  autoRefreshInterval?: number;
  onAutoRefreshIntervalChange?: (interval: number) => void;
  timeUntilRefresh?: number;
  className?: string;
  showHealthDetails?: boolean;
  healthyCount?: number;
  warningCount?: number;
  criticalCount?: number;
}

const TopStatusBar = React.memo(function TopStatusBar({
  healthStatus,
  lastUpdated,
  onRefresh,
  isRefreshing = false,
  autoRefreshEnabled = false,
  onAutoRefreshToggle,
  autoRefreshInterval = 30000,
  onAutoRefreshIntervalChange,
  timeUntilRefresh = 0,
  className,
  showHealthDetails = false,
  healthyCount = 0,
  warningCount = 0,
  criticalCount = 0,
}: TopStatusBarProps) {
  const { t } = useI18n();

  const formatLastUpdated = (date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffSec < 60) {
      return t('common.time.justNow');
    }
    if (diffMin < 60) {
      return t('common.time.minutesAgo', { count: diffMin });
    }
    if (diffHour < 24) {
      return t('common.time.hoursAgo', { count: diffHour });
    }
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  };

  const healthConfig: Partial<
    Record<StatusType, { icon: React.ReactNode; color: string; bgColor: string }>
  > = {
    online: {
      icon: <CheckCircle className="h-4 w-4" />,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    success: {
      icon: <CheckCircle className="h-4 w-4" />,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    active: {
      icon: <Activity className="h-4 w-4" />,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    warning: {
      icon: <AlertTriangle className="h-4 w-4" />,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    critical: {
      icon: <XCircle className="h-4 w-4" />,
      color: 'text-error',
      bgColor: 'bg-error/10',
    },
    error: {
      icon: <XCircle className="h-4 w-4" />,
      color: 'text-error',
      bgColor: 'bg-error/10',
    },
    offline: {
      icon: <XCircle className="h-4 w-4" />,
      color: 'text-error',
      bgColor: 'bg-error/10',
    },
    stale: {
      icon: <Clock className="h-4 w-4" />,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    pending: {
      icon: <Clock className="h-4 w-4" />,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/30',
    },
    unknown: {
      icon: <Activity className="h-4 w-4" />,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/30',
    },
    inactive: {
      icon: <XCircle className="h-4 w-4" />,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/30',
    },
    resolved: {
      icon: <CheckCircle className="h-4 w-4" />,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    disputed: {
      icon: <AlertTriangle className="h-4 w-4" />,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    expired: {
      icon: <Clock className="h-4 w-4" />,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/30',
    },
    settled: {
      icon: <CheckCircle className="h-4 w-4" />,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  };

  const defaultConfig = {
    icon: <Activity className="h-4 w-4" />,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/30',
  };

  const config = healthConfig[healthStatus] || defaultConfig;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-4">
        <div className={cn('flex items-center gap-2 rounded-lg px-3 py-1.5', config.bgColor)}>
          <span className={config.color}>{config.icon}</span>
          <StatusBadge status={healthStatus} size="sm" />
        </div>

        {showHealthDetails && (healthyCount > 0 || warningCount > 0 || criticalCount > 0) && (
          <div className="flex items-center gap-3 text-sm">
            {healthyCount > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-success" />
                <span className="text-muted-foreground">{healthyCount}</span>
              </div>
            )}
            {warningCount > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-warning" />
                <span className="text-muted-foreground">{warningCount}</span>
              </div>
            )}
            {criticalCount > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-error" />
                <span className="text-muted-foreground">{criticalCount}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            {t('common.lastUpdated')}: {formatLastUpdated(lastUpdated)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onAutoRefreshToggle && onAutoRefreshIntervalChange && (
          <AutoRefreshControl
            isEnabled={autoRefreshEnabled}
            onToggle={onAutoRefreshToggle}
            interval={autoRefreshInterval}
            onIntervalChange={onAutoRefreshIntervalChange}
            timeUntilRefresh={timeUntilRefresh}
          />
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          <span className="hidden sm:inline">{t('common.refresh')}</span>
        </Button>
      </div>
    </div>
  );
});

TopStatusBar.displayName = 'TopStatusBar';

export { TopStatusBar };
