'use client';

import { useMemo } from 'react';
import { Gauge, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

interface DeviationGaugeProps {
  deviation: number; // percentage
  threshold?: number;
  symbol?: string;
  loading?: boolean;
  className?: string;
}

export function DeviationGauge({
  deviation,
  threshold = 2,
  symbol,
  loading,
  className,
}: DeviationGaugeProps) {
  const { t } = useI18n();

  const config = useMemo(() => {
    const absDeviation = Math.abs(deviation);
    if (absDeviation < 0.5) {
      return {
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        icon: CheckCircle,
        label: t('dashboard:gauge.normal'),
        description: t('dashboard:gauge.normalDesc'),
        severity: 'low' as const,
      };
    } else if (absDeviation < threshold) {
      return {
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        icon: Info,
        label: t('dashboard:gauge.elevated'),
        description: t('dashboard:gauge.elevatedDesc'),
        severity: 'medium' as const,
      };
    } else {
      return {
        color: 'text-rose-600',
        bgColor: 'bg-rose-50',
        borderColor: 'border-rose-200',
        icon: AlertTriangle,
        label: t('dashboard:gauge.critical'),
        description: t('dashboard:gauge.criticalDesc'),
        severity: 'high' as const,
      };
    }
  }, [deviation, threshold, t]);

  // Calculate gauge rotation (-90 to 90 degrees)
  const maxDeviation = 10; // 10% max for gauge
  const clampedDeviation = Math.max(-maxDeviation, Math.min(maxDeviation, deviation));
  const rotation = (clampedDeviation / maxDeviation) * 90;

  const Icon = config.icon;

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gauge className="h-5 w-5" />
          {t('dashboard:gauge.title')}
          {symbol && <Badge variant="outline">{symbol}</Badge>}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col items-center">
        {/* Gauge Visualization */}
        <div className="relative h-[180px] w-[240px]">
          <svg viewBox="0 0 240 180" className="h-full w-full">
            {/* Background arc */}
            <path
              d="M 30 150 A 90 90 0 0 1 210 150"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="20"
              strokeLinecap="round"
            />

            {/* Colored zones */}
            <path
              d="M 30 150 A 90 90 0 0 1 75 71"
              fill="none"
              stroke="#10b981"
              strokeWidth="20"
              strokeLinecap="round"
              opacity="0.3"
            />
            <path
              d="M 75 71 A 90 90 0 0 1 120 60"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="20"
              strokeLinecap="round"
              opacity="0.3"
            />
            <path
              d="M 120 60 A 90 90 0 0 1 165 71"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="20"
              strokeLinecap="round"
              opacity="0.3"
            />
            <path
              d="M 165 71 A 90 90 0 0 1 210 150"
              fill="none"
              stroke="#ef4444"
              strokeWidth="20"
              strokeLinecap="round"
              opacity="0.3"
            />

            {/* Needle */}
            <g
              transform={`rotate(${rotation}, 120, 150)`}
              style={{ transition: 'transform 0.5s ease-out' }}
            >
              <line
                x1="120"
                y1="150"
                x2="120"
                y2="70"
                stroke={config.color.replace('text-', '').replace('-600', '-500')}
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="120" cy="150" r="8" fill={config.color.replace('text-', '').replace('-600', '-500')} />
            </g>

            {/* Labels */}
            <text x="30" y="170" textAnchor="middle" className="fill-slate-400 text-xs">
              -10%
            </text>
            <text x="120" y="55" textAnchor="middle" className="fill-slate-400 text-xs">
              0%
            </text>
            <text x="210" y="170" textAnchor="middle" className="fill-slate-400 text-xs">
              +10%
            </text>
          </svg>

          {/* Center value */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
            <div className={cn('text-3xl font-bold', config.color)}>
              {deviation > 0 ? '+' : ''}
              {deviation.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Status */}
        <div
          className={cn(
            'mt-4 flex items-center gap-2 rounded-lg border px-4 py-2',
            config.bgColor,
            config.borderColor
          )}
        >
          <Icon className={cn('h-5 w-5', config.color)} />
          <div>
            <div className={cn('font-medium', config.color)}>{config.label}</div>
            <div className="text-xs opacity-70">{config.description}</div>
          </div>
        </div>

        {/* Threshold indicator */}
        <div className="mt-4 text-center text-xs text-muted-foreground">
          {t('dashboard:gauge.threshold')}: ±{threshold}%
        </div>
      </CardContent>
    </Card>
  );
}
