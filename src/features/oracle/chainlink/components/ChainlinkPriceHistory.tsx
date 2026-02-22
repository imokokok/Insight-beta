'use client';

import { useState, useMemo, useCallback } from 'react';

import { TrendingUp, AlertTriangle, RefreshCw, Maximize2, Minimize2, Layers } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';

import { Button } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { usePriceHistory } from '@/features/oracle/analytics/deviation/hooks/usePriceHistory';
import { useI18n } from '@/i18n';
import { cn, formatPrice } from '@/shared/utils';

type TimeRangeKey = '1h' | '24h' | '7d' | '30d';

interface TimeRangeConfig {
  label: string;
  hours: number;
  limit: number;
}

const TIME_RANGE_CONFIG: Record<TimeRangeKey, TimeRangeConfig> = {
  '1h': { label: '1H', hours: 1, limit: 60 },
  '24h': { label: '24H', hours: 24, limit: 96 },
  '7d': { label: '7D', hours: 168, limit: 168 },
  '30d': { label: '30D', hours: 720, limit: 180 },
};

const ASSET_CONFIG = {
  'ETH/USD': { displaySymbol: 'ETH', color: '#3b82f6', gradientId: 'gradient-eth' },
  'BTC/USD': { displaySymbol: 'BTC', color: '#06b6d4', gradientId: 'gradient-btc' },
  'LINK/USD': { displaySymbol: 'LINK', color: '#a855f7', gradientId: 'gradient-link' },
};

type AssetSymbol = keyof typeof ASSET_CONFIG;

interface ChainlinkPriceHistoryProps {
  className?: string;
}

interface MultiAssetDataPoint {
  timestamp: number;
  formattedTime: string;
  [key: string]: number | string;
}

interface AssetPriceStats {
  symbol: AssetSymbol;
  displaySymbol: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  color: string;
}

const CustomTooltip = ({
  active,
  payload,
  label,
  selectedAssets,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: string;
  selectedAssets: AssetSymbol[];
}) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-border/50 bg-card/95 p-3 shadow-lg backdrop-blur-sm">
      <p className="mb-2 text-xs text-muted-foreground">{label}</p>
      {payload.map((entry, index) => {
        const assetKey = entry.dataKey.replace('Price', '') as AssetSymbol;
        const asset = ASSET_CONFIG[assetKey];
        if (!asset || !selectedAssets.includes(assetKey)) return null;
        return (
          <div key={index} className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: asset.color }} />
            <span className="text-muted-foreground">{asset.displaySymbol}:</span>
            <span className="font-mono font-medium">{formatPrice(entry.value)}</span>
          </div>
        );
      })}
    </div>
  );
};

const CustomLegend = ({
  payload,
  selectedAssets,
  onToggleAsset,
}: {
  payload?: Array<{ value: string; color: string; dataKey: string }>;
  selectedAssets: AssetSymbol[];
  onToggleAsset: (symbol: AssetSymbol) => void;
}) => {
  if (!payload) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
      {payload.map((entry, index) => {
        const assetKey = entry.dataKey.replace('Price', '') as AssetSymbol;
        const asset = ASSET_CONFIG[assetKey];
        if (!asset) return null;
        const isSelected = selectedAssets.includes(assetKey);

        return (
          <button
            key={index}
            onClick={() => onToggleAsset(assetKey)}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-all',
              isSelected ? 'bg-muted/50 hover:bg-muted' : 'opacity-40 hover:opacity-60',
            )}
          >
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: asset.color }} />
            <span className="font-medium">{asset.displaySymbol}</span>
          </button>
        );
      })}
    </div>
  );
};

