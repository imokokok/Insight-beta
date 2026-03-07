'use client';

import { useState, useMemo, useCallback } from 'react';

import {
  X,
  Activity,
  Clock,
  Server,
  BarChart3,
  Zap,
} from 'lucide-react';

import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui';
import { Badge } from '@/components/ui';
import { cn } from '@/shared/utils';

import type {
  NodeUptimeTimeSeries,
  NodeResponseTimeTrend,
  NodeFeedSupportHistory,
  FeedUpdateFrequencyTrend,
  MultiNodeComparisonData,
  TimeRange,
} from '../../types';
import { UptimeTimeSeriesChart } from './UptimeTimeSeriesChart';
import { ResponseTimeTrendChart } from './ResponseTimeTrendChart';
import { FeedSupportChart } from './FeedSupportChart';
import { FeedUpdateFrequencyChart } from './FeedUpdateFrequencyChart';
import { MultiNodeComparisonChart } from './MultiNodeComparisonChart';

export interface NodePerformancePanelProps {
  isOpen: boolean;
  onClose: () => void;
  uptimeData?: NodeUptimeTimeSeries[];
  responseTimeData?: NodeResponseTimeTrend[];
  feedSupportData?: NodeFeedSupportHistory[];
  feedFrequencyData?: FeedUpdateFrequencyTrend[];
  comparisonData?: MultiNodeComparisonData;
  defaultTimeRange?: TimeRange;
  defaultTab?: string;
}

type TabValue = 'uptime' | 'response' | 'feeds' | 'frequency' | 'comparison';

export function NodePerformancePanel({
  isOpen,
  onClose,
  uptimeData,
  responseTimeData,
  feedSupportData,
  feedFrequencyData,
  comparisonData,
  defaultTimeRange = '24h',
  defaultTab = 'uptime',
}: NodePerformancePanelProps) {
  const [activeTab, setActiveTab] = useState<TabValue>(defaultTab as TabValue);
  const [timeRange, setTimeRange] = useState<TimeRange>(defaultTimeRange);

  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    setTimeRange(range);
  }, []);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as TabValue);
  }, []);

  const TABS = useMemo(
    () => [
      {
        value: 'uptime' as TabValue,
        label: '历史在线率',
        icon: Activity,
        disabled: !uptimeData?.length,
      },
      {
        value: 'response' as TabValue,
        label: '响应时间',
        icon: Clock,
        disabled: !responseTimeData?.length,
      },
      {
        value: 'feeds' as TabValue,
        label: 'Feed 支持',
        icon: Server,
        disabled: !feedSupportData?.length,
      },
      {
        value: 'frequency' as TabValue,
        label: '更新频率',
        icon: Zap,
        disabled: !feedFrequencyData?.length,
      },
      {
        value: 'comparison' as TabValue,
        label: '多节点对比',
        icon: BarChart3,
        disabled: !comparisonData?.nodes?.length,
      },
    ],
    [uptimeData, responseTimeData, feedSupportData, feedFrequencyData, comparisonData]
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'uptime':
        return uptimeData?.length ? (
          <UptimeTimeSeriesChart
            data={uptimeData}
            timeRange={timeRange}
            onTimeRangeChange={handleTimeRangeChange}
            showComparison={true}
          />
        ) : null;

      case 'response':
        return responseTimeData?.length ? (
          <ResponseTimeTrendChart
            data={responseTimeData}
            timeRange={timeRange}
            onTimeRangeChange={handleTimeRangeChange}
            showPercentiles={true}
          />
        ) : null;

      case 'feeds':
        return feedSupportData?.length ? (
          <FeedSupportChart
            data={feedSupportData}
            timeRange={timeRange}
            onTimeRangeChange={handleTimeRangeChange}
            showActiveFeeds={true}
          />
        ) : null;

      case 'frequency':
        return feedFrequencyData?.length ? (
          <FeedUpdateFrequencyChart
            data={feedFrequencyData}
            timeRange={timeRange}
            onTimeRangeChange={handleTimeRangeChange}
            showInterval={true}
          />
        ) : null;

      case 'comparison':
        return comparisonData?.nodes?.length ? (
          <MultiNodeComparisonChart
            data={comparisonData}
            timeRange={timeRange}
            onTimeRangeChange={handleTimeRangeChange}
            showRadar={true}
          />
        ) : null;

      default:
        return null;
    }
  };

  const hasData =
    uptimeData?.length ||
    responseTimeData?.length ||
    feedSupportData?.length ||
    feedFrequencyData?.length ||
    comparisonData?.nodes?.length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              节点性能深度分析
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <div className="flex items-center justify-between">
              <TabsList>
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      disabled={tab.disabled}
                      className={cn(
                        'flex items-center gap-2',
                        tab.disabled && 'opacity-50'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {timeRange}
                </Badge>
              </div>
            </div>

            <div className="mt-4 min-h-[500px]">
              {!hasData ? (
                <div className="flex h-[500px] items-center justify-center">
                  <div className="text-center">
                    <Activity className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-sm text-muted-foreground">暂无性能数据</p>
                    <p className="text-xs text-muted-foreground">
                      请稍后再试或联系管理员
                    </p>
                  </div>
                </div>
              ) : (
                renderContent()
              )}
            </div>
          </Tabs>

          <div className="flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
            <div className="flex gap-4">
              <span>时间范围：{timeRange}</span>
              <span>数据已加载</span>
            </div>
            <div className="flex items-center gap-2">
              <span>支持多节点对比</span>
              <Activity className="h-3 w-3" />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
