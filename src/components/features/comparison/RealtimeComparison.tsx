'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';

import {
  Activity,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Wifi,
  WifiOff,
  Filter,
  Download,
} from 'lucide-react';
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

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/i18n';
import { statusColors } from '@/lib/constants/colors';
import type { RealtimeComparisonItem, ComparisonFilter } from '@/types/oracle';
import { cn, formatPrice } from '@/shared/utils';

interface RealtimeComparisonProps {
  data?: RealtimeComparisonItem[];
  isLoading?: boolean;
  isLive?: boolean;
  onRefresh?: () => void;
  lastUpdated?: Date;
  filter?: ComparisonFilter;
  onFilterChange?: (filter: ComparisonFilter) => void;
}

const protocolColors: Record<string, string> = {
  chainlink: '#375bd2',
  pyth: '#e6c35c',
  band: '#516ff5',
  api3: '#7ce3cb',
  redstone: '#ff6b6b',
  switchboard: '#a855f7',
  flux: '#3b82f6',
  dia: '#10b981',
  uma: '#f59e0b',
  insight: '#8b5cf6',
};

function formatDeviation(value: number): string {
  // value 是小数形式 (如 0.01 = 1%)，转换为百分比显示
  const percentValue = Math.abs(value) * 100;
  if (percentValue < 0.01) return '<0.01%';
  return `${percentValue.toFixed(2)}%`;
}

