'use client';

import { Activity, Clock, Zap, TrendingUp, AlertTriangle } from 'lucide-react';

import { Badge } from '@/components/ui';
import { Card, CardContent } from '@/components/ui';

import type { DataSource } from '../types';

interface DataSourcePerformanceCardProps {
  source: DataSource;
}

export function DataSourcePerformanceCard({ source }: DataSourcePerformanceCardProps) {
  const getReliabilityColor = (score: number): string => {
    if (score >= 99) return 'text-emerald-600';
    if (score >= 95) return 'text-amber-600';
    return 'text-red-600';
  };

  const getReliabilityBg = (score: number): string => {
    if (score >= 99) return 'bg-emerald-50';
    if (score >= 95) return 'bg-amber-50';
    return 'bg-red-50';
  };

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardContent className="p-0">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Reliability Score */}
          <div className={`rounded-lg ${getReliabilityBg(source.reliabilityScore)} p-4`}>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">可靠性评分</span>
            </div>
            <div className={`mt-2 text-2xl font-bold ${getReliabilityColor(source.reliabilityScore)}`}>
              {source.reliabilityScore.toFixed(1)}%
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {source.reliabilityScore >= 99 ? '优秀' : source.reliabilityScore >= 95 ? '良好' : '需关注'}
            </div>
          </div>

          {/* Update Frequency */}
          <div className="rounded-lg bg-blue-50 p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">更新频率</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-blue-600">
              {source.updateFrequency.toFixed(1)}
              <span className="text-sm font-normal text-muted-foreground">/h</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              每 {Math.round(3600 / source.updateFrequency)} 秒更新
            </div>
          </div>

          {/* Last Update Latency */}
          <div className="rounded-lg bg-purple-50 p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">更新延迟</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-purple-600">
              {source.lastUpdateLatency}
              <span className="text-sm font-normal text-muted-foreground">ms</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {source.lastUpdateLatency < 1000 ? '快速' : source.lastUpdateLatency < 3000 ? '正常' : '较慢'}
            </div>
          </div>

          {/* Anomaly Count */}
          <div className={`rounded-lg ${source.anomalyCount > 0 ? 'bg-red-50' : 'bg-emerald-50'} p-4`}>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">异常次数</span>
            </div>
            <div className={`mt-2 text-2xl font-bold ${source.anomalyCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {source.anomalyCount}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {source.anomalyCount > 0 ? (
                <span className="flex items-center gap-1 text-red-600">
                  <AlertTriangle className="h-3 w-3" />
                  需要关注
                </span>
              ) : (
                '运行正常'
              )}
            </div>
          </div>
        </div>

        {/* Historical Reliability */}
        {source.historicalReliability.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">历史可靠性趋势</span>
              <Badge variant="outline" size="sm">
                最近 {source.historicalReliability.length} 次更新
              </Badge>
            </div>
            <div className="flex h-16 items-end gap-1">
              {source.historicalReliability.map((score, index) => {
                const height = Math.max(20, score);
                const color = score >= 99 ? 'bg-emerald-400' : score >= 95 ? 'bg-amber-400' : 'bg-red-400';
                return (
                  <div
                    key={index}
                    className={`flex-1 ${color} rounded-t transition-all duration-300 hover:opacity-80`}
                    style={{ height: `${height}%` }}
                    title={`${score.toFixed(1)}%`}
                  />
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
