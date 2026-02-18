'use client';

import React, { useMemo } from 'react';

import { Area, AreaChart, Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';

import { cn } from '@/shared/utils';

export interface MiniChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
  className?: string;
  showGradient?: boolean;
}

export const MiniChart = React.memo(function MiniChart({
  data,
  width = 120,
  height = 40,
  color = '#10b981',
  showArea = true,
  className,
  showGradient = true,
}: MiniChartProps) {
  const chartData = useMemo(() => {
    return data.map((value, index) => ({
      value,
      index,
    }));
  }, [data]);

  const { minValue, maxValue } = useMemo(() => {
    if (data.length === 0) return { minValue: 0, maxValue: 1 };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const padding = (max - min) * 0.1 || 0.01;
    return { minValue: min - padding, maxValue: max + padding };
  }, [data]);

  const trend = useMemo(() => {
    if (data.length < 2) return 'neutral';
    const first = data[0];
    const last = data[data.length - 1];
    if (first === undefined || last === undefined) return 'neutral';
    if (last > first * 1.001) return 'up';
    if (last < first * 0.999) return 'down';
    return 'neutral';
  }, [data]);

  const chartColor = useMemo(() => {
    if (trend === 'up') return '#10b981';
    if (trend === 'down') return '#ef4444';
    return color;
  }, [trend, color]);

  if (!data || data.length === 0) {
    return (
      <div
        className={cn('flex items-center justify-center text-xs text-muted-foreground', className)}
        style={{ width, height }}
      >
        -
      </div>
    );
  }

  const gradientId = `miniChartGradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={cn('relative', className)} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        {showArea ? (
          <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColor} stopOpacity={showGradient ? 0.3 : 0} />
                <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis domain={[minValue, maxValue]} hide />
            <Area
              type="monotone"
              dataKey="value"
              stroke={chartColor}
              strokeWidth={1.5}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
            />
          </AreaChart>
        ) : (
          <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <YAxis domain={[minValue, maxValue]} hide />
            <Line
              type="monotone"
              dataKey="value"
              stroke={chartColor}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
});

export interface MiniChartWithTrendProps extends MiniChartProps {
  showTrendIndicator?: boolean;
  percentageChange?: number;
}

export const MiniChartWithTrend = React.memo(function MiniChartWithTrend({
  data,
  showTrendIndicator = true,
  percentageChange,
  ...props
}: MiniChartWithTrendProps) {
  const trend = useMemo(() => {
    if (percentageChange !== undefined) {
      if (percentageChange > 0.001) return 'up';
      if (percentageChange < -0.001) return 'down';
      return 'neutral';
    }
    if (data.length < 2) return 'neutral';
    const first = data[0];
    const last = data[data.length - 1];
    if (first === undefined || last === undefined) return 'neutral';
    if (last > first * 1.001) return 'up';
    if (last < first * 0.999) return 'down';
    return 'neutral';
  }, [data, percentageChange]);

  const displayPercentage = useMemo(() => {
    if (percentageChange !== undefined) return percentageChange * 100;
    if (data.length < 2) return 0;
    const first = data[0];
    const last = data[data.length - 1];
    if (first === undefined || last === undefined || first === 0) return 0;
    return ((last - first) / first) * 100;
  }, [data, percentageChange]);

  return (
    <div className="flex items-center gap-2">
      <MiniChart data={data} {...props} />
      {showTrendIndicator && (
        <span
          className={cn(
            'text-xs font-medium',
            trend === 'up' && 'text-emerald-600',
            trend === 'down' && 'text-red-600',
            trend === 'neutral' && 'text-muted-foreground',
          )}
        >
          {trend === 'up' && '+'}
          {displayPercentage.toFixed(2)}%
        </span>
      )}
    </div>
  );
});
