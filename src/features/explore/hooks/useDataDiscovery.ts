'use client';

import useSWR from 'swr';

import { buildApiUrl } from '@/shared/utils';
import { fetchApiData } from '@/shared/utils/api';

import type { DiscoveryItem } from '../types';

export interface DataDiscoveryResponse {
  anomalyPatterns: AnomalyPatternItem[];
  trendInsights: TrendInsightItem[];
  newFeeds: NewFeedItem[];
  protocolActivityChanges: ProtocolActivityItem[];
}

export interface AnomalyPatternItem extends DiscoveryItem {
  type: 'anomaly';
  anomalyType: 'price_spike' | 'deviation' | 'delay';
  severity: 'info' | 'warning' | 'critical';
  symbol: string;
  protocol: string;
  value?: number;
  threshold?: number;
  percentageChange?: number;
}

export interface TrendInsightItem extends DiscoveryItem {
  type: 'trend';
  trendType: 'continuous_rise' | 'continuous_fall' | 'volatility_change';
  symbol: string;
  duration: string;
  changePercent: number;
  volatilityScore?: number;
}

export interface NewFeedItem extends DiscoveryItem {
  type: 'new_feed';
  symbol: string;
  protocol: string;
  chain: string;
  category: string;
}

export interface ProtocolActivityItem extends DiscoveryItem {
  type: 'activity_change';
  protocol: string;
  changeType: 'increase' | 'decrease';
  changePercent: number;
  previousValue: number;
  currentValue: number;
}

export function useDataDiscovery() {
  const url = buildApiUrl('/api/explore/discovery');

  return useSWR<DataDiscoveryResponse>(
    url,
    (url: string) => fetchApiData<DataDiscoveryResponse>(url),
    {
      refreshInterval: 60000,
      revalidateOnFocus: true,
      dedupingInterval: 30000,
    },
  );
}

export type {
  AnomalyPatternItem as AnomalyPatternItemType,
  TrendInsightItem as TrendInsightItemType,
  NewFeedItem as NewFeedItemType,
  ProtocolActivityItem as ProtocolActivityItemType,
};
