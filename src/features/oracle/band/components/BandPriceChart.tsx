'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import { TrendingUp, AlertTriangle, RefreshCw, CheckCircle, Clock } from 'lucide-react';

import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useI18n } from '@/i18n';
import { cn, formatTime } from '@/shared/utils';

export interface PriceDataPoint {
  timestamp: string;
  price: number;
  volume?: number;
  sourceCount: number;
  deviation: number;
  isValid: boolean;
}

export interface AggregationStatus {
  totalSources: number;
  activeSources: number;
  lastUpdate: string;
  avgResponseTime: number;
  status: 'healthy' | 'degraded' | 'error';
}

interface BandPriceChartProps {
  symbol: string;
  chain?: string;
  timeRange?: '1h' | '24h' | '7d';
  className?: string;
}

interface CachedPriceData {
  data: PriceDataPoint[];
  aggregationStatus: AggregationStatus | null;
  timestamp: number;
  symbol: string;
  chain: string;
  timeRange: string;
}

const TIME_RANGE_CONFIG = {
  '1h': { label: '1H', cacheTtl: 30000 },
  '24h': { label: '24H', cacheTtl: 60000 },
  '7d': { label: '7D', cacheTtl: 120000 },
};

const CACHE_KEY_PREFIX = 'band_price_cache_';
const DEFAULT_CACHE_TTL = 60000;

function getCacheKey(symbol: string, chain: string, timeRange: string): string {
  return `${CACHE_KEY_PREFIX}${symbol}_${chain}_${timeRange}`;
}

function getFromCache(key: string): CachedPriceData | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const data: CachedPriceData = JSON.parse(cached);
    const now = Date.now();
    const config = TIME_RANGE_CONFIG[data.timeRange as keyof typeof TIME_RANGE_CONFIG];
    const ttl = config?.cacheTtl ?? DEFAULT_CACHE_TTL;

    if (now - data.timestamp > ttl) {
      localStorage.removeItem(key);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function setToCache(key: string, data: CachedPriceData): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Storage full or unavailable
  }
}

const getDeviationColor = (deviation: number): string => {
  const absDeviation = Math.abs(deviation);
  if (absDeviation >= 5) return '#dc2626';
  if (absDeviation >= 2) return '#ea580c';
  if (absDeviation >= 1) return '#f97316';
  return '#22c55e';
};

interface SVGPriceChartProps {
  data: PriceDataPoint[];
  width: number;
  height: number;
  priceStats: {
    currentPrice: number;
    highPrice: number;
    lowPrice: number;
    priceChangePercent: number;
  } | null;
  onPointHover?: (point: PriceDataPoint | null) => void;
}

