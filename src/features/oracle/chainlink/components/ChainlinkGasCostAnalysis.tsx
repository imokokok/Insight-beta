'use client';

import { useState, useEffect, useCallback } from 'react';

import { Fuel, RefreshCw } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SkeletonList } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';
import { fetchApiData } from '@/shared/utils/api';

import type { GasCostAnalysisData, GasCostTrendPoint } from '../types/chainlink';

interface ChainlinkGasCostAnalysisProps {
  chain?: string;
  feedName?: string;
  timeRange?: '1h' | '24h' | '7d' | '30d';
  className?: string;
}

const timeRangeOptions = [
  { value: '1h', label: '1H' },
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
] as const;

const formatGas = (gas: number) => {
  if (gas >= 1000000000) return `${(gas / 1000000000).toFixed(2)}B`;
  if (gas >= 1000000) return `${(gas / 1000000).toFixed(2)}M`;
  if (gas >= 1000) return `${(gas / 1000).toFixed(0)}K`;
  return gas.toFixed(0);
};

const formatEth = (eth: number) => {
  if (eth >= 1) return `${eth.toFixed(4)} ETH`;
  if (eth >= 0.001) return `${(eth * 1000).toFixed(2)} mETH`;
  return `${(eth * 1000000).toFixed(0)} gwei`;
};

const formatUsd = (usd: number) => {
  if (usd >= 1000000) return `$${(usd / 1000000).toFixed(2)}M`;
  if (usd >= 1000) return `$${(usd / 1000).toFixed(2)}K`;
  return `$${usd.toFixed(2)}`;
};

interface TrendChartProps {
  trend: GasCostTrendPoint[];
  className?: string;
}

