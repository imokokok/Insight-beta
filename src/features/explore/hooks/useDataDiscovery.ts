'use client';

import useSWR from 'swr';

import { buildApiUrl } from '@/shared/utils';

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

const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData: Record<string, unknown> = await res.json().catch(() => ({}));
    const error = new Error(
      (errorData.error as string) || `HTTP ${res.status}: Failed to fetch data`,
    );
    (error as { code?: string; status?: number }).code =
      (errorData.code as string) || 'FETCH_ERROR';
    (error as { code?: string; status?: number }).status = res.status;
    throw error;
  }
  return res.json() as Promise<T>;
};

export function useDataDiscovery() {
  const url = buildApiUrl('/api/explore/discovery');

  return useSWR<DataDiscoveryResponse>(url, (url: string) => fetcher<DataDiscoveryResponse>(url), {
    refreshInterval: 60000,
    revalidateOnFocus: true,
    dedupingInterval: 30000,
  });
}

export type {
  AnomalyPatternItem as AnomalyPatternItemType,
  TrendInsightItem as TrendInsightItemType,
  NewFeedItem as NewFeedItemType,
  ProtocolActivityItem as ProtocolActivityItemType,
};
