'use client';

import { useState, memo } from 'react';

import { Activity, TrendingUp, Users, AlertTriangle } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { useHistoricalTrends } from '@/features/oracle/chainlink/hooks/useHistoricalTrends';

import { AnomalyTimeline } from './AnomalyTimeline';
import { FeedTrendChart } from './FeedTrendChart';
import { NodePerformanceChart } from './NodePerformanceChart';
import { OCRRoundChart } from './OCRRoundChart';

import type { TimeRange } from '../../types';

export interface HistoricalTrendsDashboardProps {
  defaultTimeRange?: TimeRange;
}

type TabValue = 'feeds' | 'nodes' | 'ocr' | 'anomalies';

export const HistoricalTrendsDashboard = memo(function HistoricalTrendsDashboard({
  defaultTimeRange = '24h',
}: HistoricalTrendsDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('feeds');
  const [timeRange, setTimeRange] = useState<TimeRange>(defaultTimeRange);

  const { data, isLoading, error } = useHistoricalTrends(timeRange, {
    refreshInterval: 60000,
    dedupingInterval: 30000,
  });

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
  };

  const TABS = [
    {
      value: 'feeds' as TabValue,
      label: 'Feed 趋势',
      icon: TrendingUp,
    },
    {
      value: 'nodes' as TabValue,
      label: '节点表现',
      icon: Users,
    },
    {
      value: 'ocr' as TabValue,
      label: 'OCR 轮次',
      icon: Activity,
    },
    {
      value: 'anomalies' as TabValue,
      label: '异常事件',
      icon: AlertTriangle,
    },
  ];

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-medium text-error">加载数据失败</p>
          <p className="text-xs text-muted-foreground">请稍后重试</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <div className="mb-4 flex items-center justify-between">
          <TabsList>
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.value} value={tab.value}>
                  <Icon className="mr-2 h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value="feeds">
          {isLoading || !data?.feedTrends ? (
            <Skeleton className="h-[500px] w-full" />
          ) : (
            <FeedTrendChart
              data={data.feedTrends}
              timeRange={timeRange}
              onTimeRangeChange={handleTimeRangeChange}
            />
          )}
        </TabsContent>

        <TabsContent value="nodes">
          {isLoading || !data?.nodePerformance ? (
            <Skeleton className="h-[500px] w-full" />
          ) : (
            <NodePerformanceChart
              data={data.nodePerformance}
              timeRange={timeRange}
              onTimeRangeChange={handleTimeRangeChange}
            />
          )}
        </TabsContent>

        <TabsContent value="ocr">
          {isLoading || !data?.ocrStats ? (
            <Skeleton className="h-[500px] w-full" />
          ) : (
            <OCRRoundChart
              data={data.ocrStats}
              timeRange={timeRange}
              onTimeRangeChange={handleTimeRangeChange}
            />
          )}
        </TabsContent>

        <TabsContent value="anomalies">
          {isLoading || !data?.anomalyStats ? (
            <Skeleton className="h-[500px] w-full" />
          ) : (
            <AnomalyTimeline
              data={data.anomalyStats.recentAnomalies}
              stats={data.anomalyStats}
              timeRange={timeRange}
              onTimeRangeChange={handleTimeRangeChange}
            />
          )}
        </TabsContent>
      </Tabs>

      {data?.metadata && (
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex gap-4">
            <span>Feed 数：{data.metadata.totalFeeds}</span>
            <span>节点数：{data.metadata.totalNodes}</span>
            <span>OCR 轮次：{data.metadata.totalRounds}</span>
            <span>数据点：{data.metadata.dataPoints}</span>
          </div>
          <span>
            采样率：
            {data.metadata.samplingRate ? (data.metadata.samplingRate * 100).toFixed(0) : 100}%
          </span>
        </div>
      )}
    </div>
  );
});
