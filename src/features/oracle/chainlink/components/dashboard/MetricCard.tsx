import * as React from 'react';

import { cn } from '@/shared/utils';

import { StatusIndicator } from './StatusIndicator';

export interface MetricCardProps {
  label: string;
  value: number | string;
  trend?: 'up' | 'down' | 'neutral';
  changePercent?: number;
  status?: 'healthy' | 'warning' | 'critical';
  icon?: React.ReactNode;
  prefix?: string;
  suffix?: string;
  className?: string;
  loading?: boolean;
  flashOnUpdate?: boolean;
}

const TREND_CONFIG = {
  up: {
    icon: '↑',
    color: 'text-[#22C55E]',
    flashClass: 'animate-flash-green',
  },
  down: {
    icon: '↓',
    color: 'text-[#EF4444]',
    flashClass: 'animate-flash-red',
  },
  neutral: {
    icon: '→',
    color: 'text-muted-foreground',
    flashClass: '',
  },
} as const;

const STATUS_BORDER_COLORS = {
  healthy: 'border-l-[#22C55E]',
  warning: 'border-l-[#F59E0B]',
  critical: 'border-l-[#EF4444]',
} as const;

const MetricCard = React.memo(function MetricCard({
  label,
  value,
  trend = 'neutral',
  changePercent,
  status,
  icon,
  prefix,
  suffix,
  className,
  loading = false,
  flashOnUpdate = true,
}: MetricCardProps) {
  const [previousValue, setPreviousValue] = React.useState(value);
  const [flashClass, setFlashClass] = React.useState<string>('');

  React.useEffect(() => {
    if (!flashOnUpdate || previousValue === value) return;

    if (trend === 'up') {
      setFlashClass('animate-flash-green');
    } else if (trend === 'down') {
      setFlashClass('animate-flash-red');
    }

    const timer = setTimeout(() => setFlashClass(''), 800);
    setPreviousValue(value);

    return () => clearTimeout(timer);
  }, [value, trend, flashOnUpdate, previousValue]);

  const trendConfig = TREND_CONFIG[trend];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded border border-border/30 bg-card/60 p-3 backdrop-blur-sm transition-all duration-200',
        'hover:border-border/50 hover:bg-card/80',
        status && ['border-l-2', STATUS_BORDER_COLORS[status]],
        className,
      )}
    >
      <div
        className={cn('absolute inset-0 rounded transition-opacity duration-300', flashClass)}
        style={{ opacity: flashClass ? 1 : 0 }}
      />

      <div className="relative z-10">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <div className="flex items-center gap-1.5">
            {status && <StatusIndicator status={status} size="sm" pulse={status === 'healthy'} />}
            {icon && <span className="text-muted-foreground">{icon}</span>}
          </div>
        </div>

        <div className="flex items-baseline gap-1">
          {loading ? (
            <div className="h-7 w-20 animate-pulse rounded bg-muted/30" />
          ) : (
            <>
              {prefix && <span className="text-base text-muted-foreground">{prefix}</span>}
              <span className="font-mono text-2xl font-semibold tracking-tight text-foreground">
                {value}
              </span>
              {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
            </>
          )}
        </div>

        {changePercent !== undefined && !loading && (
          <div className="mt-1.5 flex items-center gap-1">
            <span className={cn('text-xs font-medium', trendConfig.color)}>{trendConfig.icon}</span>
            <span className={cn('text-xs font-medium', trendConfig.color)}>
              {Math.abs(changePercent).toFixed(2)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

MetricCard.displayName = 'MetricCard';

export { MetricCard };
