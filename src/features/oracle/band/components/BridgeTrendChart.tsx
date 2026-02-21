'use client';

import { useState, useMemo, useRef, useEffect } from 'react';

import { TrendingUp, Activity, Clock } from 'lucide-react';

import { Button } from '@/components/ui';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { cn } from '@/shared/utils';

import type { BridgeTrendData } from '../types';

interface BridgeTrendChartProps {
  bridgeId: string;
  bridgeName: string;
  className?: string;
}

const TIME_RANGE_CONFIG = {
  '1h': { label: '1H', points: 12 },
  '24h': { label: '24H', points: 24 },
  '7d': { label: '7D', points: 14 },
};

function generateMockTrendData(points: number): BridgeTrendData[] {
  const now = Date.now();
  const interval = (24 * 60 * 60 * 1000) / points;

  return Array.from({ length: points }, (_, i) => {
    const timestamp = new Date(now - (points - i - 1) * interval);
    const baseTransfers = 50 + Math.random() * 100;
    const baseVolume = 10000 + Math.random() * 50000;
    const baseLatency = 2000 + Math.random() * 8000;
    const baseSuccess = 95 + Math.random() * 5;

    return {
      timestamp: timestamp.toISOString(),
      transferCount: Math.floor(baseTransfers),
      totalVolume: Math.floor(baseVolume),
      avgLatencyMs: Math.floor(baseLatency),
      successRate: Math.min(100, baseSuccess),
    };
  });
}

interface TrendMetric {
  key: keyof BridgeTrendData;
  label: string;
  icon: React.ReactNode;
  format: (value: number) => string;
  higherIsBetter: boolean;
  color: string;
}

const TREND_METRICS: TrendMetric[] = [
  {
    key: 'transferCount',
    label: '传输次数',
    icon: <Activity className="h-4 w-4" />,
    format: (v) => v.toLocaleString(),
    higherIsBetter: true,
    color: '#3b82f6',
  },
  {
    key: 'totalVolume',
    label: '总流量',
    icon: <TrendingUp className="h-4 w-4" />,
    format: (v) => {
      if (v >= 1000000) return `$${(v / 1000000).toFixed(2)}M`;
      if (v >= 1000) return `$${(v / 1000).toFixed(2)}K`;
      return `$${v.toFixed(2)}`;
    },
    higherIsBetter: true,
    color: '#22c55e',
  },
  {
    key: 'avgLatencyMs',
    label: '平均延迟',
    icon: <Clock className="h-4 w-4" />,
    format: (v) => (v < 1000 ? `${v}ms` : `${(v / 1000).toFixed(1)}s`),
    higherIsBetter: false,
    color: '#f97316',
  },
];

function SVGBridgeTrendChart({
  data,
  metric,
  width,
  height,
}: {
  data: BridgeTrendData[];
  metric: TrendMetric;
  width: number;
  height: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  if (data.length < 2) return null;

  const padding = { top: 20, right: 60, bottom: 30, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = data.map((d) => Number(d[metric.key]) || 0);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;

  const getX = (index: number) => padding.left + (index / (data.length - 1)) * chartWidth;
  const getY = (value: number) => {
    const normalized = metric.higherIsBetter
      ? (value - minValue) / valueRange
      : 1 - (value - minValue) / valueRange;
    return padding.top + chartHeight - normalized * chartHeight;
  };

  const pathData = data
    .map((point, index) => {
      const x = getX(index);
      const y = getY(Number(point[metric.key]) || 0);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  const areaPath = `${pathData} L ${getX(data.length - 1)} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) => {
    return minValue + (valueRange * i) / (yTicks - 1);
  });

  const xTicks = Math.min(6, data.length);
  const xTickIndices = Array.from({ length: xTicks }, (_, i) =>
    Math.floor((i * (data.length - 1)) / (xTicks - 1)),
  );

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="w-full"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={`trendGradient-${metric.key}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={metric.color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={metric.color} stopOpacity="0" />
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
              {metric.format(value)}
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

      <path d={areaPath} fill={`url(#trendGradient-${metric.key})`} />
      <path
        d={pathData}
        fill="none"
        stroke={metric.color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BridgeTrendChart({
  bridgeId: _bridgeId,
  bridgeName,
  className,
}: BridgeTrendChartProps) {
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');
  const [activeMetric, setActiveMetric] = useState<string>('transferCount');
  const [chartDimensions, setChartDimensions] = useState({ width: 600, height: 280 });
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const trendData = useMemo(() => {
    const config = TIME_RANGE_CONFIG[timeRange];
    return generateMockTrendData(config.points);
  }, [timeRange]);

  const currentMetric = useMemo(
    () => TREND_METRICS.find((m) => m.key === activeMetric) ?? TREND_METRICS[0]!,
    [activeMetric],
  );

  const stats = useMemo(() => {
    if (trendData.length === 0) return null;

    const values = trendData.map((d) => Number(d[currentMetric.key]) || 0);
    const current = values[values.length - 1] ?? 0;
    const first = values[0] ?? 0;
    const change = current - first;
    const changePercent = first !== 0 ? (change / first) * 100 : 0;
    const high = Math.max(...values);
    const low = Math.min(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    return { current, change, changePercent, high, low, avg };
  }, [trendData, currentMetric]);

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

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [timeRange]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {bridgeName} - 流量趋势
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 animate-pulse rounded bg-muted" />
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
              {bridgeName} - 流量趋势
            </CardTitle>
            {stats && (
              <CardDescription className="mt-1">
                <span
                  className={cn(
                    'font-mono font-medium',
                    (
                      currentMetric.higherIsBetter
                        ? stats.changePercent >= 0
                        : stats.changePercent <= 0
                    )
                      ? 'text-emerald-500'
                      : 'text-red-500',
                  )}
                >
                  {(
                    currentMetric.higherIsBetter
                      ? stats.changePercent >= 0
                      : stats.changePercent <= 0
                  )
                    ? '+'
                    : ''}
                  {stats.changePercent.toFixed(2)}%
                </span>{' '}
                期间变化
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            {Object.entries(TIME_RANGE_CONFIG).map(([key, config]) => (
              <Button
                key={key}
                variant={timeRange === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(key as '1h' | '24h' | '7d')}
                className="h-8 px-3 text-xs"
              >
                {config.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs value={activeMetric} onValueChange={setActiveMetric}>
          <TabsList className="grid w-full grid-cols-3">
            {TREND_METRICS.map((metric) => (
              <TabsTrigger
                key={metric.key}
                value={metric.key}
                className="flex items-center gap-1.5"
              >
                {metric.icon}
                <span className="hidden sm:inline">{metric.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          {TREND_METRICS.map((metric) => (
            <TabsContent key={metric.key} value={metric.key} className="pt-4">
              {stats && (
                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">当前</p>
                    <p className="mt-1 font-mono text-lg font-semibold">
                      {metric.format(stats.current)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">最高</p>
                    <p className="mt-1 font-mono text-lg font-semibold text-emerald-500">
                      {metric.format(stats.high)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">最低</p>
                    <p className="mt-1 font-mono text-lg font-semibold text-red-500">
                      {metric.format(stats.low)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">平均</p>
                    <p className="mt-1 font-mono text-lg font-semibold">
                      {metric.format(stats.avg)}
                    </p>
                  </div>
                </div>
              )}
              <div ref={containerRef} className="h-72 w-full">
                <SVGBridgeTrendChart
                  data={trendData}
                  metric={metric}
                  width={chartDimensions.width}
                  height={chartDimensions.height}
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
