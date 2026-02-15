'use client';

import React, { useState } from 'react';

import { Calendar, Download, Filter, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Brush,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGasPriceHistory } from '@/features/gas/hooks';
import { cn, formatChangePercent } from '@/shared/utils';

interface GasPriceHistoryViewerProps {
  chain: string;
  provider?: string;
  limit?: number;
  className?: string;
}

const PRICE_LEVEL_COLORS = {
  slow: '#10b981',
  average: '#3b82f6',
  fast: '#f59e0b',
  fastest: '#ef4444',
};

function formatPrice(value: number): string {
  return `$${(value / 1e9).toFixed(2)}`;
}

function formatTime(timestamp: string | Date): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(timestamp: string | Date): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function GasPriceHistoryViewer({
  chain,
  provider,
  limit = 100,
}: GasPriceHistoryViewerProps) {
  const [selectedPriceLevel, setSelectedPriceLevel] = useState<
    'slow' | 'average' | 'fast' | 'fastest'
  >('average');
  const [showChart, setShowChart] = useState(true);

  const {
    data: history,
    isLoading,
    mutate: refreshHistory,
  } = useGasPriceHistory(chain, provider, limit);

  const chartData = React.useMemo(() => {
    if (!history || !history.data) return [];

    const groupedByTime = new Map<string, Record<string, number>>();

    history.data.forEach((entry) => {
      const timeKey = new Date(entry.timestamp).toISOString().slice(0, 16);
      if (!groupedByTime.has(timeKey)) {
        groupedByTime.set(timeKey, {});
      }
      const group = groupedByTime.get(timeKey);
      if (group) {
        group[entry.priceLevel] = entry.price;
      }
    });

    return Array.from(groupedByTime.entries())
      .map(([time, prices]) => ({
        time: formatDate(time),
        timeFull: time,
        slow: prices.slow || 0,
        average: prices.average || 0,
        fast: prices.fast || 0,
        fastest: prices.fastest || 0,
      }))
      .sort((a, b) => a.timeFull.localeCompare(b.timeFull));
  }, [history]);

  const filteredHistory = React.useMemo(() => {
    if (!history || !history.data) return [];
    return history.data.filter((h) => h.priceLevel === selectedPriceLevel);
  }, [history, selectedPriceLevel]);

  const stats = React.useMemo(() => {
    if (filteredHistory.length === 0) return null;

    const prices = filteredHistory.map((h) => h.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const latest = prices[prices.length - 1] ?? 0;
    const previous = prices[0] ?? 0;
    const change = latest - previous;
    const changePercent = previous > 0 ? (change / previous) * 100 : 0;

    return { min, max, avg, change, changePercent };
  }, [filteredHistory]);

  const handleExport = () => {
    if (!history || !history.data) return;

    const csv = [
      'Time,Chain,Provider,Price Level,Price (USD)',
      ...history.data.map(
        (h) =>
          `${h.timestamp},${h.chain},${h.provider},${h.priceLevel},${(h.price / 1e9).toFixed(4)}`,
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gas-price-history-${chain}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!history || !history.data || history.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gas Price History</CardTitle>
          <CardDescription>No historical data available</CardDescription>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
          <TrendingUp className="mr-2 h-5 w-5" />
          Waiting for data...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">
              Gas Price History - {chain.toUpperCase()}
            </CardTitle>
            <CardDescription className="text-sm">
              {history.data.length} records from {provider || 'all providers'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowChart(!showChart)}>
              {showChart ? (
                <>
                  <Filter className="mr-1 h-4 w-4" />
                  Table
                </>
              ) : (
                <>
                  <TrendingUp className="mr-1 h-4 w-4" />
                  Chart
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-1 h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => refreshHistory()}>
              <Calendar className="mr-1 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Current</p>
              <p className="text-lg font-semibold text-blue-600">
                {formatPrice(filteredHistory[filteredHistory.length - 1]?.price || 0)}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Average</p>
              <p className="text-lg font-semibold text-gray-600">{formatPrice(stats.avg)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Min / Max</p>
              <p className="text-sm font-semibold">
                <span className="text-emerald-600">{formatPrice(stats.min)}</span>
                {' / '}
                <span className="text-red-600">{formatPrice(stats.max)}</span>
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Change</p>
              <div className="flex items-center gap-1">
                {stats.changePercent > 0.1 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                ) : stats.changePercent < -0.1 ? (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                ) : (
                  <Minus className="h-4 w-4 text-gray-600" />
                )}
                <p
                  className={cn(
                    'text-sm font-semibold',
                    stats.changePercent > 0.1
                      ? 'text-emerald-600'
                      : stats.changePercent < -0.1
                        ? 'text-red-600'
                        : 'text-gray-600',
                  )}
                >
                  {formatChangePercent(stats.changePercent / 100, 2, false)}
                </p>
              </div>
            </div>
          </div>
        )}

        {showChart ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => (value / 1e9).toFixed(1)}
                  stroke="#9ca3af"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(value) => `Time: ${value}`}
                  formatter={(value: number | undefined, name: string | undefined) => [
                    formatPrice(value || 0),
                    (name || '').charAt(0).toUpperCase() + (name || '').slice(1),
                  ]}
                />
                <Legend />
                <Brush dataKey="time" height={30} />
                <Area
                  type="monotone"
                  dataKey="slow"
                  stackId="1"
                  stroke={PRICE_LEVEL_COLORS.slow}
                  fill={PRICE_LEVEL_COLORS.slow}
                  fillOpacity={0.3}
                  name="Slow"
                />
                <Area
                  type="monotone"
                  dataKey="average"
                  stackId="1"
                  stroke={PRICE_LEVEL_COLORS.average}
                  fill={PRICE_LEVEL_COLORS.average}
                  fillOpacity={0.3}
                  name="Average"
                />
                <Area
                  type="monotone"
                  dataKey="fast"
                  stackId="1"
                  stroke={PRICE_LEVEL_COLORS.fast}
                  fill={PRICE_LEVEL_COLORS.fast}
                  fillOpacity={0.3}
                  name="Fast"
                />
                <Area
                  type="monotone"
                  dataKey="fastest"
                  stackId="1"
                  stroke={PRICE_LEVEL_COLORS.fastest}
                  fill={PRICE_LEVEL_COLORS.fastest}
                  fillOpacity={0.3}
                  name="Fastest"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="mb-4 flex items-center gap-2">
              <p className="text-sm font-medium">Price Level:</p>
              {(['slow', 'average', 'fast', 'fastest'] as const).map((level) => (
                <Badge
                  key={level}
                  variant={selectedPriceLevel === level ? 'default' : 'outline'}
                  className="cursor-pointer capitalize"
                  onClick={() => setSelectedPriceLevel(level)}
                >
                  {level}
                </Badge>
              ))}
            </div>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-background sticky top-0">
                  <tr className="border-b">
                    <th className="p-2 text-left font-medium">Time</th>
                    <th className="p-2 text-left font-medium">Provider</th>
                    <th className="p-2 text-right font-medium">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((entry, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="p-2">{formatTime(entry.timestamp)}</td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-xs">
                          {entry.provider}
                        </Badge>
                      </td>
                      <td className="p-2 text-right font-mono">{formatPrice(entry.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
