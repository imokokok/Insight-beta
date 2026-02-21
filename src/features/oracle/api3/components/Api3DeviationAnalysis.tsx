'use client';

import { useState, useEffect, useCallback } from 'react';

import { Activity, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { SkeletonList } from '@/components/ui';
import { TIME_RANGE_OPTIONS } from '@/config/constants';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

import { Api3DeviationTrendChart } from './Api3DeviationTrendChart';
import { DeviationMetricsCard } from './DeviationMetricsCard';
import { PriceComparisonChart } from './PriceComparisonChart';

import type {
  Api3DeviationData,
  ComparisonDeviation,
  DeviationMetrics,
  ProtocolPricePoint,
} from '../types/api3';

interface Api3DeviationAnalysisProps {
  symbol?: string;
  chain?: string;
  timeRange?: '1h' | '24h' | '7d' | '30d';
  className?: string;
}

const generateMockPricePoints = (timeRange: string): ProtocolPricePoint[] => {
  const now = Date.now();
  const points =
    timeRange === '1h' ? 60 : timeRange === '24h' ? 96 : timeRange === '7d' ? 168 : 720;
  const interval =
    timeRange === '1h'
      ? 60000
      : timeRange === '24h'
        ? 900000
        : timeRange === '7d'
          ? 600000
          : 3600000;

  const basePrice = 2450;
  let api3Price = basePrice;
  let chainlinkPrice = basePrice;
  let pythPrice = basePrice;

  return Array.from({ length: points }, (_, i) => {
    const api3Change = (Math.random() - 0.5) * 15;
    const chainlinkChange = (Math.random() - 0.5) * 15;
    const pythChange = (Math.random() - 0.5) * 15;

    api3Price = Math.max(api3Price + api3Change, 0);
    chainlinkPrice = Math.max(chainlinkPrice + chainlinkChange, 0);
    pythPrice = Math.max(pythPrice + pythChange, 0);

    return {
      timestamp: new Date(now - (points - 1 - i) * interval).toISOString(),
      api3Price,
      chainlinkPrice,
      pythPrice,
    };
  });
};

const calculateDeviationMetrics = (prices1: number[], prices2: number[]): DeviationMetrics => {
  if (prices1.length === 0 || prices2.length === 0) {
    return { mean: 0, max: 0, min: 0, stdDev: 0 };
  }

  const deviations: number[] = prices1.map((price1, index) => {
    const price2 = prices2[index] ?? price1;
    return ((price1 - price2) / price2) * 100;
  });

  const mean = deviations.reduce((sum, d) => sum + d, 0) / deviations.length;
  const max = Math.max(...deviations.map(Math.abs));
  const min = Math.min(...deviations.map(Math.abs));
  const variance =
    deviations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / deviations.length;
  const stdDev = Math.sqrt(variance);

  return { mean, max, min, stdDev };
};

export function Api3DeviationAnalysis({
  symbol = 'ETH',
  chain: _chain,
  timeRange: initialTimeRange = '24h',
  className,
}: Api3DeviationAnalysisProps) {
  const { t } = useI18n();
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>(initialTimeRange);
  const [data, setData] = useState<Api3DeviationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const pricePoints = generateMockPricePoints(timeRange);
      const api3Prices = pricePoints.map((p) => p.api3Price);
      const chainlinkPrices = pricePoints.map((p) => p.chainlinkPrice);
      const pythPrices = pricePoints.map((p) => p.pythPrice);

      const api3VsChainlink = calculateDeviationMetrics(api3Prices, chainlinkPrices);
      const api3VsPyth = calculateDeviationMetrics(api3Prices, pythPrices);

      const deviations: ComparisonDeviation = {
        api3VsChainlink,
        api3VsPyth,
      };

      setData({
        timeRange,
        symbol,
        pricePoints,
        deviations,
        generatedAt: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  }, [timeRange, symbol]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    fetchData();
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {t('api3.deviation.title') || 'API3 数据准确性与偏差分析'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonList count={3} />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                {t('api3.deviation.title') || 'API3 数据准确性与偏差分析'}
              </CardTitle>
              <CardDescription>
                {t('api3.deviation.description') || '对比 API3 与其他预言机的价格数据准确性与偏差'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border p-1">
                {TIME_RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTimeRange(option.value)}
                    className={cn(
                      'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                      timeRange === option.value
                        ? 'text-primary-foreground bg-primary'
                        : 'hover:bg-muted',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="icon" onClick={handleRefresh}>
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <DeviationMetricsCard deviations={data.deviations} />
        <div className="space-y-6">
          <PriceComparisonChart pricePoints={data.pricePoints} symbol={symbol} />
        </div>
      </div>

      <Api3DeviationTrendChart pricePoints={data.pricePoints} />
    </div>
  );
}
