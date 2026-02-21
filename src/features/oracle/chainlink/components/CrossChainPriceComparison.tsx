'use client';

import { useState, useEffect, useMemo } from 'react';

import { ArrowRight, TrendingUp, Clock } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/i18n';
import { formatTime, cn } from '@/shared/utils';

import type { CrossChainComparison, CrossChainPrice } from '../types/chainlink';

const MOCK_DATA: CrossChainComparison[] = [
  {
    symbol: 'ETH',
    prices: [
      {
        symbol: 'ETH',
        pair: 'ETH/USD',
        chain: 'Ethereum',
        price: '3245.67',
        decimals: 8,
        lastUpdate: new Date(Date.now() - 60000).toISOString(),
      },
      {
        symbol: 'ETH',
        pair: 'ETH/USD',
        chain: 'Arbitrum',
        price: '3246.12',
        decimals: 8,
        lastUpdate: new Date(Date.now() - 45000).toISOString(),
      },
      {
        symbol: 'ETH',
        pair: 'ETH/USD',
        chain: 'Optimism',
        price: '3245.89',
        decimals: 8,
        lastUpdate: new Date(Date.now() - 55000).toISOString(),
      },
      {
        symbol: 'ETH',
        pair: 'ETH/USD',
        chain: 'Polygon',
        price: '3244.98',
        decimals: 8,
        lastUpdate: new Date(Date.now() - 70000).toISOString(),
      },
      {
        symbol: 'ETH',
        pair: 'ETH/USD',
        chain: 'Avalanche',
        price: '3246.45',
        decimals: 8,
        lastUpdate: new Date(Date.now() - 80000).toISOString(),
      },
    ],
    priceDifference: 1.47,
    priceDifferencePercentage: 0.045,
  },
  {
    symbol: 'BTC',
    prices: [
      {
        symbol: 'BTC',
        pair: 'BTC/USD',
        chain: 'Ethereum',
        price: '98456.32',
        decimals: 8,
        lastUpdate: new Date(Date.now() - 30000).toISOString(),
      },
      {
        symbol: 'BTC',
        pair: 'BTC/USD',
        chain: 'Arbitrum',
        price: '98458.76',
        decimals: 8,
        lastUpdate: new Date(Date.now() - 40000).toISOString(),
      },
      {
        symbol: 'BTC',
        pair: 'BTC/USD',
        chain: 'Optimism',
        price: '98455.91',
        decimals: 8,
        lastUpdate: new Date(Date.now() - 35000).toISOString(),
      },
      {
        symbol: 'BTC',
        pair: 'BTC/USD',
        chain: 'Polygon',
        price: '98454.23',
        decimals: 8,
        lastUpdate: new Date(Date.now() - 45000).toISOString(),
      },
      {
        symbol: 'BTC',
        pair: 'BTC/USD',
        chain: 'Avalanche',
        price: '98459.88',
        decimals: 8,
        lastUpdate: new Date(Date.now() - 50000).toISOString(),
      },
    ],
    priceDifference: 5.65,
    priceDifferencePercentage: 0.006,
  },
  {
    symbol: 'LINK',
    prices: [
      {
        symbol: 'LINK',
        pair: 'LINK/USD',
        chain: 'Ethereum',
        price: '18.45',
        decimals: 8,
        lastUpdate: new Date(Date.now() - 90000).toISOString(),
      },
      {
        symbol: 'LINK',
        pair: 'LINK/USD',
        chain: 'Arbitrum',
        price: '18.47',
        decimals: 8,
        lastUpdate: new Date(Date.now() - 85000).toISOString(),
      },
      {
        symbol: 'LINK',
        pair: 'LINK/USD',
        chain: 'Optimism',
        price: '18.44',
        decimals: 8,
        lastUpdate: new Date(Date.now() - 95000).toISOString(),
      },
      {
        symbol: 'LINK',
        pair: 'LINK/USD',
        chain: 'Polygon',
        price: '18.43',
        decimals: 8,
        lastUpdate: new Date(Date.now() - 100000).toISOString(),
      },
      {
        symbol: 'LINK',
        pair: 'LINK/USD',
        chain: 'Avalanche',
        price: '18.48',
        decimals: 8,
        lastUpdate: new Date(Date.now() - 110000).toISOString(),
      },
    ],
    priceDifference: 0.05,
    priceDifferencePercentage: 0.27,
  },
  {
    symbol: 'USDC',
    prices: [
      {
        symbol: 'USDC',
        pair: 'USDC/USD',
        chain: 'Ethereum',
        price: '1.0001',
        decimals: 8,
        lastUpdate: new Date(Date.now() - 20000).toISOString(),
      },
      {
        symbol: 'USDC',
        pair: 'USDC/USD',
        chain: 'Arbitrum',
        price: '1.0000',
        decimals: 8,
        lastUpdate: new Date(Date.now() - 25000).toISOString(),
      },
      {
        symbol: 'USDC',
        pair: 'USDC/USD',
        chain: 'Optimism',
        price: '1.0002',
        decimals: 8,
        lastUpdate: new Date(Date.now() - 22000).toISOString(),
      },
      {
        symbol: 'USDC',
        pair: 'USDC/USD',
        chain: 'Polygon',
        price: '0.9999',
        decimals: 8,
        lastUpdate: new Date(Date.now() - 30000).toISOString(),
      },
      {
        symbol: 'USDC',
        pair: 'USDC/USD',
        chain: 'Avalanche',
        price: '1.0001',
        decimals: 8,
        lastUpdate: new Date(Date.now() - 28000).toISOString(),
      },
    ],
    priceDifference: 0.0003,
    priceDifferencePercentage: 0.03,
  },
  {
    symbol: 'USDT',
    prices: [
      {
        symbol: 'USDT',
        pair: 'USDT/USD',
        chain: 'Ethereum',
        price: '1.0002',
        decimals: 8,
        lastUpdate: new Date(Date.now() - 15000).toISOString(),
      },
      {
        symbol: 'USDT',
        pair: 'USDT/USD',
        chain: 'Arbitrum',
        price: '1.0001',
        decimals: 8,
        lastUpdate: new Date(Date.now() - 18000).toISOString(),
      },
      {
        symbol: 'USDT',
        pair: 'USDT/USD',
        chain: 'Optimism',
        price: '1.0000',
        decimals: 8,
        lastUpdate: new Date(Date.now() - 20000).toISOString(),
      },
      {
        symbol: 'USDT',
        pair: 'USDT/USD',
        chain: 'Polygon',
        price: '1.0003',
        decimals: 8,
        lastUpdate: new Date(Date.now() - 25000).toISOString(),
      },
      {
        symbol: 'USDT',
        pair: 'USDT/USD',
        chain: 'Avalanche',
        price: '1.0001',
        decimals: 8,
        lastUpdate: new Date(Date.now() - 22000).toISOString(),
      },
    ],
    priceDifference: 0.0003,
    priceDifferencePercentage: 0.03,
  },
];

