import { Badge, Button } from '@/components/ui';
import { cn } from '@/shared/utils';

export type NetworkHealthStatus = 'healthy' | 'warning' | 'critical';

interface Api3TopStatusBarProps {
  healthStatus?: NetworkHealthStatus;
  isConnected?: boolean;
  lastUpdateTime?: Date | string;
  onRefresh?: () => void;
  isAutoRefreshEnabled?: boolean;
  onToggleAutoRefresh?: () => void;
  onExport?: () => void;
  className?: string;
}

const healthConfig: Record<NetworkHealthStatus, { label: string; color: string; bgColor: string }> =
  {
    healthy: {
      label: '健康',
      color: 'text-success',
      bgColor: 'bg-success/20',
    },
    warning: {
      label: '警告',
      color: 'text-warning',
      bgColor: 'bg-warning/20',
    },
    critical: {
      label: '异常',
      color: 'text-error',
      bgColor: 'bg-error/20',
    },
  };

export function Api3TopStatusBar({
  healthStatus = 'healthy',
  isConnected = true,
  lastUpdateTime,
  onRefresh,
  isAutoRefreshEnabled = true,
  onToggleAutoRefresh,
  onExport,
  className,
}: Api3TopStatusBarProps) {
  const config = healthConfig[healthStatus];

  const formatTime = (time: Date | string) => {
    const date = typeof time === 'string' ? new Date(time) : time;
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div
      className={cn(
        'flex h-12 items-center justify-between px-4 md:px-6',
        'border-b border-border/20',
        className,
      )}
    >
      <div className="flex items-center gap-4 md:gap-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">网络状态</span>
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
          <span className="text-sm font-medium text-muted-foreground">连接</span>
          <div className="flex items-center gap-1.5">
            <span className={cn('relative flex h-2 w-2', isConnected && 'animate-pulse')}>
              {isConnected && (
                <span
                  className={cn(
                    'absolute inline-flex h-full w-full rounded-full bg-success',
                    'animate-ping opacity-75',
                  )}
                />
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
              {isConnected ? '已连接' : '断开'}
            </span>
          </div>
        </div>

        {lastUpdateTime && (
          <div className="hidden items-center gap-2 md:flex">
            <span className="text-sm font-medium text-muted-foreground">更新于</span>
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
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span className="hidden sm:inline">{isAutoRefreshEnabled ? '自动' : '手动'}</span>
        </Button>

        <Button variant="outline" size="sm" onClick={onRefresh} className="gap-1.5 text-xs">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span className="hidden sm:inline">刷新</span>
        </Button>

        <Button variant="outline" size="sm" onClick={onExport} className="gap-1.5 text-xs">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span className="hidden sm:inline">导出</span>
        </Button>
      </div>
    </div>
  );
}

export default Api3TopStatusBar;