function SVGPriceChart({ data, width, height, priceStats, onPointHover }: SVGPriceChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length < 2 || !priceStats) return null;

  const padding = { top: 20, right: 60, bottom: 30, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const prices = data.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const getX = (index: number) => padding.left + (index / (data.length - 1)) * chartWidth;
  const getY = (price: number) =>
    padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;

  const pathData = data
    .map((point, index) => {
      const x = getX(index);
      const y = getY(point.price);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  const areaPath = `${pathData} L ${getX(data.length - 1)} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

  const isPositive = priceStats.priceChangePercent >= 0;
  const lineColor = isPositive ? '#22c55e' : '#ef4444';
  const gradientStart = isPositive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)';
  const gradientEnd = isPositive ? 'rgba(34, 197, 94, 0)' : 'rgba(239, 68, 68, 0)';

  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) => {
    return minPrice + (priceRange * i) / (yTicks - 1);
  });

  const xTicks = Math.min(6, data.length);
  const xTickIndices = Array.from({ length: xTicks }, (_, i) =>
    Math.floor((i * (data.length - 1)) / (xTicks - 1)),
  );

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relativeX = x - padding.left;

    if (relativeX < 0 || relativeX > chartWidth) {
      setHoveredIndex(null);
      onPointHover?.(null);
      return;
    }

    const index = Math.round((relativeX / chartWidth) * (data.length - 1));
    const clampedIndex = Math.max(0, Math.min(data.length - 1, index));

    setHoveredIndex(clampedIndex);
    onPointHover?.(data[clampedIndex] ?? null);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    onPointHover?.(null);
  };

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="w-full"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <defs>
        <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={gradientStart} />
          <stop offset="100%" stopColor={gradientEnd} />
        </linearGradient>
      </defs>

      {yTickValues.map((value, i) => {
        const y = getY(value);
        return (
          <g key={`y-tick-${i}`}>
            <line
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="currentColor"
              strokeDasharray="3 3"
              className="text-muted/30"
            />
            <text
              x={width - padding.right + 5}
              y={y + 4}
              fontSize="11"
              className="fill-muted-foreground"
            >
              ${value.toFixed(2)}
            </text>
          </g>
        );
      })}

      {xTickIndices.map((index) => {
        const point = data[index];
        if (!point) return null;
        const x = getX(index);
        const date = new Date(point.timestamp);
        const label = date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });

        return (
          <g key={`x-tick-${index}`}>
            <line
              x1={x}
              y1={padding.top + chartHeight}
              x2={x}
              y2={padding.top + chartHeight + 5}
              stroke="currentColor"
              className="text-muted/30"
            />
            <text
              x={x}
              y={height - 8}
              fontSize="11"
              textAnchor="middle"
              className="fill-muted-foreground"
            >
              {label}
            </text>
          </g>
        );
      })}

      <path d={areaPath} fill="url(#priceGradient)" />

      <path
        d={pathData}
        fill="none"
        stroke={lineColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {hoveredIndex !== null && data[hoveredIndex] && (
        <g>
          <line
            x1={getX(hoveredIndex)}
            y1={padding.top}
            x2={getX(hoveredIndex)}
            y2={padding.top + chartHeight}
            stroke={lineColor}
            strokeDasharray="3 3"
            opacity={0.5}
          />
          <circle
            cx={getX(hoveredIndex)}
            cy={getY(data[hoveredIndex]!.price)}
            r={5}
            fill={lineColor}
            stroke="white"
            strokeWidth={2}
          />
        </g>
      )}
    </svg>
  );
}

export function BandPriceChart({
  symbol,
  chain = 'cosmos',
  timeRange = '24h',
  className,
}: BandPriceChartProps) {
  const { t } = useI18n();
  const [priceData, setPriceData] = useState<PriceDataPoint[]>([]);
  const [aggregationStatus, setAggregationStatus] = useState<AggregationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d'>(timeRange);
  const [hoveredPoint, setHoveredPoint] = useState<PriceDataPoint | null>(null);
  const [chartDimensions, setChartDimensions] = useState({ width: 600, height: 280 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setChartDimensions({ width: Math.max(300, width), height: 280 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const cacheKey = getCacheKey(symbol, chain, selectedTimeRange);
    const cached = getFromCache(cacheKey);

    if (cached) {
      setPriceData(cached.data);
      setAggregationStatus(cached.aggregationStatus);
      setIsLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({
        symbol,
        chain,
        timeRange: selectedTimeRange,
      });

      const response = await fetch(`/api/oracle/band/prices/history?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch price data');
      }
      const result = await response.json();

      if (result.success && result.data) {
        const { priceHistory, aggregationStatus: status } = result.data;
        setPriceData(priceHistory ?? []);
        setAggregationStatus(status ?? null);

        setToCache(cacheKey, {
          data: priceHistory ?? [],
          aggregationStatus: status ?? null,
          timestamp: Date.now(),
          symbol,
          chain,
          timeRange: selectedTimeRange,
        });
      } else {
        setPriceData([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setPriceData([]);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, chain, selectedTimeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const priceStats = useMemo(() => {
    if (priceData.length === 0) return null;

    const prices = priceData.map((p) => p.price);
    const currentPrice = prices[prices.length - 1] ?? 0;
    const firstPrice = prices[0] ?? 0;
    const priceChange = currentPrice - firstPrice;
    const priceChangePercent = firstPrice !== 0 ? (priceChange / firstPrice) * 100 : 0;
    const highPrice = Math.max(...prices);
    const lowPrice = Math.min(...prices);
    const avgDeviation =
      priceData.reduce((sum, p) => sum + Math.abs(p.deviation), 0) / priceData.length;

    return {
      currentPrice,
      priceChange,
      priceChangePercent,
      highPrice,
      lowPrice,
      avgDeviation,
    };
  }, [priceData]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {symbol} {t('band.priceChart.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {symbol} {t('band.priceChart.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
            <div>
              <p className="font-medium text-foreground">{t('common.error')}</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('common.retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (priceData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {symbol} {t('band.priceChart.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <TrendingUp className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{t('band.priceChart.noData')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {symbol} {t('band.priceChart.title')}
            </CardTitle>
            {priceStats && (
              <CardDescription className="mt-1">
                <span
                  className={cn(
                    'font-mono font-medium',
                    priceStats.priceChangePercent >= 0 ? 'text-emerald-500' : 'text-red-500',
                  )}
                >
                  {priceStats.priceChangePercent >= 0 ? '+' : ''}
                  {priceStats.priceChangePercent.toFixed(2)}%
                </span>{' '}
                {t('band.priceChart.inPeriod')}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            {Object.entries(TIME_RANGE_CONFIG).map(([key, config]) => (
              <Button
                key={key}
                variant={selectedTimeRange === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTimeRange(key as '1h' | '24h' | '7d')}
                className="h-8 px-3 text-xs"
              >
                {config.label}
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={fetchData} className="ml-2">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {priceStats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{t('band.priceChart.currentPrice')}</p>
              <p className="mt-1 font-mono text-lg font-semibold">
                ${priceStats.currentPrice.toFixed(4)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{t('band.priceChart.high')}</p>
              <p className="mt-1 font-mono text-lg font-semibold text-emerald-500">
                ${priceStats.highPrice.toFixed(4)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{t('band.priceChart.low')}</p>
              <p className="mt-1 font-mono text-lg font-semibold text-red-500">
                ${priceStats.lowPrice.toFixed(4)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{t('band.priceChart.avgDeviation')}</p>
              <p
                className="mt-1 font-mono text-lg font-semibold"
                style={{ color: getDeviationColor(priceStats.avgDeviation) }}
              >
                {(priceStats.avgDeviation * 100).toFixed(2)}%
              </p>
            </div>
          </div>
        )}

        {hoveredPoint && priceStats && (
          <div className="rounded-lg border bg-muted/50 p-2 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{formatTime(hoveredPoint.timestamp)}</span>
              <span className="font-mono font-semibold">${hoveredPoint.price.toFixed(4)}</span>
            </div>
          </div>
        )}

        <div ref={containerRef} className="h-72 w-full">
          <SVGPriceChart
            data={priceData}
            width={chartDimensions.width}
            height={chartDimensions.height}
            priceStats={priceStats}
            onPointHover={setHoveredPoint}
          />
        </div>

        {aggregationStatus && (
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">{t('band.priceChart.aggregationStatus')}</span>
              <StatusBadge
                status={
                  aggregationStatus.status === 'healthy'
                    ? 'active'
                    : aggregationStatus.status === 'degraded'
                      ? 'warning'
                      : 'offline'
                }
                text={aggregationStatus.status}
                size="sm"
              />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                <span>
                  {aggregationStatus.activeSources}/{aggregationStatus.totalSources}{' '}
                  {t('band.priceChart.activeSources')}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {t('band.priceChart.lastUpdate')}: {formatTime(aggregationStatus.lastUpdate)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>
                  {t('band.priceChart.avgResponse')}: {aggregationStatus.avgResponseTime}ms
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
