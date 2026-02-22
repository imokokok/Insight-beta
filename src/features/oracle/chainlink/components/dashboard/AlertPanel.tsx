import * as React from 'react';

import { cn } from '@/shared/utils';

export interface AlertPanelProps {
  alerts: Array<{
    id: string;
    type: 'critical' | 'warning' | 'info';
    category: 'heartbeat' | 'deviation' | 'other';
    message: string;
    timestamp: string;
    details?: string;
  }>;
  maxVisible?: number;
  loading?: boolean;
}

const TYPE_CONFIG: Record<
  string,
  {
    icon: React.ReactNode;
    bgClass: string;
    borderClass: string;
    textClass: string;
    label: string;
  }
> = {
  critical: {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
    bgClass: 'bg-[#EF4444]/10',
    borderClass: 'border-l-[#EF4444]',
    textClass: 'text-[#EF4444]',
    label: '严重',
  },
  warning: {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    bgClass: 'bg-[#F59E0B]/10',
    borderClass: 'border-l-[#F59E0B]',
    textClass: 'text-[#F59E0B]',
    label: '警告',
  },
  info: {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    bgClass: 'bg-[#3B82F6]/10',
    borderClass: 'border-l-[#3B82F6]',
    textClass: 'text-[#3B82F6]',
    label: '信息',
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  heartbeat: 'Heartbeat',
  deviation: '偏差触发',
  other: '其他',
};

const TYPE_PRIORITY: Record<string, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

function AlertItem({
  alert,
  isExpanded,
  onToggle,
}: {
  alert: AlertPanelProps['alerts'][0];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const config = TYPE_CONFIG[alert.type] ?? TYPE_CONFIG.info!;

  return (
    <div
      className={cn(
        'rounded border-l-2 bg-card/40 transition-all duration-200',
        config.borderClass,
        isExpanded && 'bg-card/60',
      )}
    >
      <button onClick={onToggle} className="flex w-full items-start gap-2 p-2 text-left">
        <span className={cn('mt-0.5 flex-shrink-0', config.textClass)}>{config.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'rounded px-1 py-0.5 text-xs font-medium',
                    config.bgClass,
                    config.textClass,
                  )}
                >
                  {config.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {CATEGORY_LABELS[alert.category]}
                </span>
              </div>
              <p className="mt-1 text-sm text-foreground">{alert.message}</p>
            </div>
            <span className="flex-shrink-0 text-xs text-muted-foreground">{alert.timestamp}</span>
          </div>
        </div>
        {alert.details && (
          <svg
            className={cn(
              'h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200',
              isExpanded && 'rotate-180',
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {isExpanded && alert.details && (
        <div className="border-t border-border/20 px-2 pb-2 pl-9">
          <p className="text-xs leading-relaxed text-muted-foreground">{alert.details}</p>
        </div>
      )}
    </div>
  );
}

function AlertSkeleton() {
  return (
    <div className="rounded border-l-2 border-l-muted/30 bg-card/40 p-2">
      <div className="flex items-start gap-2">
        <div className="h-4 w-4 animate-pulse rounded bg-muted/30" />
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-10 animate-pulse rounded bg-muted/30" />
            <div className="h-3 w-16 animate-pulse rounded bg-muted/30" />
          </div>
          <div className="mt-1 h-4 w-3/4 animate-pulse rounded bg-muted/30" />
        </div>
        <div className="h-3 w-12 animate-pulse rounded bg-muted/30" />
      </div>
    </div>
  );
}

const AlertPanel = React.memo(function AlertPanel({
  alerts,
  maxVisible = 5,
  loading = false,
}: AlertPanelProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const sortedAlerts = React.useMemo(() => {
    return [...alerts]
      .sort((a, b) => (TYPE_PRIORITY[a.type] ?? 99) - (TYPE_PRIORITY[b.type] ?? 99))
      .slice(0, maxVisible);
  }, [alerts, maxVisible]);

  const criticalCount = alerts.filter((a) => a.type === 'critical').length;
  const warningCount = alerts.filter((a) => a.type === 'warning').length;

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="rounded border border-border/30 bg-card/60 p-3 backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">告警面板</h3>
        <div className="flex items-center gap-2 text-xs">
          {criticalCount > 0 && (
            <span className="rounded bg-[#EF4444]/10 px-1.5 py-0.5 font-medium text-[#EF4444]">
              {criticalCount} 严重
            </span>
          )}
          {warningCount > 0 && (
            <span className="rounded bg-[#F59E0B]/10 px-1.5 py-0.5 font-medium text-[#F59E0B]">
              {warningCount} 警告
            </span>
          )}
          {criticalCount === 0 && warningCount === 0 && (
            <span className="text-muted-foreground">无告警</span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          Array.from({ length: maxVisible }).map((_, i) => <AlertSkeleton key={i} />)
        ) : sortedAlerts.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">暂无告警信息</div>
        ) : (
          sortedAlerts.map((alert) => (
            <AlertItem
              key={alert.id}
              alert={alert}
              isExpanded={expandedId === alert.id}
              onToggle={() => handleToggle(alert.id)}
            />
          ))
        )}
      </div>
    </div>
  );
});

AlertPanel.displayName = 'AlertPanel';

export { AlertPanel };
