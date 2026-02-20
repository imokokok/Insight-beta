import { memo, useMemo } from 'react';

import { Sparkline, CHART_COLORS } from '@/components/charts';
import { Card, CardContent } from '@/components/ui/card';
import { cn, formatChangePercent, formatTimeAgo } from '@/shared/utils';

import { TrendingUp, TrendingDown, statusConfig, colorConfig } from './config';
import { StatCardCompact } from './StatCardCompact';
import { StatCardDetailed } from './StatCardDetailed';
import { StatCardInteractive } from './StatCardInteractive';
import { StatCardSkeleton } from './StatCardSkeleton';

import type { StatCardProps, SparklineData } from './types';

export const StatCard = memo(function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
  trend,
  sparkline,
  sparklineData,
  status = 'neutral',
  variant = 'default',
  size = 'md',
  loading = false,
  lastUpdated,
  className,
  onClick,
  actions,
  tooltip,
  comparison,
  extra,
}: StatCardProps) {
  const config = color ? colorConfig[color] : statusConfig[status];

  const sparklineWithData: SparklineData | undefined =
    sparkline || (sparklineData ? { data: sparklineData } : undefined);

  const trendDisplay = useMemo(() => {
    if (!trend) return null;
    const { value: trendValue, isPositive, label } = trend;
    const trendColor = isPositive ? 'text-success' : 'text-error';
    const Icon = isPositive ? TrendingUp : TrendingDown;

    return (
      <div className="flex items-center gap-1.5">
        <Icon className={cn('h-3.5 w-3.5', trendColor)} />
        <span className={cn('text-xs font-semibold', trendColor)}>
          {formatChangePercent(trendValue / 100, 1, false)}
        </span>
        {label && <span className="text-xs text-gray-400">{label}</span>}
      </div>
    );
  }, [trend]);

  if (loading) {
    return <StatCardSkeleton size={size} />;
  }

  if (variant === 'compact') {
    return (
      <StatCardCompact
        title={title}
        value={value}
        icon={icon}
        trend={trend}
        className={className}
        onClick={onClick}
        config={config}
        status={status}
        color={color}
        subtitle={subtitle}
        sparkline={sparkline}
        sparklineData={sparklineData}
        size={size}
        loading={loading}
        lastUpdated={lastUpdated}
        actions={actions}
        tooltip={tooltip}
        comparison={comparison}
        extra={extra}
      />
    );
  }

  if (variant === 'detailed') {
    return (
      <StatCardDetailed
        title={title}
        value={value}
        subtitle={subtitle}
        icon={icon}
        trend={trend}
        sparkline={sparkline}
        sparklineData={sparklineData}
        className={className}
        onClick={onClick}
        actions={actions}
        tooltip={tooltip}
        comparison={comparison}
        extra={extra}
        lastUpdated={lastUpdated}
        config={config}
        status={status}
        color={color}
        size={size}
        loading={loading}
      />
    );
  }

  if (variant === 'interactive') {
    return (
      <StatCardInteractive
        title={title}
        value={value}
        subtitle={subtitle}
        icon={icon}
        trend={trend}
        sparkline={sparkline}
        sparklineData={sparklineData}
        className={className}
        onClick={onClick}
        config={config}
        status={status}
        color={color}
        size={size}
        loading={loading}
        lastUpdated={lastUpdated}
        actions={actions}
        tooltip={tooltip}
        comparison={comparison}
        extra={extra}
      />
    );
  }

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md',
        className,
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div className={cn('rounded-lg p-2', config.bg, config.text)}>{icon || config.icon}</div>
        </div>

        <div className="mb-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-foreground">{value}</span>
          {subtitle && <span className="text-sm text-muted-foreground">{subtitle}</span>}
        </div>

        {trendDisplay && <div>{trendDisplay}</div>}

        {sparklineWithData && (
          <div className="mt-3">
            <Sparkline
              data={sparklineWithData.data}
              color={sparklineWithData.color || CHART_COLORS.primary.DEFAULT}
              showArea={sparklineWithData.showArea}
              width={120}
              height={30}
            />
          </div>
        )}

        {lastUpdated && <p className="mt-2 text-xs text-gray-400">{formatTimeAgo(lastUpdated)}</p>}
      </CardContent>
    </Card>
  );
});

export default StatCard;