function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function RealtimeComparisonView({
  data,
  isLoading,
  isLive = false,
  onRefresh,
  lastUpdated,
  filter,
  onFilterChange,
}: RealtimeComparisonProps) {
  const { t } = useI18n();
  void filter;
  void onFilterChange;
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'symbol' | 'deviation' | 'spread'>('spread');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Auto-scroll effect for live updates
  useEffect(() => {
    if (isLive && data && data.length > 0 && !selectedSymbol) {
      const firstItem = data[0];
      if (firstItem) {
        setSelectedSymbol(firstItem.symbol);
      }
    }
  }, [isLive, data, selectedSymbol]);

  const sortedData = useMemo(() => {
    if (!data) return [];

    return [...data].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'deviation': {
          const maxDevA = Math.max(...a.protocols.map((p) => Math.abs(p.deviationFromConsensus)));
          const maxDevB = Math.max(...b.protocols.map((p) => Math.abs(p.deviationFromConsensus)));
          comparison = maxDevA - maxDevB;
          break;
        }
        case 'spread':
          comparison = a.spread.percent - b.spread.percent;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortField, sortDirection]);

  const selectedItem = useMemo(() => {
    if (!selectedSymbol || !data) return null;
    return data.find((item) => item.symbol === selectedSymbol) || null;
  }, [selectedSymbol, data]);

  const chartData = useMemo(() => {
    if (!selectedItem) return [];

    return selectedItem.protocols.map((p) => ({
      protocol: p.protocol,
      price: p.price,
      deviation: p.deviationFromConsensus,
      latency: p.latency,
      confidence: p.confidence,
    }));
  }, [selectedItem]);

  const handleSort = useCallback(
    (field: typeof sortField) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDirection('desc');
      }
    },
    [sortField],
  );

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="mt-1 h-4 w-72" />
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('comparison.realtime.title')}</CardTitle>
          <CardDescription>{t('comparison.status.noData')}</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground flex h-64 items-center justify-center">
          <Activity className="mr-2 h-5 w-5" />
          {t('comparison.realtime.waitingForData')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              {t('comparison.realtime.title')}
              {isLive && (
                <Badge variant="default" className="animate-pulse gap-1 bg-emerald-500 text-white">
                  <Wifi className="h-3 w-3" />
                  {t('comparison.realtime.liveBadge')}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-1 text-sm">
              {t('comparison.realtime.description')}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-muted-foreground text-xs">
                {t('comparison.realtime.updatedAt')} {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
              <RefreshCw className={cn('mr-1 h-4 w-4', isLoading && 'animate-spin')} />
              {t('comparison.controls.refresh')}
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-1 h-4 w-4" />
              {t('comparison.controls.export')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-muted/20 rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">
              {t('comparison.realtime.monitoredAssets')}
            </p>
            <p className="text-xl font-bold">{data.length}</p>
          </div>
          <div className="bg-muted/20 rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">
              {t('comparison.realtime.activeProtocols')}
            </p>
            <p className="text-xl font-bold">
              {new Set(data.flatMap((d) => d.protocols.map((p) => p.protocol))).size}
            </p>
          </div>
          <div className="bg-muted/20 rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">{t('comparison.realtime.maxSpread')}</p>
            <p className="text-xl font-bold text-amber-600">
              {(Math.max(...data.map((d) => d.spread.percent)) * 100).toFixed(2)}%
            </p>
          </div>
          <div className="bg-muted/20 rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">{t('comparison.realtime.avgLatency')}</p>
            <p className="text-xl font-bold">
              {formatLatency(
                data.flatMap((d) => d.protocols).reduce((sum, p) => sum + p.latency, 0) /
                  data.flatMap((d) => d.protocols).length,
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Price List */}
          <div className="overflow-hidden rounded-lg border">
            <div className="bg-muted/30 flex items-center justify-between border-b p-3">
              <span className="text-sm font-medium">{t('comparison.table.assetPair')}</span>
              <div className="flex items-center gap-4 text-xs">
                <button
                  onClick={() => handleSort('symbol')}
                  className={cn(
                    'hover:text-primary transition-colors',
                    sortField === 'symbol' && 'text-primary font-medium',
                  )}
                >
                  {t('comparison.realtime.name')}{' '}
                  {sortField === 'symbol' && (sortDirection === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => handleSort('spread')}
                  className={cn(
                    'hover:text-primary transition-colors',
                    sortField === 'spread' && 'text-primary font-medium',
                  )}
                >
                  {t('comparison.realtime.spread')}{' '}
                  {sortField === 'spread' && (sortDirection === 'asc' ? '↑' : '↓')}
                </button>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {sortedData.map((item) => {
                const maxDeviation = Math.max(
                  ...item.protocols.map((p) => Math.abs(p.deviationFromConsensus)),
                );
                const isSelected = selectedSymbol === item.symbol;

                return (
                  <button
                    key={item.symbol}
                    onClick={() => setSelectedSymbol(item.symbol)}
                    className={cn(
                      'hover:bg-muted/30 flex w-full items-center justify-between border-b p-3 text-left transition-colors',
                      isSelected && 'bg-primary/5 border-primary/20',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'h-2 w-2 rounded-full',
                          maxDeviation > 1
                            ? statusColors.critical.dot
                            : maxDeviation > 0.5
                              ? statusColors.warning.dot
                              : statusColors.healthy.dot,
                        )}
                        role="status"
                        aria-label={
                          maxDeviation > 1
                            ? t('status.critical')
                            : maxDeviation > 0.5
                              ? t('status.warning')
                              : t('status.healthy')
                        }
                      />
                      <div>
                        <p className="text-sm font-medium">{item.symbol}</p>
                        <p className="text-muted-foreground text-xs">
                          {item.protocols.length} {t('comparison.realtime.protocols')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm">{formatPrice(item.consensus.median)}</p>
                      <Badge
                        variant={
                          item.spread.percent > 0.01
                            ? 'destructive'
                            : item.spread.percent > 0.005
                              ? 'secondary'
                              : 'default'
                        }
                        className="mt-1 text-xs"
                      >
                        ±{(item.spread.percent * 100).toFixed(2)}%
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detail View */}
          <div className="space-y-4">
            {selectedItem ? (
              <>
                {/* Price Chart */}
                <div className="h-48 rounded-lg border p-4">
                  <h4 className="mb-2 text-sm font-medium">
                    {selectedItem.symbol} - {t('comparison.realtime.protocolPriceDistribution')}
                  </h4>
                  <ResponsiveContainer width="100%" height="85%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="protocol"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => value.slice(0, 4)}
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        domain={['auto', 'auto']}
                        tickFormatter={(value) => formatPrice(value)}
                      />
                      <RechartsTooltip
                        formatter={(value: number | undefined) => {
                          if (value === undefined) return ['', t('comparison.realtime.price')];
                          return [formatPrice(value), t('comparison.realtime.price')];
                        }}
                      />
                      <ReferenceLine
                        y={selectedItem.consensus.median}
                        stroke="#8b5cf6"
                        strokeDasharray="3 3"
                        label={{
                          value: t('comparison.realtime.median'),
                          position: 'right',
                          fontSize: 10,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={{ fill: '#8b5cf6', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Protocol Details */}
                <div className="overflow-hidden rounded-lg border">
                  <div className="bg-muted/30 flex items-center justify-between border-b p-3">
                    <span className="text-sm font-medium">
                      {t('comparison.realtime.protocolDetails')}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {t('comparison.realtime.deviationFromConsensus')}
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {selectedItem.protocols
                      .sort(
                        (a, b) =>
                          Math.abs(b.deviationFromConsensus) - Math.abs(a.deviationFromConsensus),
                      )
                      .map((protocol) => {
                        const isPositive = protocol.deviationFromConsensus >= 0;
                        const isStale = protocol.status === 'stale';

                        return (
                          <div
                            key={protocol.protocol}
                            className="hover:bg-muted/20 flex items-center justify-between border-b p-3"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{
                                  backgroundColor: protocolColors[protocol.protocol] || '#888',
                                }}
                              />
                              <div>
                                <p className="text-sm font-medium capitalize">
                                  {protocol.protocol}
                                </p>
                                <p className="text-muted-foreground flex items-center gap-1 text-xs">
                                  <Clock className="h-3 w-3" />
                                  {formatLatency(protocol.latency)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-mono text-sm">{formatPrice(protocol.price)}</p>
                              <div className="flex items-center justify-end gap-1">
                                {isStale ? (
                                  <Badge variant="secondary" className="text-xs">
                                    <WifiOff className="mr-1 h-3 w-3" />
                                    {t('comparison.status.stale')}
                                  </Badge>
                                ) : (
                                  <span
                                    className={cn(
                                      'flex items-center text-xs',
                                      isPositive ? 'text-emerald-600' : 'text-red-600',
                                    )}
                                  >
                                    {isPositive ? (
                                      <ArrowUpRight className="h-3 w-3" />
                                    ) : (
                                      <ArrowDownRight className="h-3 w-3" />
                                    )}
                                    {formatDeviation(protocol.deviationFromConsensus)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Consensus Info */}
                <div className="bg-muted/20 rounded-lg border p-3">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-muted-foreground text-xs">
                        {t('comparison.realtime.median')}
                      </p>
                      <p className="font-mono font-medium">
                        {formatPrice(selectedItem.consensus.median)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">
                        {t('comparison.realtime.mean')}
                      </p>
                      <p className="font-mono font-medium">
                        {formatPrice(selectedItem.consensus.mean)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">
                        {t('comparison.realtime.spreadRange')}
                      </p>
                      <p className="font-mono font-medium">
                        {formatPrice(selectedItem.spread.absolute)}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-muted-foreground flex h-64 items-center justify-center rounded-lg border">
                <Filter className="mr-2 h-5 w-5" />
                {t('comparison.realtime.selectAssetPair')}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
