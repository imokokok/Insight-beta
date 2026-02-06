/**
 * Price Deviation Analytics Dashboard
 *
 * 价格偏差分析仪表板
 * - 跨协议价格偏差趋势
 * - 异常偏差检测
 * - 协议对比分析
 * - 偏差报告
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  AlertTriangle,
  BarChart3,
  RefreshCw,
  Download,
  Search,
  ChevronRight,
  Clock,
  ArrowRightLeft,
  Target,
  Zap,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

import { AutoRefreshControl } from '@/components/features/common/AutoRefreshControl';
import { ToastContainer, useToast } from '@/components/features/common/DashboardToast';
import { EmptyDeviationState, EmptySearchState } from '@/components/features/common/EmptyState';
import { RefreshIndicator } from '@/components/features/common/RefreshIndicator';
import {
  SkeletonStatCard,
  SkeletonList,
  SkeletonChart,
  SkeletonCard,
} from '@/components/features/common/SkeletonCard';
import { StatCard } from '@/components/features/common/StatCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDashboardShortcuts, useAutoRefresh, useDataCache } from '@/hooks/useDashboardShortcuts';
import { logger } from '@/lib/logger';
import { fetchApiData, cn, formatTimestamp } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface PriceDeviationPoint {
  timestamp: string;
  symbol: string;
  protocols: string[];
  prices: Record<string, number>;
  avgPrice: number;
  medianPrice: number;
  maxDeviation: number;
  maxDeviationPercent: number;
  outlierProtocols: string[];
}

interface DeviationTrend {
  symbol: string;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  trendStrength: number;
  avgDeviation: number;
  maxDeviation: number;
  volatility: number;
  anomalyScore: number;
  recommendation: string;
}

interface DeviationReport {
  generatedAt: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalSymbols: number;
    symbolsWithHighDeviation: number;
    avgDeviationAcrossAll: number;
    mostVolatileSymbol: string;
  };
  trends: DeviationTrend[];
  anomalies: PriceDeviationPoint[];
}

// ============================================================================
// Components
// ============================================================================

function TrendDirectionBadge({
  direction,
  strength,
}: {
  direction: DeviationTrend['trendDirection'];
  strength: number;
}) {
  const config = {
    increasing: {
      icon: TrendingUp,
      color: 'bg-red-500',
      label: 'Increasing',
    },
    decreasing: {
      icon: TrendingDown,
      color: 'bg-green-500',
      label: 'Decreasing',
    },
    stable: {
      icon: Minus,
      color: 'bg-blue-500',
      label: 'Stable',
    },
  };

  const { icon: Icon, color, label } = config[direction];

  return (
    <Badge className={cn('gap-1', color)}>
      <Icon className="h-3 w-3" />
      {label}
      <span className="ml-1 opacity-75">({(strength * 100).toFixed(0)}%)</span>
    </Badge>
  );
}

function DeviationSeverityBadge({ deviation }: { deviation: number }) {
  let color = 'bg-green-500';
  let label = 'Low';

  if (deviation > 0.05) {
    color = 'bg-red-500';
    label = 'Critical';
  } else if (deviation > 0.02) {
    color = 'bg-orange-500';
    label = 'High';
  } else if (deviation > 0.01) {
    color = 'bg-yellow-500 text-black';
    label = 'Medium';
  }

  return <Badge className={color}>{label}</Badge>;
}

function DeviationTrendChart({ dataPoints }: { dataPoints: PriceDeviationPoint[] }) {
  const data = dataPoints
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((d) => ({
      time: new Date(d.timestamp).toLocaleTimeString(),
      deviation: d.maxDeviationPercent * 100,
      avgPrice: d.avgPrice,
      outlierCount: d.outlierProtocols.length,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Deviation Trend
        </CardTitle>
        <CardDescription>Maximum price deviation over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="deviationGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} unit="%" />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Max Deviation']}
              />
              <Area
                type="monotone"
                dataKey="deviation"
                stroke="#f97316"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#deviationGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function ProtocolPriceComparison({ dataPoint }: { dataPoint: PriceDeviationPoint | null }) {
  if (!dataPoint) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Protocol Price Comparison
          </CardTitle>
          <CardDescription>Select a data point to view details</CardDescription>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <BarChart3 className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p className="text-muted-foreground">
            Click on a deviation point to see protocol comparison
          </p>
        </CardContent>
      </Card>
    );
  }

  const prices = Object.entries(dataPoint.prices).map(([protocol, price]) => ({
    protocol,
    price,
    deviation: Math.abs(price - dataPoint.avgPrice) / dataPoint.avgPrice,
    isOutlier: dataPoint.outlierProtocols.includes(protocol),
  }));

  const maxPrice = Math.max(...prices.map((p) => p.price));
  const minPrice = Math.min(...prices.map((p) => p.price));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          Protocol Price Comparison
        </CardTitle>
        <CardDescription>
          {dataPoint.symbol} at {formatTimestamp(dataPoint.timestamp)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-green-50 p-3">
              <p className="text-muted-foreground text-xs">Average Price</p>
              <p className="text-lg font-bold">${dataPoint.avgPrice.toFixed(4)}</p>
            </div>
            <div className="rounded-lg bg-orange-50 p-3">
              <p className="text-muted-foreground text-xs">Max Deviation</p>
              <p className="text-lg font-bold">
                {(dataPoint.maxDeviationPercent * 100).toFixed(2)}%
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {prices
              .sort((a, b) => b.price - a.price)
              .map(({ protocol, price, deviation, isOutlier }) => (
                <div
                  key={protocol}
                  className={cn(
                    'flex items-center justify-between rounded-lg border p-3',
                    isOutlier && 'border-red-300 bg-red-50',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">{protocol}</span>
                    {isOutlier && (
                      <Badge variant="outline" className="border-red-500 text-red-500">
                        Outlier
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${price.toFixed(4)}</p>
                    <p
                      className={cn(
                        'text-xs',
                        deviation > 0.01 ? 'text-red-500' : 'text-green-500',
                      )}
                    >
                      {deviation > 0 ? '+' : ''}
                      {(deviation * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-muted-foreground text-xs">Price Spread</p>
            <p className="text-lg font-bold">
              ${(maxPrice - minPrice).toFixed(4)} (
              {(((maxPrice - minPrice) / minPrice) * 100).toFixed(2)}%)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TrendList({
  trends,
  isLoading,
  onSelect,
}: {
  trends: DeviationTrend[];
  isLoading: boolean;
  onSelect: (trend: DeviationTrend) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <div className="py-12 text-center">
        <BarChart3 className="mx-auto mb-4 h-16 w-16 text-orange-500" />
        <h3 className="text-lg font-semibold">No Trend Data</h3>
        <p className="text-muted-foreground mt-1">Deviation analysis data will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {trends.map((trend) => (
        <div
          key={trend.symbol}
          onClick={() => onSelect(trend)}
          className="group cursor-pointer rounded-lg border p-4 transition-all hover:border-orange-500 hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{trend.symbol}</span>
                <TrendDirectionBadge
                  direction={trend.trendDirection}
                  strength={trend.trendStrength}
                />
              </div>
              <p className="text-muted-foreground text-sm">{trend.recommendation}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>Avg Deviation: {(trend.avgDeviation * 100).toFixed(2)}%</span>
                <span>Max: {(trend.maxDeviation * 100).toFixed(2)}%</span>
                <span>Volatility: {(trend.volatility * 100).toFixed(2)}%</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <DeviationSeverityBadge deviation={trend.avgDeviation} />
              <ChevronRight className="text-muted-foreground h-5 w-5 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AnomalyList({
  anomalies,
  isLoading,
  onSelect,
}: {
  anomalies: PriceDeviationPoint[];
  isLoading: boolean;
  onSelect: (anomaly: PriceDeviationPoint) => void;
}) {
  if (isLoading) {
    return <SkeletonList count={5} />;
  }

  if (anomalies.length === 0) {
    return <EmptyDeviationState onRefresh={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-3">
      {anomalies.map((anomaly, index) => (
        <div
          key={index}
          onClick={() => onSelect(anomaly)}
          className="group cursor-pointer rounded-lg border p-4 transition-all hover:border-orange-500 hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{anomaly.symbol}</span>
                <Badge variant="outline" className="border-red-500 text-red-500">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  {anomaly.outlierProtocols.length} Outliers
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs">{formatTimestamp(anomaly.timestamp)}</p>
              <div className="flex flex-wrap gap-1">
                {anomaly.outlierProtocols.map((protocol) => (
                  <Badge key={protocol} variant="secondary" className="text-xs">
                    {protocol}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-red-500">
                {(anomaly.maxDeviationPercent * 100).toFixed(2)}%
              </p>
              <p className="text-muted-foreground text-xs">Max Deviation</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SummaryStats({ report }: { report: DeviationReport | null }) {
  if (!report) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  const { summary } = report;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <StatCard
        title="Total Symbols"
        value={summary.totalSymbols}
        icon={<BarChart3 className="h-5 w-5" />}
        color="blue"
      />
      <StatCard
        title="High Deviation"
        value={summary.symbolsWithHighDeviation}
        icon={<AlertTriangle className="h-5 w-5" />}
        color="red"
      />
      <StatCard
        title="Avg Deviation"
        value={`${(summary.avgDeviationAcrossAll * 100).toFixed(2)}%`}
        icon={<Activity className="h-5 w-5" />}
        color="orange"
      />
      <StatCard
        title="Most Volatile"
        value={summary.mostVolatileSymbol || 'N/A'}
        icon={<Zap className="h-5 w-5" />}
        color="purple"
      />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function DeviationAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<DeviationReport | null>(null);
  const [selectedTrend, setSelectedTrend] = useState<DeviationTrend | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<PriceDeviationPoint | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [symbolData, setSymbolData] = useState<PriceDeviationPoint[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Toast notifications
  const { toasts, removeToast, success, error: showError } = useToast();

  // Data cache
  const { getCachedData, setCachedData } = useDataCache<{
    report: DeviationReport;
  }>({ key: 'deviation_dashboard', ttl: 5 * 60 * 1000 });

  // Auto refresh
  const {
    isEnabled: autoRefreshEnabled,
    setIsEnabled: setAutoRefreshEnabled,
    refreshInterval,
    setRefreshInterval,
    timeUntilRefresh,
    refresh,
  } = useAutoRefresh({
    onRefresh: () => fetchReport(false),
    interval: 60000,
    enabled: true,
    pauseWhenHidden: true,
  });

  const fetchReport = useCallback(
    async (showToast = true) => {
      try {
        setLoading(true);
        setError(null);

        // Try to load from cache first
        const cached = getCachedData();
        if (cached && !lastUpdated) {
          setReport(cached.report);
          setLoading(false);
        }

        const response = await fetchApiData<{ data: DeviationReport }>(
          '/api/oracle/analytics/deviation?type=report',
        );
        setReport(response.data);
        setLastUpdated(new Date());

        // Cache the data
        setCachedData({
          report: response.data,
        });

        if (showToast) {
          success('Data refreshed', 'Deviation report has been updated');
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to fetch deviation report';
        setError(errorMessage);
        showError('Failed to refresh', errorMessage);
        logger.error('Failed to fetch deviation report', { error });
      } finally {
        setLoading(false);
      }
    },
    [getCachedData, setCachedData, lastUpdated, success, showError],
  );

  const fetchSymbolTrend = useCallback(async (symbol: string) => {
    try {
      const response = await fetchApiData<{ data: { dataPoints: PriceDeviationPoint[] } }>(
        `/api/oracle/analytics/deviation?type=trend&symbol=${symbol}`,
      );
      setSymbolData(response.data.dataPoints || []);
    } catch (error) {
      logger.error('Failed to fetch symbol trend', { error, symbol });
    }
  }, []);

  // Keyboard shortcuts
  useDashboardShortcuts({
    onRefresh: () => refresh(),
    onExport: () => {
      handleExport();
      success('Export complete', 'Deviation report has been downloaded');
    },
    onSearchFocus: () => searchInputRef.current?.focus(),
    onTabChange: (tab) => setActiveTab(tab),
    tabs: ['overview', 'trends', 'anomalies'],
    enabled: true,
  });

  useEffect(() => {
    fetchReport(false);
  }, [fetchReport]);

  useEffect(() => {
    if (selectedTrend) {
      fetchSymbolTrend(selectedTrend.symbol);
    }
  }, [selectedTrend, fetchSymbolTrend]);

  const filteredTrends =
    report?.trends.filter(
      (t) =>
        !searchQuery ||
        t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.recommendation.toLowerCase().includes(searchQuery.toLowerCase()),
    ) || [];

  const handleExport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deviation-report-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Error state
  if (error && !loading && !report) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center py-20">
          <AlertTriangle className="mb-4 h-16 w-16 text-red-500" />
          <h2 className="text-xl font-semibold">Failed to Load Deviation Data</h2>
          <p className="text-muted-foreground mt-2">{error}</p>
          <Button onClick={() => fetchReport()} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl lg:text-3xl">
            <ArrowRightLeft className="text-primary h-6 w-6 text-orange-600 sm:h-8 sm:w-8" />
            Price Deviation Analytics
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Cross-protocol price deviation analysis and trend monitoring
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refresh()} disabled={loading}>
              <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
              Refresh
              <kbd className="bg-muted ml-2 hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium sm:inline-flex">
                ⌘R
              </kbd>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!report}>
              <Download className="mr-2 h-4 w-4" />
              Export
              <kbd className="bg-muted ml-2 hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium sm:inline-flex">
                ⌘E
              </kbd>
            </Button>
            <AutoRefreshControl
              isEnabled={autoRefreshEnabled}
              onToggle={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              interval={refreshInterval}
              onIntervalChange={setRefreshInterval}
              timeUntilRefresh={timeUntilRefresh}
            />
          </div>
          <RefreshIndicator
            lastUpdated={lastUpdated}
            nextRefreshIn={Math.ceil(timeUntilRefresh / 1000)}
            isLoading={loading}
          />
        </div>
      </div>

      {/* Summary Stats */}
      {loading && !report ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>
      ) : (
        <SummaryStats report={report} />
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="overview">
            <Activity className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="trends">
            <TrendingUp className="mr-2 h-4 w-4" />
            Trends ({filteredTrends.length})
          </TabsTrigger>
          <TabsTrigger value="anomalies">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Anomalies ({report?.anomalies.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {loading && !report ? (
              <>
                <SkeletonChart />
                <SkeletonCard rows={4} />
              </>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Deviation Distribution
                    </CardTitle>
                    <CardDescription>Average deviation by symbol</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={filteredTrends
                            .slice(0, 10)
                            .sort((a, b) => b.avgDeviation - a.avgDeviation)
                            .map((t) => ({
                              symbol: t.symbol,
                              deviation: t.avgDeviation * 100,
                            }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            dataKey="symbol"
                            tick={{ fontSize: 12 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis tick={{ fontSize: 12 }} unit="%" />
                          <Tooltip
                            contentStyle={{
                              borderRadius: '8px',
                              border: 'none',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            }}
                            formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Avg Deviation']}
                          />
                          <Bar dataKey="deviation" fill="#f97316" radius={[4, 4, 0, 0]}>
                            {filteredTrends.slice(0, 10).map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.avgDeviation > 0.02 ? '#ef4444' : '#f97316'}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Analysis Period
                    </CardTitle>
                    <CardDescription>Report generation details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {report ? (
                      <>
                        <div className="flex justify-between rounded-lg bg-gray-50 p-3">
                          <span className="text-muted-foreground">Generated At</span>
                          <span className="font-medium">{formatTimestamp(report.generatedAt)}</span>
                        </div>
                        <div className="flex justify-between rounded-lg bg-gray-50 p-3">
                          <span className="text-muted-foreground">Period Start</span>
                          <span className="font-medium">
                            {formatTimestamp(report.period.start)}
                          </span>
                        </div>
                        <div className="flex justify-between rounded-lg bg-gray-50 p-3">
                          <span className="text-muted-foreground">Period End</span>
                          <span className="font-medium">{formatTimestamp(report.period.end)}</span>
                        </div>
                        <div className="rounded-lg bg-orange-50 p-4">
                          <p className="text-sm font-medium text-orange-800">Analysis Window</p>
                          <p className="text-2xl font-bold text-orange-600">24 Hours</p>
                          <p className="text-xs text-orange-700">
                            Rolling window for trend analysis
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="py-8 text-center text-gray-400">Loading...</div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Recent Anomalies */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent High Deviations</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('anomalies')}>
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading && !report ? (
                <SkeletonList count={5} />
              ) : (
                <AnomalyList
                  anomalies={report?.anomalies.slice(0, 5) || []}
                  isLoading={loading}
                  onSelect={(anomaly) => {
                    setSelectedAnomaly(anomaly);
                    setActiveTab('anomalies');
                  }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search by symbol or recommendation... (⌘F)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Deviation Trends</CardTitle>
                <CardDescription>
                  Showing {filteredTrends.length} of {report?.trends.length || 0} symbols
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredTrends.length === 0 && !loading && searchQuery ? (
                  <EmptySearchState searchTerm={searchQuery} onClear={() => setSearchQuery('')} />
                ) : (
                  <TrendList
                    trends={filteredTrends}
                    isLoading={loading}
                    onSelect={setSelectedTrend}
                  />
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              {selectedTrend ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        {selectedTrend.symbol} Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-muted-foreground text-xs">Trend Direction</p>
                          <TrendDirectionBadge
                            direction={selectedTrend.trendDirection}
                            strength={selectedTrend.trendStrength}
                          />
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-muted-foreground text-xs">Anomaly Score</p>
                          <p
                            className={cn(
                              'text-lg font-bold',
                              selectedTrend.anomalyScore > 0.7
                                ? 'text-red-500'
                                : selectedTrend.anomalyScore > 0.4
                                  ? 'text-orange-500'
                                  : 'text-green-500',
                            )}
                          >
                            {(selectedTrend.anomalyScore * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-muted-foreground text-xs">Avg Deviation</p>
                          <p className="text-lg font-bold">
                            {(selectedTrend.avgDeviation * 100).toFixed(2)}%
                          </p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-muted-foreground text-xs">Max Deviation</p>
                          <p className="text-lg font-bold">
                            {(selectedTrend.maxDeviation * 100).toFixed(2)}%
                          </p>
                        </div>
                      </div>

                      <div className="rounded-lg bg-blue-50 p-4">
                        <p className="text-sm font-medium text-blue-800">Recommendation</p>
                        <p className="mt-1 text-sm text-blue-700">{selectedTrend.recommendation}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {symbolData.length > 0 && <DeviationTrendChart dataPoints={symbolData} />}
                </>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <TrendingUp className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                    <p className="text-muted-foreground">
                      Select a symbol to view detailed trend analysis
                    </p>
                  </CardContent>
                </Card>
              )}

              <ProtocolPriceComparison dataPoint={selectedAnomaly} />
            </div>
          </div>
        </TabsContent>

        {/* Anomalies Tab */}
        <TabsContent value="anomalies" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>All Anomalies</CardTitle>
                <CardDescription>High deviation events across all symbols</CardDescription>
              </CardHeader>
              <CardContent>
                <AnomalyList
                  anomalies={report?.anomalies || []}
                  isLoading={loading}
                  onSelect={setSelectedAnomaly}
                />
              </CardContent>
            </Card>

            <ProtocolPriceComparison dataPoint={selectedAnomaly} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
