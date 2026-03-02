'use client';

import { RefreshCw, Compass } from 'lucide-react';

import { EmptyDataState } from '@/components/common';
import { Button } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

import { AnomalyPattern } from './AnomalyPattern';
import { NewFeedAlert } from './NewFeedAlert';
import { ProtocolActivity } from './ProtocolActivity';
import { TrendInsight } from './TrendInsight';
import {
  useDataDiscovery,
  type AnomalyPatternItem,
  type NewFeedItem,
  type ProtocolActivityItem,
  type TrendInsightItem,
} from '../hooks/useDataDiscovery';

export function DataDiscovery() {
  const { data, isLoading, error, mutate } = useDataDiscovery();
  const { lang } = useI18n();

  const handleAnomalyClick = (item: AnomalyPatternItem) => {
    if (item.actionUrl) {
      window.location.href = item.actionUrl;
    }
  };

  const handleTrendClick = (item: TrendInsightItem) => {
    if (item.actionUrl) {
      window.location.href = item.actionUrl;
    }
  };

  const handleNewFeedClick = (item: NewFeedItem) => {
    if (item.actionUrl) {
      window.location.href = item.actionUrl;
    }
  };

  const handleActivityClick = (item: ProtocolActivityItem) => {
    if (item.actionUrl) {
      window.location.href = item.actionUrl;
    }
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center">
        <p className="text-red-600">
          {lang === 'zh' ? '加载数据发现失败' : 'Failed to load data discovery'}
        </p>
        <Button variant="outline" size="sm" onClick={() => mutate()} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          {lang === 'zh' ? '重试' : 'Retry'}
        </Button>
      </div>
    );
  }

  const hasData =
    (data?.anomalyPatterns && data.anomalyPatterns.length > 0) ||
    (data?.trendInsights && data.trendInsights.length > 0) ||
    (data?.newFeeds && data.newFeeds.length > 0) ||
    (data?.protocolActivityChanges && data.protocolActivityChanges.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Compass className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">{lang === 'zh' ? '数据发现' : 'Data Discovery'}</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={() => mutate()} disabled={isLoading}>
          <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
          {lang === 'zh' ? '刷新' : 'Refresh'}
        </Button>
      </div>

      {!hasData && !isLoading && (
        <EmptyDataState
          icon={Compass}
          title={lang === 'zh' ? '暂无数据发现内容' : 'No discovery data available'}
          description={
            lang === 'zh'
              ? '当前没有发现任何数据模式或趋势'
              : 'No data patterns or trends discovered at the moment'
          }
          onRefresh={() => mutate()}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <AnomalyPattern
          anomalies={data?.anomalyPatterns || []}
          isLoading={isLoading}
          onItemClick={handleAnomalyClick}
        />

        <TrendInsight
          insights={data?.trendInsights || []}
          isLoading={isLoading}
          onItemClick={handleTrendClick}
        />

        <NewFeedAlert
          feeds={data?.newFeeds || []}
          isLoading={isLoading}
          onItemClick={handleNewFeedClick}
        />

        <ProtocolActivity
          activities={data?.protocolActivityChanges || []}
          isLoading={isLoading}
          onItemClick={handleActivityClick}
        />
      </div>
    </div>
  );
}
