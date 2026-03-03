'use client';

import { Activity } from 'lucide-react';

import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { useI18n } from '@/i18n/LanguageProvider';
import { cn } from '@/shared/utils';

type HealthStatus = 'healthy' | 'warning' | 'critical';

const healthStatusConfig: Record<HealthStatus, { label: string; color: string; bgColor: string }> =
  {
    healthy: {
      label: 'alerts.statusLabels.healthy',
      color: 'text-success',
      bgColor: 'bg-success/20',
    },
    warning: {
      label: 'alerts.statusLabels.warning',
      color: 'text-warning',
      bgColor: 'bg-warning/20',
    },
    critical: {
      label: 'alerts.statusLabels.critical',
      color: 'text-error',
      bgColor: 'bg-error/20',
    },
  };

interface TopStatusBarProps {
  healthStatus: HealthStatus;
  isConnected: boolean;
  lastUpdateTime?: Date | null;
  onRefresh?: () => void;
  isAutoRefreshEnabled?: boolean;
  onToggleAutoRefresh?: () => void;
  onExport?: () => void;
  isRefreshing?: boolean;
}

export function TopStatusBar({
  healthStatus,
  isConnected,
  lastUpdateTime,
  onRefresh,
  isAutoRefreshEnabled,
  onToggleAutoRefresh,
  onExport,
  isRefreshing,
}: TopStatusBarProps) {
  const { t } = useI18n();
  const config = healthStatusConfig[healthStatus];

  const formatTime = (time: Date) => {
    return time.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="flex h-12 items-center justify-between border-b border-border/20 px-4 sm:px-6">
      <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {t('alerts.systemStatus')}
          </span>
          <Badge variant="outline" className={cn('gap-1.5 border-0', config.bgColor, config.color)}>
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                config.color.replace('text-', 'bg-'),
                healthStatus === 'healthy' && 'animate-pulse',
              )}
            />
            {config.label}
          </Badge>
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <span className="text-sm font-medium text-muted-foreground">
            {t('alerts.connection')}
          </span>
          <div className="flex items-center gap-1.5">
            <span className={cn('relative flex h-2 w-2', isConnected && 'animate-pulse')}>
              {isConnected && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              )}
              <span
                className={cn(
                  'relative inline-flex h-2 w-2 rounded-full',
                  isConnected ? 'bg-success' : 'bg-error',
                )}
              />
            </span>
            <span
              className={cn('text-xs font-medium', isConnected ? 'text-success' : 'text-error')}
            >
              {isConnected
                ? t('common.connectionStatus.connected')
                : t('common.connectionStatus.disconnected')}
            </span>
          </div>
        </div>

        {lastUpdateTime && (
          <div className="hidden items-center gap-2 lg:flex">
            <span className="text-sm font-medium text-muted-foreground">
              {t('alerts.updatedAt')}
            </span>
            <span className="font-mono text-xs text-foreground">{formatTime(lastUpdateTime)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleAutoRefresh}
          className={cn(
            'gap-1.5 text-xs',
            isAutoRefreshEnabled ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <Activity className="h-4 w-4" />
          <span className="hidden sm:inline">
            {isAutoRefreshEnabled ? t('alerts.autoMode') : t('alerts.manualMode')}
          </span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="gap-1.5 text-xs"
        >
          <Activity className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          <span className="hidden sm:inline">{t('alerts.refreshBtn')}</span>
        </Button>

        <Button variant="outline" size="sm" onClick={onExport} className="gap-1.5 text-xs">
          <Activity className="h-4 w-4" />
          <span className="hidden sm:inline">{t('alerts.exportBtn')}</span>
        </Button>
      </div>
    </div>
  );
}
