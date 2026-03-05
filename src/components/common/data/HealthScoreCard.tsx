'use client';

import React, { useMemo } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui';
import { Progress } from '@/components/ui';
import { cn } from '@/shared/utils';
import type { HealthScoreResult, HealthTrendPoint } from '@/shared/utils/math';
import {
  calculateHealthScoreTrend,
  getHealthStatusColor,
  getDimensionLabel,
  formatDimensionValue,
} from '@/shared/utils/math';

import { MiniTrend } from './MiniTrend';

interface ProtocolHealthCardProps {
  protocol: {
    name: string;
    avgLatency: number;
    activeFeeds: number;
    feeds: number;
    lastUpdate: string;
    healthScore?: HealthScoreResult;
  };
  t: (key: string) => string;
}

/**
 * 健康评分徽章组件 - 显示综合得分
 */
export const HealthScoreBadge: React.FC<ProtocolHealthCardProps> = ({ protocol, t }) => {
  if (!protocol.healthScore) return null;

  const { totalScore, dimensions, rating, status } = protocol.healthScore;

  const bgColor = totalScore >= 80 ? 'bg-success' : totalScore >= 60 ? 'bg-warning' : 'bg-error';

  const textColor =
    totalScore >= 80 ? 'text-success' : totalScore >= 60 ? 'text-warning' : 'text-error';

  const ringColor =
    totalScore >= 80 ? 'ring-success/20' : totalScore >= 60 ? 'ring-warning/20' : 'ring-error/20';

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'hover:scale-115 relative flex h-10 w-10 cursor-help items-center justify-center rounded-xl text-sm font-black ring-2 transition-all',
            bgColor,
            'text-white',
            ringColor,
            'shadow-sm',
          )}
          title={t('overview.healthScore')}
        >
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 36 36">
            <path
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="3"
            />
            <path
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831"
              fill="none"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="3"
              strokeDasharray={`${totalScore}, 100`}
              strokeLinecap="round"
            />
          </svg>
          <span className="relative z-10">{Math.round(totalScore)}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="w-80 p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('overview.healthScore')}</span>
            <span className={cn('text-lg font-black', textColor)}>
              {Math.round(totalScore)}/100
            </span>
          </div>
          <Progress value={totalScore} className="h-2.5" />
          <div className="text-xs font-medium text-muted-foreground">{rating}</div>

          <div className="space-y-2.5 border-t pt-3.5">
            {dimensions.map((dim) => (
              <div key={dim.dimension} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {getDimensionLabel(dim.dimension, t)}
                  </span>
                  <span className="font-semibold">
                    {dim.score.toFixed(0)} ({(dim.weight * 100).toFixed(0)}%)
                  </span>
                </div>
                <Progress value={dim.score} className="h-2" />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {formatDimensionValue(dim.dimension, dim.rawValue)}
                  </span>
                  <span
                    className={cn(
                      'rounded-lg px-2 py-0.5 text-[10px] font-semibold',
                      getHealthStatusColor(status),
                    )}
                  >
                    {dim.rating}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

/**
 * 健康评分趋势组件
 */
export const HealthScoreTrend: React.FC<ProtocolHealthCardProps> = ({ protocol, t }) => {
  const trendData = useMemo<HealthTrendPoint[]>(() => {
    // 生成历史趋势数据（示例）
    const baseTime = Date.now();
    const dataPoints = Array.from({ length: 7 }, (_, i) => {
      const hoursAgo = 6 - i;
      const variance = Math.sin(hoursAgo / 2) * 20; // 模拟波动
      return {
        timestamp: new Date(baseTime - hoursAgo * 3600000).toISOString(),
        avgLatency: protocol.avgLatency + variance,
        updateIntervalSeconds: protocol.avgLatency * 3 + variance * 2,
        activeFeeds: protocol.activeFeeds + Math.floor(variance / 5),
        totalFeeds: protocol.feeds,
      };
    });

    return calculateHealthScoreTrend(dataPoints);
  }, [protocol.avgLatency, protocol.activeFeeds, protocol.feeds]);

  const currentScore = trendData[trendData.length - 1]?.score || 0;
  const previousScore = trendData[trendData.length - 2]?.score || 0;
  const trendValue = currentScore - previousScore;

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'text-xs font-medium',
          trendValue > 0 ? 'text-success' : trendValue < 0 ? 'text-error' : 'text-muted-foreground',
        )}
        title={t('overview.healthScore')}
      >
        {trendValue > 0 ? '+' : ''}
        {trendValue.toFixed(1)}
      </div>
      <MiniTrend
        data={trendData.map((t) => t.score)}
        width={64}
        height={20}
        color={trendValue >= 0 ? 'success' : 'error'}
      />
    </div>
  );
};
