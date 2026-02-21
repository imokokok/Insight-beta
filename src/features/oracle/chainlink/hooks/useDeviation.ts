'use client';

import { useMemo } from 'react';

import useSWR from 'swr';

import type { ChainlinkFeed } from '../types/chainlink';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export type DeviationStatus = 'normal' | 'warning' | 'critical';

export interface DeviationResult {
  currentPrice: number;
  avgPrice: number | null;
  deviationPercent: number | null;
  thresholdPercent: number;
  status: DeviationStatus;
  trend: 'up' | 'down' | 'stable' | null;
  isLoading: boolean;
  isError: boolean;
}

export interface FeedDeviationData {
  [feedAddress: string]: DeviationResult;
}

interface PriceHistoryRecord {
  price: number;
  timestamp: string;
}

interface PriceHistoryResponse {
  success: boolean;
  protocol: string;
  symbol: string;
  count: number;
  data: PriceHistoryRecord[];
}

function calculateDeviationStatus(
  deviationPercent: number,
  thresholdPercent: number,
): DeviationStatus {
  const ratio = deviationPercent / thresholdPercent;
  if (ratio >= 1) return 'critical';
  if (ratio >= 0.8) return 'warning';
  return 'normal';
}

function calculateTrend(prices: PriceHistoryRecord[]): 'up' | 'down' | 'stable' | null {
  if (prices.length < 2) return null;

  const recentCount = Math.min(5, prices.length);
  const recentPrices = prices.slice(-recentCount);
  const olderPrices = prices.slice(0, -recentCount);

  if (olderPrices.length === 0) return null;

  const recentAvg = recentPrices.reduce((sum, p) => sum + p.price, 0) / recentPrices.length;
  const olderAvg = olderPrices.reduce((sum, p) => sum + p.price, 0) / olderPrices.length;

  const changePercent = Math.abs((recentAvg - olderAvg) / olderAvg);

  if (changePercent < 0.001) return 'stable';
  return recentAvg > olderAvg ? 'up' : 'down';
}

export function useDeviation(feed: ChainlinkFeed): DeviationResult {
  const currentPrice = useMemo(() => {
    const num = parseFloat(feed.latestPrice);
    if (isNaN(num)) return 0;
    return num / Math.pow(10, 18 - feed.decimals);
  }, [feed.latestPrice, feed.decimals]);

  const thresholdPercent = useMemo(() => {
    return parseFloat(feed.deviationThreshold) || 0;
  }, [feed.deviationThreshold]);

  const { data, isLoading, error } = useSWR<PriceHistoryResponse>(
    `/api/oracle/history/prices?protocol=chainlink&symbol=${encodeURIComponent(feed.symbol)}&limit=50`,
    fetcher,
    {
      refreshInterval: 60000,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  );

  const isError = !!error;

  const result = useMemo((): DeviationResult => {
    if (!data?.data || data.data.length === 0) {
      return {
        currentPrice,
        avgPrice: null,
        deviationPercent: null,
        thresholdPercent,
        status: 'normal',
        trend: null,
        isLoading,
        isError,
      };
    }

    const prices = data.data;
    const avgPrice = prices.reduce((sum, p) => sum + p.price, 0) / prices.length;

    const deviationPercent = Math.abs((currentPrice - avgPrice) / avgPrice) * 100;

    const status = calculateDeviationStatus(deviationPercent, thresholdPercent);
    const trend = calculateTrend(prices);

    return {
      currentPrice,
      avgPrice,
      deviationPercent,
      thresholdPercent,
      status,
      trend,
      isLoading,
      isError,
    };
  }, [data, currentPrice, thresholdPercent, isLoading, isError]);

  return result;
}

export function useFeedDeviations(feeds: ChainlinkFeed[]): {
  deviations: FeedDeviationData;
  isLoading: boolean;
  hasCriticalDeviations: boolean;
  criticalCount: number;
  warningCount: number;
} {
  const symbols = useMemo(() => [...new Set(feeds.map((f) => f.symbol))], [feeds]);

  const { data, isLoading } = useSWR<Map<string, PriceHistoryResponse>>(
    symbols.length > 0
      ? `/api/oracle/history/prices/batch?protocol=chainlink&symbols=${symbols.join(',')}&limit=50`
      : null,
    async (url: string) => {
      const res = await fetch(url);
      const json = await res.json();
      const map = new Map<string, PriceHistoryResponse>();
      if (json.data) {
        for (const [symbol, data] of Object.entries(json.data)) {
          map.set(symbol, data as PriceHistoryResponse);
        }
      }
      return map;
    },
    {
      refreshInterval: 60000,
      revalidateOnFocus: false,
    },
  );

  const result = useMemo(() => {
    const deviations: FeedDeviationData = {};
    let criticalCount = 0;
    let warningCount = 0;

    for (const feed of feeds) {
      const currentPrice = parseFloat(feed.latestPrice) / Math.pow(10, 18 - feed.decimals);
      const thresholdPercent = parseFloat(feed.deviationThreshold) || 0;

      const historyData = data?.get(feed.symbol);
      const priceHistory = historyData?.data || [];

      if (priceHistory.length === 0) {
        deviations[feed.aggregatorAddress] = {
          currentPrice,
          avgPrice: null,
          deviationPercent: null,
          thresholdPercent,
          status: 'normal',
          trend: null,
          isLoading,
          isError: false,
        };
        continue;
      }

      const avgPrice = priceHistory.reduce((sum, p) => sum + p.price, 0) / priceHistory.length;
      const deviationPercent = Math.abs((currentPrice - avgPrice) / avgPrice) * 100;
      const status = calculateDeviationStatus(deviationPercent, thresholdPercent);
      const trend = calculateTrend(priceHistory);

      if (status === 'critical') criticalCount++;
      if (status === 'warning') warningCount++;

      deviations[feed.aggregatorAddress] = {
        currentPrice,
        avgPrice,
        deviationPercent,
        thresholdPercent,
        status,
        trend,
        isLoading,
        isError: false,
      };
    }

    return {
      deviations,
      isLoading,
      hasCriticalDeviations: criticalCount > 0,
      criticalCount,
      warningCount,
    };
  }, [feeds, data, isLoading]);

  return result;
}
