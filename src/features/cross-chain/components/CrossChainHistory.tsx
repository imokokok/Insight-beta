'use client';

import { useState, useMemo } from 'react';

import { RefreshCw, Filter, Calendar } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CrossChainHistoricalCard,
  CrossChainPriceChart,
  CrossChainDeviationChart,
} from '@/features/cross-chain';
import { useCrossChainHistory } from '@/features/cross-chain/hooks';
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

interface CrossChainHistoryProps {
  className?: string;
}

export function CrossChainHistory({ className }: CrossChainHistoryProps) {
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
    data: historyData,
    isLoading: historyLoading,
    mutate: refreshHistory,
  } = useCrossChainHistory(
    selectedSymbol,
    timeRangeDates.startTime.toISOString(),
    timeRangeDates.endTime.toISOString(),
    timeRange === '24h' ? '1hour' : '1day',
  );

  const handleChainToggle = (chain: string) => {
    setSelectedChains((prev) =>
      prev.includes(chain) ? prev.filter((c) => c !== chain) : [...prev, chain],
    );
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('crossChain.historical.title')}</h1>
          <p className="mt-1 text-muted-foreground">{t('crossChain.historical.description')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refreshHistory()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('crossChain.controls.refresh')}
        </Button>
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

      <CrossChainHistoricalCard data={historyData?.data} isLoading={historyLoading} />

      <CrossChainPriceChart data={historyData?.data} isLoading={historyLoading} height={350} />

      <CrossChainDeviationChart data={historyData?.data} isLoading={historyLoading} height={250} />
    </div>
  );
}
