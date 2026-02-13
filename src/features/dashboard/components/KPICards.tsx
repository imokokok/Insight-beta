'use client';

import type { ReactNode } from 'react';

import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

import { AnimatedNumber, PriceChangeIndicator } from '@/components/common/AnimatedNumber';
import { HoverCard } from '@/components/common/PageTransitions';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/shared/utils';

export interface KPIData {
  id: string;
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  color?: 'blue' | 'green' | 'amber' | 'purple' | 'rose';
  trend?: 'up' | 'down' | 'neutral';
  previousValue?: number;
  format?: 'number' | 'currency' | 'percent' | 'compact';
}

interface KPICardProps {
  data: KPIData;
  loading?: boolean;
  className?: string;
  animated?: boolean;
}

export function KPICard({ data, loading, className, animated = true }: KPICardProps) {
  const iconBgClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    purple: 'bg-primary/10 text-primary',
    rose: 'bg-rose-100 text-rose-600',
  };

  const TrendIcon = data.trend === 'up' ? TrendingUp : data.trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    data.trend === 'up'
      ? 'text-emerald-600'
      : data.trend === 'down'
        ? 'text-rose-600'
        : 'text-muted-foreground';

  // Parse numeric value for animation
  const numericValue =
    typeof data.value === 'string' ? parseFloat(data.value.replace(/[^0-9.-]/g, '')) : data.value;
  const isNumeric = !isNaN(numericValue);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const cardContent = (
    <Card className={cn('overflow-hidden transition-all hover:shadow-md', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{data.title}</p>
            <div className="flex items-baseline gap-2">
              {animated && isNumeric ? (
                <AnimatedNumber
                  value={numericValue}
                  format={data.format || 'number'}
                  decimals={2}
                  className="text-3xl font-bold tracking-tight"
                  showDiff={false}
                />
              ) : (
                <span className="text-3xl font-bold tracking-tight">{data.value}</span>
              )}
              {data.unit && <span className="text-sm text-muted-foreground">{data.unit}</span>}
            </div>
            {data.change !== undefined && (
              <div className={cn('flex items-center gap-1 text-sm', trendColor)}>
                {data.previousValue !== undefined && animated ? (
                  <PriceChangeIndicator
                    currentPrice={numericValue}
                    previousPrice={data.previousValue}
                    showPercentage={true}
                  />
                ) : (
                  <>
                    <TrendIcon className="h-4 w-4" />
                    <span>
                      {data.change > 0 ? '+' : ''}
                      {data.change}%
                    </span>
                  </>
                )}
                {data.changeLabel && (
                  <span className="text-muted-foreground">{data.changeLabel}</span>
                )}
              </div>
            )}
          </div>
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full',
              iconBgClasses[data.color || 'blue'],
            )}
          >
            {data.icon || <Activity className="h-6 w-6" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return animated ? (
    <HoverCard hoverScale={1.02} hoverY={-4}>
      {cardContent}
    </HoverCard>
  ) : (
    cardContent
  );
}
