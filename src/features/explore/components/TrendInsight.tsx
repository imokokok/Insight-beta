'use client';

import { TrendingUp, TrendingDown, Activity, Clock, ChevronRight, BarChart3 } from 'lucide-react';

import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn, formatTime } from '@/shared/utils';

import type { TrendInsightItem } from '../hooks/useDataDiscovery';

const trendTypeConfig = {
  continuous_rise: {
    icon: TrendingUp,
    label: 'Continuous Rise',
    labelZh: '连续上涨',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
  continuous_fall: {
    icon: TrendingDown,
    label: 'Continuous Fall',
    labelZh: '连续下跌',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  volatility_change: {
    icon: BarChart3,
    label: 'Volatility Change',
    labelZh: '波动率变化',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
};

interface TrendInsightProps {
  insights: TrendInsightItem[];
  isLoading?: boolean;
  onItemClick?: (item: TrendInsightItem) => void;
}

export function TrendInsight({ insights, isLoading, onItemClick }: TrendInsightProps) {
  const { lang } = useI18n();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            {lang === 'zh' ? '趋势洞察' : 'Trend Insights'}
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

  if (!insights || insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            {lang === 'zh' ? '趋势洞察' : 'Trend Insights'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Activity className="h-10 w-10 opacity-50" />
            <p className="mt-2">{lang === 'zh' ? '暂无趋势洞察' : 'No trend insights'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          {lang === 'zh' ? '趋势洞察' : 'Trend Insights'}
          <Badge variant="secondary" className="ml-auto">
            {insights.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight) => {
          const typeConfig =
            trendTypeConfig[insight.trendType] || trendTypeConfig.volatility_change;
          const TypeIcon = typeConfig.icon;
          const isPositive = insight.changePercent > 0;

          return (
            <button
              type="button"
              key={insight.id}
              onClick={() => onItemClick?.(insight)}
              className={cn(
                'group w-full cursor-pointer rounded-lg border p-4 text-left transition-all',
                'hover:shadow-md',
                typeConfig.borderColor,
                typeConfig.bgColor,
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <TypeIcon className={cn('h-4 w-4', typeConfig.color)} />
                    <Badge variant="outline" className="text-xs">
                      {lang === 'zh' ? typeConfig.labelZh : typeConfig.label}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {insight.duration}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{insight.symbol}</span>
                  </div>

                  <p className="line-clamp-1 text-sm text-muted-foreground">
                    {insight.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(insight.timestamp)}
                    </div>
                    <span
                      className={cn(
                        'font-mono font-medium',
                        isPositive ? 'text-emerald-500' : 'text-red-500',
                      )}
                    >
                      {isPositive ? '+' : ''}
                      {insight.changePercent.toFixed(2)}%
                    </span>
                    {insight.volatilityScore !== undefined && (
                      <span className="font-mono text-purple-500">
                        Vol: {insight.volatilityScore.toFixed(2)}
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