function GasCostTrendChart({ trend, className }: TrendChartProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');
  const [metricType, setMetricType] = useState<'gas' | 'cost' | 'transactions'>('cost');

  const chartData = trend.map((point) => ({
    time: new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    timestamp: point.timestamp,
    gasUsed: point.gasUsed,
    costUsd: point.costUsd,
    transactionCount: point.transactionCount,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-white p-3 shadow-lg dark:bg-gray-800">
          <p className="mb-2 text-xs text-muted-foreground">
            {new Date(payload[0].payload.timestamp).toLocaleString()}
          </p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs text-muted-foreground">
                  {entry.name === 'gasUsed'
                    ? 'Gas Used'
                    : entry.name === 'costUsd'
                      ? 'Cost (USD)'
                      : 'Transactions'}
                </span>
                <span className="text-sm font-semibold">
                  {entry.name === 'gasUsed'
                    ? entry.value.toLocaleString()
                    : entry.name === 'costUsd'
                      ? `$${entry.value.toFixed(4)}`
                      : entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const getChartComponent = () => {
    switch (chartType) {
      case 'bar':
        return BarChart;
      case 'area':
        return AreaChart;
      default:
        return LineChart;
    }
  };

  const getDataComponent = () => {
    switch (chartType) {
      case 'bar':
        return Bar;
      case 'area':
        return Area;
      default:
        return Line;
    }
  };

  const getDataKey = () => {
    switch (metricType) {
      case 'gas':
        return 'gasUsed';
      case 'transactions':
        return 'transactionCount';
      default:
        return 'costUsd';
    }
  };

  const getYAxisUnit = () => {
    switch (metricType) {
      case 'gas':
        return '';
      case 'transactions':
        return '';
      default:
        return '$';
    }
  };

  const getColor = () => {
    switch (metricType) {
      case 'gas':
        return '#8b5cf6';
      case 'transactions':
        return '#10b981';
      default:
        return '#f59e0b';
    }
  };

  const getName = () => {
    switch (metricType) {
      case 'gas':
        return 'Gas Used';
      case 'transactions':
        return 'Transactions';
      default:
        return 'Cost (USD)';
    }
  };

  const ChartComponent = getChartComponent();
  const DataComponent = getDataComponent();

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              {t('chainlink.gas.trendTitle') || 'Gas 成本趋势'}
            </CardTitle>
            <CardDescription>
              {t('chainlink.gas.trendDescription') || 'Gas 消耗和成本的时间序列分析'}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Tabs value={metricType} onValueChange={(v) => setMetricType(v as any)}>
              <TabsList>
                <TabsTrigger value="cost">成本</TabsTrigger>
                <TabsTrigger value="gas">Gas</TabsTrigger>
                <TabsTrigger value="transactions">交易</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={chartType} onValueChange={(v) => setChartType(v as any)}>
              <TabsList>
                <TabsTrigger value="line">折线</TabsTrigger>
                <TabsTrigger value="area">面积</TabsTrigger>
                <TabsTrigger value="bar">柱状</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ChartComponent data={chartData}>
              {chartType === 'area' && (
                <defs>
                  <linearGradient id="gasGradientChainlink" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getColor()} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={getColor()} stopOpacity={0} />
                  </linearGradient>
                </defs>
              )}
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: isMobile ? 9 : 11 }}
                interval="preserveStartEnd"
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: isMobile ? 10 : 12 }}
                className="text-muted-foreground"
                unit={getYAxisUnit()}
                width={isMobile ? 40 : 50}
                tickFormatter={(value) => {
                  if (metricType === 'gas') {
                    return value >= 1000000
                      ? `${(value / 1000000).toFixed(1)}M`
                      : value >= 1000
                        ? `${(value / 1000).toFixed(0)}K`
                        : value;
                  }
                  return value;
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <DataComponent
                type="monotone"
                dataKey={getDataKey()}
                name={getName()}
                stroke={getColor()}
                strokeWidth={2}
                fill={
                  chartType === 'area'
                    ? 'url(#gasGradientChainlink)'
                    : chartType === 'bar'
                      ? getColor()
                      : 'none'
                }
                dot={chartType === 'line' ? false : undefined}
                activeDot={{ r: 5 }}
              />
            </ChartComponent>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function ChainlinkGasCostAnalysis({
  chain,
  feedName,
  timeRange: initialTimeRange = '24h',
  className,
}: ChainlinkGasCostAnalysisProps) {
  const { t } = useI18n();
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>(initialTimeRange);
  const [data, setData] = useState<GasCostAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'feeds' | 'chains'>('feeds');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('timeRange', timeRange);
      if (chain) {
        params.set('chain', chain);
      }
      if (feedName) {
        params.set('feed', feedName);
      }

      const gasData = await fetchApiData<GasCostAnalysisData>(
        `/api/oracle/chainlink/gas?${params.toString()}`,
      );

      let filteredData = { ...gasData };

      if (chain) {
        filteredData.byFeed = gasData.byFeed.filter(
          (f) => f.chain.toLowerCase() === chain.toLowerCase(),
        );
        filteredData.byChain = gasData.byChain.filter(
          (c) => c.chain.toLowerCase() === chain.toLowerCase(),
        );
      }

      if (feedName) {
        filteredData.byFeed = gasData.byFeed.filter((f) =>
          f.feedName.toLowerCase().includes(feedName.toLowerCase()),
        );
      }

      filteredData.totalGasUsed = filteredData.byFeed.reduce((sum, f) => sum + f.totalGasUsed, 0);
      filteredData.totalCostEth = filteredData.byFeed.reduce((sum, f) => sum + f.totalCostEth, 0);
      filteredData.totalCostUsd = filteredData.byFeed.reduce((sum, f) => sum + f.totalCostUsd, 0);
      filteredData.totalTransactions = filteredData.byFeed.reduce(
        (sum, f) => sum + f.transactionCount,
        0,
      );

      setData(filteredData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch gas cost data');
    } finally {
      setIsLoading(false);
    }
  }, [chain, feedName, timeRange]);

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
            <Fuel className="h-5 w-5 text-primary" />
            {t('chainlink.gas.title') || 'Gas 成本分析'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonList count={3} />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
          <Fuel className="h-12 w-12 text-amber-500" />
          <div className="text-center">
            <p className="font-medium text-foreground">加载数据失败</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            重试
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (data.byFeed.length === 0 && data.byChain.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
          <Fuel className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <p className="font-medium text-foreground">暂无数据</p>
            <p className="text-sm text-muted-foreground">当前筛选条件下没有 Gas 成本数据</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Fuel className="h-5 w-5 text-primary" />
                {t('chainlink.gas.title') || 'Gas 成本分析'}
              </CardTitle>
              <CardDescription>
                {t('chainlink.gas.description') || '按链和 Feed 分析 Gas 消耗和成本'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border p-1">
                {timeRangeOptions.map((option) => (
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">总 Gas 消耗</span>
              <Fuel className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2 text-2xl font-bold">{formatGas(data.totalGasUsed)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">ETH 成本</span>
              <span className="text-sm text-muted-foreground">Ξ</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-blue-600">
              {formatEth(data.totalCostEth)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">USD 成本</span>
              <span className="text-sm text-muted-foreground">$</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-green-600">
              {formatUsd(data.totalCostUsd)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">交易数量</span>
              <span className="text-sm text-muted-foreground">Tx</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-purple-600">
              {data.totalTransactions.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <GasCostTrendChart trend={data.trend} />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">
              {view === 'feeds'
                ? t('chainlink.gas.byFeed') || '按 Feed 统计'
                : t('chainlink.gas.byChain') || '按链统计'}
            </CardTitle>
            <div className="flex rounded-lg border p-1">
              <button
                onClick={() => setView('feeds')}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  view === 'feeds' ? 'text-primary-foreground bg-primary' : 'hover:bg-muted',
                )}
              >
                {t('chainlink.gas.feeds') || 'Feeds'}
              </button>
              <button
                onClick={() => setView('chains')}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  view === 'chains' ? 'text-primary-foreground bg-primary' : 'hover:bg-muted',
                )}
              >
                {t('chainlink.gas.chains') || 'Chains'}
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {view === 'feeds'
                      ? t('chainlink.gas.feedName') || 'Feed 名称'
                      : t('chainlink.gas.chain') || '链'}
                  </TableHead>
                  {view === 'feeds' && <TableHead>{t('chainlink.gas.chain') || '链'}</TableHead>}
                  <TableHead>{t('chainlink.gas.gasUsed') || 'Gas 消耗'}</TableHead>
                  <TableHead>{t('chainlink.gas.costEth') || 'ETH 成本'}</TableHead>
                  <TableHead>{t('chainlink.gas.costUsd') || 'USD 成本'}</TableHead>
                  <TableHead>{t('chainlink.gas.transactions') || '交易数'}</TableHead>
                  {view === 'feeds' && (
                    <TableHead>{t('chainlink.gas.avgGas') || '平均 Gas'}</TableHead>
                  )}
                  {view === 'chains' && (
                    <TableHead>{t('chainlink.gas.feedCount') || 'Feed 数量'}</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {view === 'feeds'
                  ? data.byFeed.map((feed) => (
                      <TableRow key={feed.feedName}>
                        <TableCell className="font-semibold">{feed.feedName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {feed.chain}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">{formatGas(feed.totalGasUsed)}</TableCell>
                        <TableCell className="font-mono">{formatEth(feed.totalCostEth)}</TableCell>
                        <TableCell className="font-mono">{formatUsd(feed.totalCostUsd)}</TableCell>
                        <TableCell className="font-mono">
                          {feed.transactionCount.toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatGas(feed.avgGasPerTransaction)}
                        </TableCell>
                      </TableRow>
                    ))
                  : data.byChain.map((chainItem) => (
                      <TableRow key={chainItem.chain}>
                        <TableCell className="font-semibold">
                          <Badge variant="secondary" className="capitalize">
                            {chainItem.chain}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatGas(chainItem.totalGasUsed)}
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatEth(chainItem.totalCostEth)}
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatUsd(chainItem.totalCostUsd)}
                        </TableCell>
                        <TableCell className="font-mono">
                          {chainItem.transactionCount.toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono">{chainItem.feedCount}</TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