function calculatePriceDifference(prices: CrossChainPrice[]): {
  diff: number;
  diffPercent: number;
} {
  if (prices.length < 2) return { diff: 0, diffPercent: 0 };

  const numericPrices = prices.map((p) => parseFloat(p.price));
  const maxPrice = Math.max(...numericPrices);
  const minPrice = Math.min(...numericPrices);
  const avgPrice = numericPrices.reduce((a, b) => a + b, 0) / numericPrices.length;

  const diff = maxPrice - minPrice;
  const diffPercent = (diff / avgPrice) * 100;

  return { diff, diffPercent };
}

function PriceComparisonTable({
  comparison,
  baseChain = 'Ethereum',
}: {
  comparison: CrossChainComparison;
  baseChain?: string;
}) {
  const { t } = useI18n();

  const basePrice = comparison.prices.find((p) => p.chain === baseChain);
  const basePriceValue = basePrice ? parseFloat(basePrice.price) : 0;

  const formatPrice = (price: string, symbol: string) => {
    const num = parseFloat(price);
    if (symbol === 'BTC') {
      return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (num >= 1000) {
      return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${num.toFixed(4)}`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="pb-2 text-left font-medium">{t('oracle.chainlink.crossChain.chain')}</th>
            <th className="pb-2 text-right font-medium">
              {t('oracle.chainlink.crossChain.price')}
            </th>
            <th className="pb-2 text-right font-medium">
              {t('oracle.chainlink.crossChain.lastUpdate')}
            </th>
            <th className="pb-2 text-right font-medium">
              {t('oracle.chainlink.crossChain.difference')}
            </th>
          </tr>
        </thead>
        <tbody>
          {comparison.prices.map((priceData) => {
            const priceValue = parseFloat(priceData.price);
            const diff = priceValue - basePriceValue;
            const diffPercent = basePriceValue > 0 ? (diff / basePriceValue) * 100 : 0;
            const isBaseChain = priceData.chain === baseChain;

            return (
              <tr
                key={priceData.chain}
                className={cn(
                  'border-b transition-colors hover:bg-muted/50',
                  isBaseChain && 'bg-blue-50/50 dark:bg-blue-950/20',
                )}
              >
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    {isBaseChain && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        Base
                      </span>
                    )}
                    <span className="font-medium">{priceData.chain}</span>
                  </div>
                </td>
                <td className="py-3 text-right font-mono">
                  {formatPrice(priceData.price, comparison.symbol)}
                </td>
                <td className="py-3 text-right text-sm text-muted-foreground">
                  <div className="flex items-center justify-end gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(priceData.lastUpdate)}
                  </div>
                </td>
                <td className="py-3 text-right">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium',
                      diff > 0
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : diff < 0
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
                    )}
                  >
                    {diff > 0 ? '+' : ''}
                    {diffPercent.toFixed(4)}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-24" />
      </div>
      <Skeleton className="h-48 w-full" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

export function CrossChainPriceComparison() {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<CrossChainComparison[]>([]);
  const [selectedToken, setSelectedToken] = useState<string>('ETH');

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      setData(MOCK_DATA);
      setIsLoading(false);
    };

    loadData();
  }, []);

  const selectedComparison = useMemo(() => {
    return data.find((d) => d.symbol === selectedToken);
  }, [data, selectedToken]);

  const overallStats = useMemo(() => {
    if (data.length === 0) return { maxDiff: 0, avgDiff: 0, maxDiffToken: '' };

    let maxDiff = 0;
    let totalDiff = 0;
    let maxDiffToken = '';

    data.forEach((comparison) => {
      const { diffPercent } = calculatePriceDifference(comparison.prices);
      totalDiff += diffPercent;
      if (diffPercent > maxDiff) {
        maxDiff = diffPercent;
        maxDiffToken = comparison.symbol;
      }
    });

    return {
      maxDiff,
      avgDiff: totalDiff / data.length,
      maxDiffToken,
    };
  }, [data]);

  const formatDiff = (diff: number) => {
    if (diff < 0.01) return diff.toFixed(6);
    if (diff < 1) return diff.toFixed(4);
    return diff.toFixed(2);
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('oracle.chainlink.crossChain.title')}
          </CardTitle>

          {!isLoading && data.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.map((item) => (
                <button
                  key={item.symbol}
                  onClick={() => setSelectedToken(item.symbol)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    selectedToken === item.symbol
                      ? 'text-primary-foreground bg-primary'
                      : 'bg-muted hover:bg-muted/80',
                  )}
                >
                  {item.symbol}
                </button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <LoadingSkeleton />
        ) : !selectedComparison ? (
          <div className="py-8 text-center text-muted-foreground">{t('common.noData')}</div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 rounded-lg bg-muted/50 p-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('oracle.chainlink.crossChain.maxDiff')}
                </p>
                <p className="text-lg font-semibold">{formatDiff(overallStats.maxDiff)}%</p>
                <p className="text-xs text-muted-foreground">{overallStats.maxDiffToken}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('oracle.chainlink.crossChain.avgDiff')}
                </p>
                <p className="text-lg font-semibold">{formatDiff(overallStats.avgDiff)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('oracle.chainlink.crossChain.chains')}
                </p>
                <p className="text-lg font-semibold">{selectedComparison.prices.length}</p>
              </div>
            </div>

            <PriceComparisonTable comparison={selectedComparison} baseChain="Ethereum" />

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ArrowRight className="h-3 w-3" />
              <span>{t('oracle.chainlink.crossChain.disclaimer')}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