export function ChainlinkPriceHistory({ className }: ChainlinkPriceHistoryProps) {
  const { t } = useI18n();
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRangeKey>('24h');
  const [selectedAssets, setSelectedAssets] = useState<AssetSymbol[]>(['ETH/USD']);
  const [compareMode, setCompareMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const timeRangeConfig = TIME_RANGE_CONFIG[selectedTimeRange];
  const startTime = useMemo(() => {
    const now = new Date();
    now.setHours(now.getHours() - timeRangeConfig.hours);
    return now;
  }, [timeRangeConfig.hours]);

  const assetsToFetch = compareMode ? (Object.keys(ASSET_CONFIG) as AssetSymbol[]) : selectedAssets;

  const ethHistory = usePriceHistory('chainlink', 'ETH/USD', {
    startTime,
    limit: timeRangeConfig.limit,
  });
  const btcHistory = usePriceHistory('chainlink', 'BTC/USD', {
    startTime,
    limit: timeRangeConfig.limit,
  });
  const linkHistory = usePriceHistory('chainlink', 'LINK/USD', {
    startTime,
    limit: timeRangeConfig.limit,
  });

  const historyMap: Record<AssetSymbol, typeof ethHistory> = {
    'ETH/USD': ethHistory,
    'BTC/USD': btcHistory,
    'LINK/USD': linkHistory,
  };

  const isLoading = assetsToFetch.some((asset) => historyMap[asset]?.isLoading);
  const isError = assetsToFetch.some((asset) => historyMap[asset]?.isError);
  const errorMessage = assetsToFetch.map((asset) => historyMap[asset]?.error).filter(Boolean)[0];

  const chartData = useMemo(() => {
    const dataByTimestamp = new Map<number, MultiAssetDataPoint>();

    assetsToFetch.forEach((assetSymbol) => {
      const history = historyMap[assetSymbol];
      if (!history?.data) return;

      history.data.forEach((record) => {
        const timestamp = new Date(record.timestamp).getTime();
        const existing = dataByTimestamp.get(timestamp);

        if (existing) {
          existing[`${assetSymbol}Price`] = record.price;
        } else {
          dataByTimestamp.set(timestamp, {
            timestamp,
            formattedTime: new Date(timestamp).toLocaleString(),
            [`${assetSymbol}Price`]: record.price,
          });
        }
      });
    });

    return Array.from(dataByTimestamp.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [assetsToFetch, ethHistory.data, btcHistory.data, linkHistory.data]);

  const priceStatsMap = useMemo(() => {
    const stats: AssetPriceStats[] = [];

    selectedAssets.forEach((assetSymbol) => {
      const history = historyMap[assetSymbol];
      if (!history?.data || history.data.length === 0) return;

      const prices = history.data.map((p) => p.price);
      const currentPrice = prices[prices.length - 1] ?? 0;
      const firstPrice = prices[0] ?? 0;
      const priceChange = currentPrice - firstPrice;
      const priceChangePercent = firstPrice !== 0 ? (priceChange / firstPrice) * 100 : 0;
      const highPrice = Math.max(...prices);
      const lowPrice = Math.min(...prices);

      const config = ASSET_CONFIG[assetSymbol];
      stats.push({
        symbol: assetSymbol,
        displaySymbol: config.displaySymbol,
        currentPrice,
        priceChange,
        priceChangePercent,
        highPrice,
        lowPrice,
        color: config.color,
      });
    });

    return stats;
  }, [selectedAssets, ethHistory.data, btcHistory.data, linkHistory.data]);

  const handleRefresh = useCallback(() => {
    assetsToFetch.forEach((asset) => {
      historyMap[asset]?.refresh();
    });
  }, [assetsToFetch]);

  const toggleAsset = useCallback((symbol: AssetSymbol) => {
    setSelectedAssets((prev) => {
      if (prev.includes(symbol)) {
        if (prev.length === 1) return prev;
        return prev.filter((s) => s !== symbol);
      }
      return [...prev, symbol];
    });
  }, []);

  const toggleCompareMode = useCallback(() => {
    setCompareMode((prev) => !prev);
    if (!compareMode) {
      setSelectedAssets(Object.keys(ASSET_CONFIG) as AssetSymbol[]);
    } else {
      setSelectedAssets(['ETH/USD']);
    }
  }, [compareMode]);

  const formatXAxisTime = (timestamp: number) => {
    const date = new Date(timestamp);
    if (selectedTimeRange === '1h') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    if (selectedTimeRange === '24h') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getAxisDomain = () => {
    if (selectedAssets.length === 0) return [0, 100];
    const allPrices: number[] = [];
    selectedAssets.forEach((asset) => {
      const history = historyMap[asset];
      if (history?.data) {
        allPrices.push(...history.data.map((d) => d.price));
      }
    });
    if (allPrices.length === 0) return [0, 100];
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    return [min * 0.99, max * 1.01];
  };

  if (isError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('chainlink.priceHistory.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
            <div>
              <p className="font-medium text-foreground">{t('common.error')}</p>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('common.retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(className, isFullscreen && 'fixed inset-4 z-50')}>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              {t('chainlink.priceHistory.title')}
            </CardTitle>
            {priceStatsMap.length === 1 && priceStatsMap[0] && (
              <CardDescription className="mt-0.5">
                <span
                  className={cn(
                    'font-mono text-xs font-medium',
                    priceStatsMap[0].priceChangePercent >= 0 ? 'text-emerald-500' : 'text-red-500',
                  )}
                >
                  {priceStatsMap[0].priceChangePercent >= 0 ? '+' : ''}
                  {priceStatsMap[0].priceChangePercent.toFixed(2)}%
                </span>{' '}
                {t('chainlink.priceHistory.inPeriod')}
              </CardDescription>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-1">
              {(Object.keys(ASSET_CONFIG) as AssetSymbol[]).map((symbol) => {
                const config = ASSET_CONFIG[symbol];
                const isSelected = selectedAssets.includes(symbol);
                return (
                  <Button
                    key={symbol}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleAsset(symbol)}
                    className={cn(
                      'h-7 px-2.5 text-xs transition-all',
                      isSelected && 'ring-2 ring-offset-1',
                    )}
                    style={{
                      ...(isSelected && {
                        borderColor: config.color,
                        boxShadow: `0 0 0 1px ${config.color}40`,
                      }),
                    }}
                  >
                    <span
                      className="mr-1 h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                    {config.displaySymbol}
                  </Button>
                );
              })}
            </div>
            <div className="flex items-center gap-1">
              {(Object.keys(TIME_RANGE_CONFIG) as TimeRangeKey[]).map((key) => (
                <Button
                  key={key}
                  variant={selectedTimeRange === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTimeRange(key)}
                  className="h-7 px-2 text-xs"
                >
                  {TIME_RANGE_CONFIG[key].label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant={compareMode ? 'default' : 'ghost'}
                size="sm"
                onClick={toggleCompareMode}
                className="h-7"
                title="Multi-asset comparison"
              >
                <Layers className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleRefresh} className="h-7">
                <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-7"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-lg bg-muted/30 p-3">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="mt-2 h-6 w-20" />
                </div>
              ))}
            </div>
            <Skeleton className="h-80 w-full" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <TrendingUp className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{t('chainlink.priceHistory.noData')}</p>
          </div>
        ) : (
          <>
            {priceStatsMap.length > 0 && (
              <div
                className={cn(
                  'grid gap-2',
                  priceStatsMap.length === 1
                    ? 'grid-cols-2 sm:grid-cols-4'
                    : priceStatsMap.length === 2
                      ? 'grid-cols-2 sm:grid-cols-2'
                      : 'grid-cols-1 sm:grid-cols-3',
                )}
              >
                {priceStatsMap.map((stats) => (
                  <div
                    key={stats.symbol}
                    className="rounded-lg bg-muted/30 p-2.5"
                    style={{
                      borderLeft: `3px solid ${stats.color}`,
                    }}
                  >
                    <div className="mb-1 flex items-center gap-1.5">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: stats.color }}
                      />
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {stats.displaySymbol}
                      </span>
                    </div>
                    <p className="font-mono text-base font-semibold">
                      {formatPrice(stats.currentPrice)}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px]">
                      <span
                        className={cn(
                          'font-mono',
                          stats.priceChangePercent >= 0 ? 'text-emerald-500' : 'text-red-500',
                        )}
                      >
                        {stats.priceChangePercent >= 0 ? '+' : ''}
                        {stats.priceChangePercent.toFixed(2)}%
                      </span>
                      <span className="text-muted-foreground">
                        H: {formatPrice(stats.highPrice)}
                      </span>
                      <span className="text-muted-foreground">
                        L: {formatPrice(stats.lowPrice)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ height: isFullscreen ? 'calc(100vh - 300px)' : 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    {(Object.keys(ASSET_CONFIG) as AssetSymbol[]).map((symbol) => {
                      const config = ASSET_CONFIG[symbol];
                      return (
                        <linearGradient
                          key={config.gradientId}
                          id={config.gradientId}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="5%" stopColor={config.color} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(148, 163, 184, 0.15)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatXAxisTime}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                    minTickGap={50}
                  />
                  <YAxis
                    domain={getAxisDomain()}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                    tickFormatter={(value: number) => {
                      if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
                      if (value >= 1) return `$${value.toFixed(0)}`;
                      return `$${value.toFixed(2)}`;
                    }}
                    width={60}
                  />
                  <Tooltip content={<CustomTooltip selectedAssets={selectedAssets} />} />
                  <Legend
                    content={
                      <CustomLegend selectedAssets={selectedAssets} onToggleAsset={toggleAsset} />
                    }
                  />
                  {(Object.keys(ASSET_CONFIG) as AssetSymbol[]).map((symbol) => {
                    const config = ASSET_CONFIG[symbol];
                    const isVisible = selectedAssets.includes(symbol);
                    return (
                      <Area
                        key={symbol}
                        type="monotone"
                        dataKey={`${symbol}Price`}
                        stroke={config.color}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill={`url(#${config.gradientId})`}
                        hide={!isVisible}
                        dot={false}
                        activeDot={{
                          r: 4,
                          fill: config.color,
                          stroke: 'hsl(var(--card))',
                          strokeWidth: 2,
                        }}
                      />
                    );
                  })}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
