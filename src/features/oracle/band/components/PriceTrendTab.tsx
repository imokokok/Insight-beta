'use client';

import { useState, useEffect, useCallback } from 'react';

import { TrendingUp, TrendingDown, Clock, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { TIME_RANGES, BAND_ORACLE_SYMBOL_OPTIONS } from '@/config/constants';
import { useI18n } from '@/i18n';
import { logger } from '@/shared/logger';
import { fetchApiData, cn } from '@/shared/utils';

interface PricePoint {
  timestamp: string;
  price: number;
  sourceCount: number;
  deviation: number;
  isValid: boolean;
}

interface PriceData {
  symbol: string;
  chain: string;
  timeRange: string;
  priceHistory: PricePoint[];
}

interface PriceHistoryResponse {
  data: {
    count: number;
    data: Record<string, PriceData>;
    timeRange: string;
  };
}

export function PriceTrendTab() {
  const { t } = useI18n();
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['BTC/USD', 'ETH/USD']);
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [priceData, setPriceData] = useState<Record<string, PriceData> | null>(null);

  const fetchPriceData = useCallback(async () => {
    try {
      setLoading(true);
      const symbolsParam = selectedSymbols.join(',');
      const response = await fetchApiData<PriceHistoryResponse>(
        `/api/oracle/band/prices/history?symbols=${symbolsParam}&timeRange=${timeRange}`,
      );
      setPriceData(response.data.data);
    } catch (error) {
      logger.error('Failed to fetch price data:', { error });
    } finally {
      setLoading(false);
    }
  }, [selectedSymbols, timeRange]);

  useEffect(() => {
    fetchPriceData();
  }, [fetchPriceData]);

  const handleSymbolToggle = (symbol: string) => {
    setSelectedSymbols((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol],
    );
  };

  const getPriceChange = (data: PriceData) => {
    if (!data.priceHistory || data.priceHistory.length < 2) return 0;
    const first = data.priceHistory[0]!.price;
    const last = data.priceHistory[data.priceHistory.length - 1]!.price;
    return ((last - first) / first) * 100;
  };

  const getLatestPrice = (data: PriceData) => {
    if (!data.priceHistory || data.priceHistory.length === 0) return 0;
    return data.priceHistory[data.priceHistory.length - 1]!.price;
  };

  const chartData =
    priceData && selectedSymbols.length > 0 && priceData[selectedSymbols[0]!]?.priceHistory
      ? priceData[selectedSymbols[0]!]!.priceHistory.map((point, index) => {
          const dataPoint: Record<string, string | number> = {
            timestamp: new Date(point.timestamp).toLocaleTimeString(),
          };
          selectedSymbols.forEach((symbol) => {
            if (priceData[symbol]?.priceHistory[index]) {
              dataPoint[symbol] = priceData[symbol]!.priceHistory[index]!.price;
            }
          });
          return dataPoint;
        })
      : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium">{t('band.priceTrend.title')}</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchPriceData} disabled={loading}>
              <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
              {t('common.refresh')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-wrap gap-2">
              {BAND_ORACLE_SYMBOL_OPTIONS.map((symbol) => (
                <Badge
                  key={symbol.value}
                  variant={selectedSymbols.includes(symbol.value) ? 'default' : 'secondary'}
                  className="cursor-pointer"
                  onClick={() => handleSymbolToggle(symbol.value)}
                >
                  {symbol.label}
                </Badge>
              ))}
            </div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px]">
                <Clock className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGES.filter((r) => ['1h', '24h', '7d'].includes(r.value)).map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="mt-2 h-8 w-24" />
                <Skeleton className="mt-2 h-4 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {selectedSymbols.map((symbol) => {
            const data = priceData?.[symbol];
            if (!data) return null;

            const change = getPriceChange(data);
            const latestPrice = getLatestPrice(data);
            const isPositive = change >= 0;

            return (
              <Card key={symbol}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{symbol}</span>
                    {isPositive ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="mt-2 text-2xl font-bold">
                    $
                    {latestPrice.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div
                    className={cn('mt-1 text-sm', isPositive ? 'text-green-600' : 'text-red-600')}
                  >
                    {isPositive ? '+' : ''}
                    {change.toFixed(2)}%
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">{t('band.priceTrend.chartTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <div className="h-[300px] w-full overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 text-left font-medium">{t('common.table.time')}</th>
                    {selectedSymbols.map((symbol) => (
                      <th key={symbol} className="pb-2 text-right font-medium">
                        {symbol}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chartData.slice(0, 20).map((point, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 text-muted-foreground">{point.timestamp as string}</td>
                      {selectedSymbols.map((symbol) => (
                        <td key={symbol} className="py-2 text-right">
                          {(point[symbol] as number)?.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
