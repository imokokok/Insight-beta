'use client';

import { AlertTriangle, TrendingUp, Activity, Clock, ChevronRight } from 'lucide-react';

import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { getSeverityConfig } from '@/features/alerts/constants';
import { useI18n } from '@/i18n';
import { cn, formatTime } from '@/shared/utils';

import type { AnomalyPatternItem } from '../hooks/useDataDiscovery';

const anomalyTypeConfig = {
  price_spike: {
    icon: TrendingUp,
    label: 'Price Spike',
    labelZh: '价格突变',
  },
  deviation: {
    icon: AlertTriangle,
    label: 'Deviation',
    labelZh: '偏差异常',
  },
  delay: {
    icon: Clock,
    label: 'Update Delay',
    labelZh: '更新延迟',
  },
};

interface AnomalyPatternProps {
  anomalies: AnomalyPatternItem[];
  isLoading?: boolean;
  onItemClick?: (item: AnomalyPatternItem) => void;
}

export function AnomalyPattern({ anomalies, isLoading, onItemClick }: AnomalyPatternProps) {
  const { lang } = useI18n();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            {lang === 'zh' ? '异常模式检测' : 'Anomaly Pattern Detection'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!anomalies || anomalies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            {lang === 'zh' ? '异常模式检测' : 'Anomaly Pattern Detection'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Activity className="h-10 w-10 opacity-50" />
            <p className="mt-2">{lang === 'zh' ? '暂无异常检测' : 'No anomalies detected'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          {lang === 'zh' ? '异常模式检测' : 'Anomaly Pattern Detection'}
          <Badge variant="secondary" className="ml-auto">
            {anomalies.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {anomalies.map((anomaly) => {
          const severity = getSeverityConfig(anomaly.severity);
          const typeConfig = anomalyTypeConfig[anomaly.anomalyType] || anomalyTypeConfig.deviation;
          const TypeIcon = typeConfig.icon;

          return (
            <button
              type="button"
              key={anomaly.id}
              onClick={() => onItemClick?.(anomaly)}
              className={cn(
                'group w-full cursor-pointer rounded-lg border p-4 text-left transition-all',
                'hover:shadow-md',
                severity.borderColor,
                severity.bgColor,
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <TypeIcon className={cn('h-4 w-4', severity.iconColor)} />
                    <Badge variant={severity.badgeVariant}>
                      {lang === 'zh' ? typeConfig.labelZh : typeConfig.label}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {anomaly.severity.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{anomaly.symbol}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">{anomaly.protocol}</span>
                  </div>

                  <p className="line-clamp-1 text-sm text-muted-foreground">
                    {anomaly.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(anomaly.timestamp)}
                    </div>
                    {anomaly.percentageChange !== undefined && (
                      <span className={cn('font-mono font-medium', severity.color)}>
                        {anomaly.percentageChange > 0 ? '+' : ''}
                        {anomaly.percentageChange.toFixed(2)}%
                      </span>
                    )}
                    {anomaly.value !== undefined && anomaly.threshold !== undefined && (
                      <span className="font-mono">
                        {anomaly.value.toFixed(4)} / {anomaly.threshold.toFixed(4)}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
