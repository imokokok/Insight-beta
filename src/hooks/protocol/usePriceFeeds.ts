'use client';

import useSWR from 'swr';
import type { PriceFeed, OracleProtocol, SupportedChain } from '@/lib/types';

interface UsePriceFeedsOptions {
  protocol?: OracleProtocol | 'all';
  chain?: SupportedChain;
  symbols?: string[];
  refreshInterval?: number;
}

interface PriceFeedsResponse {
  feeds: PriceFeed[];
  timestamp: string;
}

const fetcher = async (url: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch price feeds: ${response.status} ${response.statusText}`);
    }
    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout: failed to fetch price feeds within 30 seconds');
    }
    throw error;
  }
};

export function usePriceFeeds(options: UsePriceFeedsOptions = {}) {
  const { protocol = 'all', chain, symbols, refreshInterval = 10000 } = options;

  const params = new URLSearchParams();
  if (protocol && protocol !== 'all') params.append('protocol', protocol);
  if (chain) params.append('chain', chain);
  if (symbols && symbols.length > 0) {
    symbols.forEach((symbol) => params.append('symbols', symbol));
  }

  const url = `/api/oracle/unified?type=feeds&${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<PriceFeedsResponse>(url, fetcher, {
    refreshInterval,
    revalidateOnFocus: true,
    dedupingInterval: 2000,
  });

  return {
    feeds: data?.feeds ?? [],
    timestamp: data?.timestamp,
    isLoading,
    error,
    refresh: mutate,
  };
}

export function usePriceFeed(symbol: string, protocol?: OracleProtocol, chain?: SupportedChain) {
  const { feeds, isLoading, error, refresh } = usePriceFeeds({
    protocol,
    chain,
    symbols: [symbol],
    refreshInterval: 5000,
  });

  const feed = feeds.find((f) => f.symbol === symbol);

  return {
    feed,
    isLoading,
    error,
    refresh,
  };
}

export function useCrossProtocolComparison(symbol: string) {
  const { feeds, isLoading, error, refresh } = usePriceFeeds({
    symbols: [symbol],
    refreshInterval: 5000,
  });

  // Group feeds by protocol
  const feedsByProtocol = feeds.reduce<Record<string, PriceFeed[]>>((acc, feed) => {
    const protocol = feed.protocol;
    if (!acc[protocol]) {
      acc[protocol] = [];
    }
    acc[protocol].push(feed);
    return acc;
  }, {});

  // Calculate comparison metrics
  const prices = feeds.map((f) => f.price).filter((p) => p > 0);
  const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const priceRange = maxPrice - minPrice;
  const priceRangePercent = avgPrice > 0 ? (priceRange / avgPrice) * 100 : 0;

  // Find outliers (prices deviating more than 1% from median)
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const medianPrice =
    sortedPrices.length > 0
      ? sortedPrices.length % 2 === 0
        ? (sortedPrices[sortedPrices.length / 2 - 1] ??
            0 + (sortedPrices[sortedPrices.length / 2] ?? 0)) / 2
        : (sortedPrices[Math.floor(sortedPrices.length / 2)] ?? 0)
      : 0;

  const outlierProtocols = feeds
    .filter((feed) => {
      const deviation = medianPrice > 0 ? Math.abs(feed.price - medianPrice) / medianPrice : 0;
      return deviation > 0.01; // 1% threshold
    })
    .map((feed) => feed.protocol);

  return {
    feeds,
    feedsByProtocol,
    comparison: {
      avgPrice,
      medianPrice,
      minPrice,
      maxPrice,
      priceRange,
      priceRangePercent,
      outlierProtocols,
      recommendedPrice: medianPrice,
    },
    isLoading,
    error,
    refresh,
  };
}
