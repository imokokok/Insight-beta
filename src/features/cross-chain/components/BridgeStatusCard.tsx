'use client';

import { memo } from 'react';

import {
  Network,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  DollarSign,
  Activity,
} from 'lucide-react';

import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { cn } from '@/shared/utils';

import type { BridgeStatus, BridgeSummary } from '../types';

interface BridgeStatusCardProps {
  bridges?: BridgeStatus[];
  summary?: BridgeSummary;
  isLoading?: boolean;
}

const STATUS_CONFIG: Record<
  string,
  { icon: typeof CheckCircle; color: string; bg: string; label: string }
> = {
  healthy: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-500/10', label: '正常' },
  degraded: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bg: 'bg-yellow-500/10',
    label: '降级',
  },
  offline: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-500/10', label: '离线' },
};

function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatVolume(volume: number): string {
  if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
  if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`;
  return `$${volume}`;
}

export const BridgeStatusCard = memo(function BridgeStatusCard({
  bridges,
  summary,
  isLoading,
}: BridgeStatusCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-1 h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!bridges || bridges.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            跨链桥状态
          </CardTitle>
          <CardDescription>暂无跨链桥数据</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            <Network className="mx-auto h-8 w-8 opacity-50" />
            <p className="mt-2">无法获取跨链桥状态</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              跨链桥状态
            </CardTitle>
            <CardDescription>监控 {bridges.length} 个主流跨链桥</CardDescription>
          </div>
          {summary && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1 bg-green-500/10">
                <CheckCircle className="h-3 w-3 text-green-600" />
                {summary.healthy} 正常
              </Badge>
              {summary.degraded > 0 && (
                <Badge variant="outline" className="gap-1 bg-yellow-500/10">
                  <AlertTriangle className="h-3 w-3 text-yellow-600" />
                  {summary.degraded} 降级
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {bridges.map((bridge) => {
            const config = STATUS_CONFIG[bridge.status];
            if (!config) return null;
            const StatusIcon = config.icon;

            return (
              <div
                key={bridge.name}
                className={cn(
                  'rounded-lg border p-3 transition-colors',
                  config.bg,
                  bridge.status === 'offline' && 'border-red-500/30',
                  bridge.status === 'degraded' && 'border-yellow-500/30',
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">{bridge.displayName}</span>
                  <StatusIcon className={cn('h-4 w-4', config.color)} />
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      延迟
                    </span>
                    <span
                      className={cn(
                        'font-mono',
                        bridge.latencyMs > 5000 && 'text-yellow-600',
                        bridge.latencyMs > 10000 && 'text-red-600',
                      )}
                    >
                      {formatLatency(bridge.latencyMs)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      手续费
                    </span>
                    <span className="font-mono">{bridge.feePercent}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      24h量
                    </span>
                    <span className="font-mono">{formatVolume(bridge.volume24h)}</span>
                  </div>
                </div>
                {bridge.alerts.length > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-yellow-600">
                    <AlertTriangle className="h-3 w-3" />
                    {bridge.alerts[0]}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {summary && (
          <div className="mt-4 flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>平均延迟: {formatLatency(summary.avgLatencyMs)}</span>
              <span>24h 总交易量: {formatVolume(summary.totalVolume24h)}</span>
            </div>
            <span>
              更新于:{' '}
              {bridges[0]?.lastUpdated
                ? new Date(bridges[0].lastUpdated).toLocaleTimeString()
                : '-'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
