'use client';

import { useMemo, useState, memo } from 'react';

import { TrendingUp, Eye, EyeOff } from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/i18n';
import { formatPrice } from '@/shared/utils';

import type { CrossChainHistoricalResponse } from '../hooks/useCrossChain';

const CHAIN_COLORS: Record<string, string> = {
  ethereum: '#627eea',
  bsc: '#f0b90b',
  polygon: '#8247e5',
  avalanche: '#e84142',
  arbitrum: '#28a0f0',
  optimism: '#ff0420',
  base: '#0052ff',
  solana: '#9945ff',
};

interface CrossChainPriceChartProps {
  data?: CrossChainHistoricalResponse['data'];
  isLoading?: boolean;
  height?: number;
  showLegend?: boolean;
}

interface ChartDataPoint {
  timestamp: string;
  time: string;
  date: string;
  [chain: string]: string | number | undefined;
}

export const CrossChainPriceChart = memo(function CrossChainPriceChart({
  data,
  isLoading,
  height = 350,
  showLegend = true,
}: CrossChainPriceChartProps) {
  const { t } = useI18n();
  const [hiddenChains, setHiddenChains] = useState<Set<string>>(new Set());

  const chartData = useMemo((): ChartDataPoint[] => {
    if (!data?.dataPoints) return [];

    return data.dataPoints.map((point) => {
      const date = new Date(point.timestamp);
      const result: ChartDataPoint = {
        timestamp: point.timestamp,
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        avgPrice: point.avgPrice,
        medianPrice: point.medianPrice,
        maxDeviation: point.maxDeviation,
      };

      if (point.pricesByChain) {
        Object.entries(point.pricesByChain).forEach(([chain, price]) => {
          if (price !== null && price !== undefined) {
            result[chain] = price;
          }
        });
      }

      return result;
    });
  }, [data]);

  const availableChains = useMemo(() => {
    if (!chartData.length) return [];
    const chains = new Set<string>();
    chartData.forEach((point) => {
      Object.keys(point).forEach((key) => {
        if (CHAIN_COLORS[key]) {
          chains.add(key);
        }
      });
    });
    return Array.from(chains);
  }, [chartData]);

  const toggleChain = (chain: string) => {
    setHiddenChains((prev) => {
      const next = new Set(prev);
      if (next.has(chain)) {
        next.delete(chain);
      } else {
        next.add(chain);
      }
      return next;
    });
  };

  const visibleChains = availableChains.filter((chain) => !hiddenChains.has(chain));

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton style={{ height }} className="w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('crossChain.chart.priceTrend.title', { symbol: data?.symbol || 'Asset' })}
          </CardTitle>
          <CardDescription>{t('crossChain.chart.noData')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ height }} className="flex items-center justify-center text-muted-foreground">
            {t('crossChain.chart.waitingForData')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t('crossChain.chart.priceTrend.title', { symbol: data.symbol })}
            </CardTitle>
            <CardDescription>
              {t('crossChain.chart.priceTrend.description', { count: chartData.length })}
            </CardDescription>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {Object.keys(CHAIN_COLORS)
            .filter((chain) => availableChains.includes(chain) || hiddenChains.has(chain))
            .map((chain) => (
              <Button
                key={chain}
                variant={hiddenChains.has(chain) ? 'outline' : 'secondary'}
                size="sm"
                className="h-6 px-2 text-xs capitalize"
                onClick={() => toggleChain(chain)}
              >
                {hiddenChains.has(chain) ? (
                  <EyeOff className="h-3 w-3 mr-1" />
                ) : (
                  <Eye className="h-3 w-3 mr-1" />
                )}
                <span
                  className="w-2 h-2 rounded-full mr-1"
                  style={{ backgroundColor: CHAIN_COLORS[chain] }}
                />
                {chain}
              </Button>
            ))}
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
                tickFormatter={(value, index) => {
                  if (index === 0 || index === chartData.length - 1) return value;
                  return '';
                }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                domain={['auto', 'auto']}
                tickFormatter={(value) => formatPrice(value)}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  backgroundColor: 'white',
                }}
                formatter={(value, name) => {
                  const numValue = typeof value === 'number' ? value : 0;
                  const nameStr = String(name);
                  if (nameStr === 'avgPrice' || nameStr === 'medianPrice') {
                    return [formatPrice(numValue), t(`crossChain.chart.${nameStr}`)];
                  }
                  return [formatPrice(numValue), nameStr.charAt(0).toUpperCase() + nameStr.slice(1)];
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    const point = payload[0].payload as ChartDataPoint;
                    return `${point.date} ${point.time}`;
                  }
                  return String(label);
                }}
              />
              {showLegend && (
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={(value) => (
                    <span className="capitalize">{String(value)}</span>
                  )}
                />
              )}
              {visibleChains.map((chain) => (
                <Line
                  key={chain}
                  type="monotone"
                  dataKey={chain}
                  stroke={CHAIN_COLORS[chain]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
              <Line
                type="monotone"
                dataKey="avgPrice"
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                name={t('crossChain.chart.avgPrice')}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {data.summary && (
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                {t('crossChain.historical.avgDeviation')}
              </Badge>
              <span>{data.summary.avgPriceRangePercent.toFixed(2)}%</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                {t('crossChain.historical.maxDeviation')}
              </Badge>
              <span>{data.summary.maxObservedDeviation.toFixed(2)}%</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                {t('crossChain.historical.stableChain')}
              </Badge>
              <span className="capitalize">{data.summary.mostStableChain}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
