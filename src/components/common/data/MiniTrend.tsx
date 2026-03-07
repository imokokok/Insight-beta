'use client';

import { cn } from '@/shared/utils';

export interface MiniTrendProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  color?: 'success' | 'error' | 'neutral';
  mode?: 'line' | 'arrow';
}

export function MiniTrend({
  data,
  width = 48,
  height = 20,
  className,
  color = 'neutral',
  mode = 'line',
}: MiniTrendProps) {
  if (!data || data.length < 2) {
    return null;
  }

  const colorClasses = {
    success: 'stroke-success',
    error: 'stroke-error',
    neutral: 'stroke-muted-foreground',
  };

  if (mode === 'arrow') {
    const firstValue = data[0];
    const lastValue = data[data.length - 1];
    if (firstValue === undefined || lastValue === undefined) {
      return null;
    }
    const trend = lastValue - firstValue;
    const isUp = trend > 0;
    const isNeutral = Math.abs(trend) < 0.01;

    if (isNeutral) {
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 48 20"
          className={cn('fill-none', className)}
        >
          <line
            x1="8"
            y1="10"
            x2="40"
            y2="10"
            className={cn('stroke-muted-foreground', 'stroke-2')}
            strokeLinecap="round"
          />
        </svg>
      );
    }

    const arrowColor = isUp ? 'stroke-success' : 'stroke-error';
    const path = isUp ? 'M24 16 L24 4 M18 10 L24 4 L30 10' : 'M24 4 L24 16 M18 10 L24 16 L30 10';

    return (
      <svg width={width} height={height} viewBox="0 0 48 20" className={cn('fill-none', className)}>
        <path
          d={path}
          className={cn(arrowColor, 'stroke-2')}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * (width - 4) + 2;
      const y = height - 2 - ((value - min) / range) * (height - 4);
      return `${x},${y}`;
    })
    .join(' ');

  // Calculate area points for gradient fill
  const areaPoints = `${2},${height - 2} ${points} ${width - 2},${height - 2}`;

  const fillColorClasses = {
    success: 'fill-success/20',
    error: 'fill-error/20',
    neutral: 'fill-muted-foreground/20',
  };

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn(className)}>
      <polygon points={areaPoints} className={cn(fillColorClasses[color])} />
      <polyline
        points={points}
        fill="none"
        className={cn(colorClasses[color], 'stroke-1.5')}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Start and end point indicators */}
      {data.map((_, index) => {
        if (index !== 0 && index !== data.length - 1) return null;
        const x = (index / (data.length - 1)) * (width - 4) + 2;
        const y = height - 2 - ((data[index] - min) / range) * (height - 4);
        return (
          <circle
            key={index}
            cx={x}
            cy={y}
            r={2}
            className={cn(colorClasses[color], 'fill-background')}
            strokeWidth={1.5}
          />
        );
      })}
    </svg>
  );
}

export default MiniTrend;
