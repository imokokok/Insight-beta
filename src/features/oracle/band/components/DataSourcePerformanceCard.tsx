'use client';

import { Clock, Zap, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

import { Badge } from '@/components/ui';
import { cn } from '@/shared/utils';

import type { DataSource } from '../types';

interface DataSourcePerformanceCardProps {
  source: DataSource;
  className?: string;
}

const getReliabilityColor = (score: number) => {
  if (score >= 99) return { bg: 'bg-emerald-500', text: 'text-emerald-500', bar: 'bg-emerald-500' };
  if (score >= 95) return { bg: 'bg-amber-500', text: 'text-amber-500', bar: 'bg-amber-500' };
  if (score >= 90) return { bg: 'bg-orange-500', text: 'text-orange-500', bar: 'bg-orange-500' };
  return { bg: 'bg-red-500', text: 'text-red-500', bar: 'bg-red-500' };
};

const getLatencyStatus = (latencyMs: number) => {
  if (latencyMs <= 100) return { label: '优秀', color: 'text-emerald-500' };
  if (latencyMs <= 500) return { label: '良好', color: 'text-amber-500' };
  if (latencyMs <= 1000) return { label: '一般', color: 'text-orange-500' };
  return { label: '较慢', color: 'text-red-500' };
};

const formatFrequency = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
};

const formatLatency = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

export function DataSourcePerformanceCard({ source, className }: DataSourcePerformanceCardProps) {
  const colors = getReliabilityColor(source.reliabilityScore);
  const latencyStatus = getLatencyStatus(source.lastUpdateLatency);
  const trendData = source.historicalReliability;
  const avgReliability =
    trendData.length > 0
      ? trendData.reduce((a, b) => a + b, 0) / trendData.length
      : source.reliabilityScore;
  const trendDirection =
    trendData.length >= 2 ? (trendData[trendData.length - 1] ?? 0) - (trendData[0] ?? 0) : 0;

  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-foreground">{source.name}</h4>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="secondary" size="sm">
              {source.symbol}
            </Badge>
            <Badge variant="outline" size="sm">
              {source.sourceType.toUpperCase()}
            </Badge>
          </div>
        </div>
        {source.anomalyCount > 0 && (
          <div className="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-1">
            <AlertTriangle className="h-3 w-3 text-red-500" />
            <span className="text-xs font-medium text-red-500">{source.anomalyCount}</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">可信度评分</span>
            <div className="flex items-center gap-1">
              <span className={cn('text-sm font-bold', colors.text)}>
                {source.reliabilityScore.toFixed(1)}%
              </span>
              {trendDirection !== 0 &&
                (trendDirection > 0 ? (
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                ))}
            </div>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full transition-all duration-500', colors.bar)}
              style={{ width: `${source.reliabilityScore}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 rounded-md bg-muted/30 p-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <div>
              <p className="text-[10px] text-muted-foreground">更新频率</p>
              <p className="font-mono text-sm font-medium">
                {formatFrequency(source.updateFrequency)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-muted/30 p-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-[10px] text-muted-foreground">最近延迟</p>
              <div className="flex items-center gap-1">
                <p className="font-mono text-sm font-medium">
                  {formatLatency(source.lastUpdateLatency)}
                </p>
                <span className={cn('text-[10px]', latencyStatus.color)}>
                  {latencyStatus.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">历史可靠性 (7天)</span>
            <span className="text-xs text-muted-foreground">
              均值: {avgReliability.toFixed(1)}%
            </span>
          </div>
          <div className="flex h-8 items-end gap-1">
            {trendData.map((value, index) => {
              const height = Math.max(10, (value / 100) * 100);
              const dayColor =
                value >= 99 ? 'bg-emerald-500' : value >= 95 ? 'bg-amber-500' : 'bg-red-500';
              return (
                <div
                  key={index}
                  className="flex flex-1 flex-col items-center gap-0.5"
                  title={`Day ${index + 1}: ${value.toFixed(1)}%`}
                >
                  <div
                    className={cn('w-full rounded-sm transition-all', dayColor)}
                    style={{ height: `${height}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-[9px] text-muted-foreground">7天前</span>
            <span className="text-[9px] text-muted-foreground">今天</span>
          </div>
        </div>
      </div>
    </div>
  );
}
