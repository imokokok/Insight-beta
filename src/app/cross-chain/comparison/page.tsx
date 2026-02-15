'use client';

import { useState, useCallback, useMemo } from 'react';

import { RefreshCw, Filter, Calendar, TrendingUp, Minus, DollarSign } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CrossChainComparisonCard,
  CrossChainPriceChart,
  CrossChainComparisonBar,
} from '@/features/cross-chain';
import { useCrossChainComparison, useCrossChainHistory } from '@/features/cross-chain/hooks';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

const AVAILABLE_SYMBOLS = ['BTC', 'ETH', 'SOL', 'LINK', 'AVAX', 'MATIC', 'UNI', 'AAVE'];
const AVAILABLE_CHAINS = [
  'ethereum',
  'bsc',
  'polygon',
  'avalanche',
  'arbitrum',
  'optimism',
  'base',
];
const TIME_RANGES = [
  { value: '24h', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
];

export default function CrossChainComparisonPage() {
  const { t } = useI18n();

  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC');
  const [selectedChains, setSelectedChains] = useState<string[]>(AVAILABLE_CHAINS);
  const [timeRange, setTimeRange] = useState<string>('7d');

  const timeRangeDates = useMemo(() => {
    const now = new Date();
    const hours = {
      '24h': 24,
      '7d': 24 * 7,
      '30d': 24 * 30,
      '90d': 24 * 90,
    };
    const startTime = new Date(
      now.getTime() - (hours[timeRange as keyof typeof hours] || 24) * 60 * 60 * 1000,
    );
    return { startTime, endTime: now };
  }, [timeRange]);

  const {
    data: comparisonData,
    isLoading: comparisonLoading,
    mutate: refreshComparison,
  } = useCrossChainComparison(selectedSymbol, selectedChains);

  const {
    data: historyData,
    isLoading: historyLoading,
  } = useCrossChainHistory(
    selectedSymbol,
    timeRangeDates.startTime.toISOString(),
    timeRangeDates.endTime.toISOString(),
    timeRange === '24h' ? '1hour' : '1day',
  );

  const chartPrices = useMemo(() => {
    if (!comparisonData?.data) return [];
    return comparisonData.data.pricesByChain.map((p) => ({
      chain: p.chain,
      price: p.price,
      deviationFromAvg: comparisonData.data!.statistics.avgPrice - p.price,
    }));
  }, [comparisonData]);

  const stats = useMemo(() => {
    if (!comparisonData?.data) {
      return {
        priceRangePercent: 0,
        maxDeviation: 0,
        chainsCount: 0,
      };
    }
    const { statistics, pricesByChain } = comparisonData.data;
    return {
      priceRangePercent: statistics.priceRangePercent,
      maxDeviation: statistics.priceRangePercent,
      chainsCount: pricesByChain.length,
    };
  }, [comparisonData]);

  const handleChainToggle = useCallback((chain: string) => {
    setSelectedChains((prev) =>
      prev.includes(chain) ? prev.filter((c) => c !== chain) : [...prev, chain],
    );
  }, []);

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('crossChain.comparison.title')}</h1>
          <p className="mt-1 text-muted-foreground">
            {t('crossChain.comparison.description', { count: selectedChains.length })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refreshComparison()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('crossChain.controls.refresh')}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monitored Chains</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.chainsCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Price Range</CardTitle>
            <Minus className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              'text-2xl font-bold',
              stats.priceRangePercent > 2 ? 'text-red-600' : stats.priceRangePercent > 0.5 ? 'text-yellow-600' : 'text-green-600'
            )}>
              {stats.priceRangePercent.toFixed(2)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              'text-2xl font-bold capitalize',
              stats.priceRangePercent > 2 ? 'text-red-600' : stats.priceRangePercent > 0.5 ? 'text-yellow-600' : 'text-green-600'
            )}>
              {stats.priceRangePercent > 2 ? 'Critical' : stats.priceRangePercent > 0.5 ? 'Warning' : 'Normal'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('crossChain.controls.symbol')}:</span>
              <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_SYMBOLS.map((symbol) => (
                    <SelectItem key={symbol} value={symbol}>
                      {symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t('crossChain.controls.chains')}:</span>
              <div className="flex flex-wrap gap-1">
                {AVAILABLE_CHAINS.map((chain) => (
                  <Button
                    key={chain}
                    variant={selectedChains.includes(chain) ? 'default' : 'outline'}
                    size="sm"
                    className="capitalize"
                    onClick={() => handleChainToggle(chain)}
                  >
                    {chain}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('crossChain.controls.timeRange')}:</span>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGES.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <CrossChainComparisonCard
        data={comparisonData?.data}
        isLoading={comparisonLoading}
        onRefresh={refreshComparison}
        selectedChains={selectedChains}
        onChainSelect={handleChainToggle}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <CrossChainPriceChart data={historyData?.data} isLoading={historyLoading} height={350} />
        <CrossChainComparisonBar prices={chartPrices} isLoading={comparisonLoading} height={350} />
      </div>
    </div>
  );
}
