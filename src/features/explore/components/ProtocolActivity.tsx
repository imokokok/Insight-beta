'use client';

import { TrendingUp, TrendingDown, Activity, Clock, ChevronRight, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/i18n';
import { cn, formatTime } from '@/shared/utils';

import type { ProtocolActivityItem } from '../hooks/useDataDiscovery';

interface ProtocolActivityProps {
  activities: ProtocolActivityItem[];
  isLoading?: boolean;
  onItemClick?: (item: ProtocolActivityItem) => void;
}

const protocolColors: Record<string, string> = {
  chainlink: 'text-blue-500',
  pyth: 'text-purple-500',
  redstone: 'text-orange-500',
  api3: 'text-green-500',
};

export function ProtocolActivity({ activities, isLoading, onItemClick }: ProtocolActivityProps) {
  const { lang } = useI18n();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            {lang === 'zh' ? '协议活跃度变化' : 'Protocol Activity Changes'}
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

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            {lang === 'zh' ? '协议活跃度变化' : 'Protocol Activity Changes'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Activity className="h-10 w-10 opacity-50" />
            <p className="mt-2">{lang === 'zh' ? '暂无活跃度变化' : 'No activity changes'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          {lang === 'zh' ? '协议活跃度变化' : 'Protocol Activity Changes'}
          <Badge variant="secondary" className="ml-auto">
            {activities.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.map((activity) => {
          const isIncrease = activity.changeType === 'increase';
          const ChangeIcon = isIncrease ? TrendingUp : TrendingDown;
          const protocolColor = protocolColors[activity.protocol.toLowerCase()] || 'text-gray-500';

          return (
            <button
              type="button"
              key={activity.id}
              onClick={() => onItemClick?.(activity)}
              className={cn(
                'group w-full cursor-pointer rounded-lg border p-4 text-left transition-all',
                'hover:shadow-md',
                isIncrease
                  ? 'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40'
                  : 'border-red-500/20 bg-red-500/5 hover:border-red-500/40',
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <ChangeIcon
                      className={cn('h-4 w-4', isIncrease ? 'text-emerald-500' : 'text-red-500')}
                    />
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        isIncrease
                          ? 'border-emerald-500/30 text-emerald-600'
                          : 'border-red-500/30 text-red-600',
                      )}
                    >
                      {isIncrease
                        ? lang === 'zh'
                          ? '活跃度上升'
                          : 'Activity Increase'
                        : lang === 'zh'
                          ? '活跃度下降'
                          : 'Activity Decrease'}
                    </Badge>
                    <Badge variant="outline" className={cn('text-xs', protocolColor)}>
                      {activity.protocol}
                    </Badge>
                  </div>

                  <p className="line-clamp-1 text-sm text-muted-foreground">
                    {activity.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(activity.timestamp)}
                    </div>
                    <span
                      className={cn(
                        'font-mono font-medium',
                        isIncrease ? 'text-emerald-500' : 'text-red-500',
                      )}
                    >
                      {isIncrease ? '+' : '-'}
                      {Math.abs(activity.changePercent).toFixed(1)}%
                    </span>
                    <span className="font-mono">
                      {activity.previousValue} → {activity.currentValue}
                    </span>
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
