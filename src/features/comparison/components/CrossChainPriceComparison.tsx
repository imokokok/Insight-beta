'use client';

import { useMemo, useState, useEffect } from 'react';

import { TrendingUp, ArrowRightLeft, AlertTriangle, Info } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';
import { buildApiUrl } from '@/shared/utils';
import { formatPrice } from '@/shared/utils/format';
import type { CrossChainPriceDifference } from '@/types/oracle/comparison';

interface CrossChainPriceComparisonProps {
  data?: CrossChainPriceDifference[];
  isLoading?: boolean;
  chains?: string[];
  symbols?: string[];
}

export function CrossChainPriceComparison({
  data: propData,
  isLoading: propLoading,
  chains,
  symbols,
}: CrossChainPriceComparisonProps) {
  const { t } = useI18n();
  const [data, setData] = useState<CrossChainPriceDifference[] | undefined>(propData);
  const [isLoading, setIsLoading] = useState(propLoading ?? false);

  useEffect(() => {
    if (propData) {
      setData(propData);
    } else {
      setIsLoading(true);
      fetch(
        buildApiUrl('/api/comparison/cross-chain', {
          chains: chains?.join(','),
          symbols: symbols?.join(','),
        }),
      )
        .then((res) => res.json())
        .then((result) => {
          if (result.data) {
            setData(result.data);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [chains, symbols, propData]);

  const summaryStats = useMemo(() => {
    if (!data || data.length === 0) return null;

    const totalArbitrageOpp = data.filter((d) => d.arbitrageOpportunity).length;
    const avgSpread = data.reduce((sum, d) => sum + d.spread.percent, 0) / data.length;
    const maxSpread = Math.max(...data.map((d) => d.spread.percent));

    return {
      totalSymbols: data.length,
      totalArbitrageOpp,
      avgSpread,
      maxSpread,
    };
  }, [data]);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map((item) => ({
      symbol: item.symbol,
      spread: item.spread.percent * 100,
      arbitrage: item.arbitrageOpportunity ? item.arbitrageOpportunity.profitPercent * 100 : 0,
    }));
  }, [data]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="mb-6 grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('comparison.crossChain.title')}</CardTitle>
          <CardDescription>{t('comparison.status.noData')}</CardDescription>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
          <Info className="mr-2 h-5 w-5" />
          {t('comparison.crossChain.selectAssetPair')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">
              {t('comparison.crossChain.title')}
            </CardTitle>
            <CardDescription className="mt-1 text-sm text-muted-foreground">
              {t('comparison.crossChain.description')}
            </CardDescription>
          </div>
          {summaryStats && summaryStats.totalArbitrageOpp > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {summaryStats.totalArbitrageOpp} {t('comparison.crossChain.arbitrageOpportunities')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {summaryStats && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">
                {t('comparison.crossChain.totalSymbols')}
              </p>
              <p className="mt-1 text-2xl font-bold">{summaryStats.totalSymbols}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">
                {t('comparison.crossChain.avgSpread')}
              </p>
              <p className="mt-1 text-2xl font-bold">
                {(summaryStats.avgSpread * 100).toFixed(3)}%
              </p>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">
                {t('comparison.crossChain.maxSpread')}
              </p>
              <p className="mt-1 text-2xl font-bold text-red-600">
                {(summaryStats.maxSpread * 100).toFixed(3)}%
              </p>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">
                {t('comparison.crossChain.arbitrageOpp')}
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-600">
                {summaryStats.totalArbitrageOpp}
              </p>
            </div>
          </div>
        )}

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="symbol" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value.toFixed(2)}%`}
                tickLine={false}
              />
              <RechartsTooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-white p-3 text-sm shadow-lg">
                        <p className="mb-2 font-semibold">{label}</p>
                        <div className="space-y-1">
                          <p>
                            {t('comparison.crossChain.spread')}:{' '}
                            <span className="font-medium">{data.spread.toFixed(3)}%</span>
                          </p>
                          {data.arbitrage > 0 && (
                            <p className="text-amber-600">
                              {t('comparison.crossChain.arbitrageProfit')}:{' '}
                              <span className="font-medium">{data.arbitrage.toFixed(3)}%</span>
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={1} stroke="#f59e0b" strokeDasharray="3 3" />
              <ReferenceLine y={2} stroke="#ef4444" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="spread"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="arbitrage"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: '#f59e0b', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          {data.slice(0, 5).map((item, index) => (
            <div
              key={index}
              className="rounded-lg border border-border/50 bg-muted/20 p-4 transition-all hover:shadow-md"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{item.symbol}</span>
                  <Badge
                    variant={item.spread.percent > 0.02 ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    ±{(item.spread.percent * 100).toFixed(3)}%
                  </Badge>
                </div>
                {item.arbitrageOpportunity && (
                  <Badge variant="outline" className="gap-1 text-xs text-amber-600">
                    <ArrowRightLeft className="h-3 w-3" />
                    {t('comparison.crossChain.arbitrageAvailable')}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                {item.chains.slice(0, 4).map((chainData, idx) => (
                  <div key={idx}>
                    <p className="text-xs capitalize text-muted-foreground">{chainData.chain}</p>
                    <p className="font-medium">{formatPrice(chainData.price)}</p>
                    <p
                      className={cn(
                        'text-xs',
                        Math.abs(chainData.deviationPercent) > 0.01
                          ? 'text-red-600'
                          : 'text-muted-foreground',
                      )}
                    >
                      {(chainData.deviationPercent > 0 ? '+' : '') +
                        (chainData.deviationPercent * 100).toFixed(3)}
                      %
                    </p>
                  </div>
                ))}
              </div>

              {item.arbitrageOpportunity && (
                <div className="mt-3 flex items-center gap-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                  <TrendingUp className="h-4 w-4" />
                  <span>
                    {t('comparison.crossChain.buyOn')} {item.arbitrageOpportunity.buyChain},{' '}
                    {t('comparison.crossChain.sellOn')} {item.arbitrageOpportunity.sellChain} -{' '}
                    <span className="font-medium">
                      {t('comparison.crossChain.profit')}:{' '}
                      {(item.arbitrageOpportunity.profitPercent * 100).toFixed(2)}%
                    </span>
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {data.length > 5 && (
          <div className="text-center text-sm text-muted-foreground">
            {t('comparison.crossChain.showingSymbols', { count: 5, total: data.length })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
