'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';

import {
  Activity,
  AlertCircle,
  Clock,
  Database,
  Server,
  BarChart3,
  RefreshCw,
  Download,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
} from 'lucide-react';

import { DashboardSkeleton, EmptyDataState } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { logger } from '@/shared/logger';
import { cn, fetchApiData } from '@/shared/utils';

// ============================================================================
// Types
// ============================================================================

interface PerformanceMetrics {
  timestamp: number;
  responseTime: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
    max: number;
    min: number;
    count: number;
  };
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    bytesPerSecond: number;
    activeConnections: number;
  };
  errors: {
    total: number;
    rate: number;
    byType: Record<string, number>;
    byEndpoint: Record<string, number>;
  };
  resources: {
    cpu: {
      usage: number;
      loadAverage: number[];
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    disk: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  database: {
    connections: {
      active: number;
      idle: number;
      max: number;
    };
    queryTime: {
      avg: number;
      p95: number;
      p99: number;
    };
    slowQueries: number;
    transactionsPerSecond: number;
  };
  cache: {
    hitRate: number;
    misses: number;
    hits: number;
    evictions: number;
    size: number;
    keys: number;
  };
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, { status: 'pass' | 'fail' | 'warn'; message: string }>;
}

interface Statistics {
  avgResponseTime: number;
  maxResponseTime: number;
  errorRate: number;
  totalRequests: number;
  availability: number;
}

// ============================================================================
// Components
// ============================================================================

function MetricCard({
  title,
  value,
  unit,
  trend,
  icon: Icon,
  status,
}: {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
  status?: 'good' | 'warning' | 'critical';
}) {
  const statusColors = {
    good: 'text-green-500',
    warning: 'text-yellow-500',
    critical: 'text-red-500',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn('rounded-lg bg-muted p-2', status && statusColors[status])}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
          </div>
          {trend && (
            <Badge
              variant={trend === 'up' ? 'default' : trend === 'down' ? 'destructive' : 'secondary'}
            >
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
            </Badge>
          )}
        </div>
        <div className="mt-4">
          <div className="flex items-baseline gap-2">
            <span className={cn('text-2xl font-bold', status && statusColors[status])}>
              {value}
            </span>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HealthIndicator({ status }: { status: 'healthy' | 'degraded' | 'unhealthy' }) {
  const config = {
    healthy: {
      icon: CheckCircle,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      label: 'Healthy',
    },
    degraded: {
      icon: AlertTriangle,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
      label: 'Degraded',
    },
    unhealthy: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Unhealthy' },
  };

  const { icon: Icon, color, bg, label } = config[status];

  return (
    <div className={cn('flex items-center gap-3 rounded-lg p-4', bg)}>
      <Icon className={cn('h-6 w-6', color)} />
      <div>
        <p className={cn('font-semibold', color)}>{label}</p>
        <p className="text-sm text-muted-foreground">System Status</p>
      </div>
    </div>
  );
}

function ResponseTimeChart({ data }: { data: PerformanceMetrics[] }) {
  const chartData = useMemo(() => {
    return data.slice(-30).map((d) => ({
      time: new Date(d.timestamp).toLocaleTimeString(),
      p50: d.responseTime.p50,
      p95: d.responseTime.p95,
      p99: d.responseTime.p99,
    }));
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Response Time Distribution</h4>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            P50
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-yellow-500" />
            P95
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            P99
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="p50Gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="p95Gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="p99Gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="time" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
            labelStyle={{ fontSize: '12px', color: '#6b7280' }}
          />
          <Area type="monotone" dataKey="p50" stackId="1" stroke="#3b82f6" fill="url(#p50Gradient)" strokeWidth={2} />
          <Area type="monotone" dataKey="p95" stackId="2" stroke="#eab308" fill="url(#p95Gradient)" strokeWidth={2} />
          <Area type="monotone" dataKey="p99" stackId="3" stroke="#ef4444" fill="url(#p99Gradient)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ErrorRateChart({ data }: { data: PerformanceMetrics[] }) {
  const chartData = useMemo(() => {
    return data.slice(-30).map((d) => ({
      time: new Date(d.timestamp).toLocaleTimeString(),
      rate: d.errors.rate,
    }));
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Error Rate Trend</h4>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="errorGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="time" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
            labelStyle={{ fontSize: '12px', color: '#6b7280' }}
            formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Error Rate']}
          />
          <Area
            type="monotone"
            dataKey="rate"
            stroke="#ef4444"
            fill="url(#errorGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ResourceUsage({ metrics }: { metrics: PerformanceMetrics | null }) {
  if (!metrics) return null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>CPU Usage</span>
          <span>{metrics.resources.cpu.usage.toFixed(1)}%</span>
        </div>
        <Progress value={metrics.resources.cpu.usage} />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Memory Usage</span>
          <span>{metrics.resources.memory.percentage.toFixed(1)}%</span>
        </div>
        <Progress value={metrics.resources.memory.percentage} />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Disk Usage</span>
          <span>{metrics.resources.disk.percentage.toFixed(1)}%</span>
        </div>
        <Progress value={metrics.resources.disk.percentage} />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Cache Hit Rate</span>
          <span>{(metrics.cache.hitRate * 100).toFixed(1)}%</span>
        </div>
        <Progress value={metrics.cache.hitRate * 100} />
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function MonitoringDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [timeRange, setTimeRange] = useState<string>('1h');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const timeRangeOptions = [
    { value: '15m', label: '15m', duration: 900000 },
    { value: '1h', label: '1H', duration: 3600000 },
    { value: '6h', label: '6H', duration: 21600000 },
    { value: '24h', label: '24H', duration: 86400000 },
    { value: '7d', label: '7D', duration: 604800000 },
    { value: '30d', label: '30D', duration: 2592000000 },
    { value: 'custom', label: 'Custom', duration: 0 },
  ];

  const getDuration = useCallback(() => {
    if (timeRange === 'custom' && customDateRange.from && customDateRange.to) {
      return customDateRange.to.getTime() - customDateRange.from.getTime();
    }
    const option = timeRangeOptions.find((o) => o.value === timeRange);
    return option?.duration || 3600000;
  }, [timeRange, customDateRange]);

  const fetchMetrics = useCallback(async () => {
    try {
      const duration = getDuration();
      const [metricsData, healthData, statsData] = await Promise.all([
        fetchApiData<PerformanceMetrics[]>(`/api/monitoring/metrics?duration=${duration}`),
        fetchApiData<HealthStatus>('/api/monitoring/health'),
        fetchApiData<Statistics>(`/api/monitoring/statistics?duration=${duration}`),
      ]);

      setMetrics(metricsData);
      setHealth(healthData);
      setStatistics(statsData);

      setLastUpdated(new Date());
    } catch (error) {
      logger.error('Failed to fetch metrics', { error });
    } finally {
      setIsLoading(false);
    }
  }, [getDuration]);

  useEffect(() => {
    fetchMetrics();

    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 30000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [fetchMetrics, autoRefresh]);

  const latestMetrics = metrics[metrics.length - 1];

  const handleExport = () => {
    const data = {
      metrics,
      health,
      statistics,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monitoring-data-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container relative mx-auto space-y-6 px-4 py-8">
        {/* Empty State - No Data */}
        {metrics.length === 0 && !isLoading && (
          <div className="py-12">
            <EmptyDataState
              title="No Performance Data"
              description="Performance metrics will appear here once data collection begins."
              onRefresh={fetchMetrics}
            />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold">
              <Activity className="h-8 w-8 text-primary" />
              Performance Monitoring
            </h1>
            <p className="mt-1 text-muted-foreground">
              Real-time system performance metrics and health monitoring
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Calendar className="mr-2 h-4 w-4" />
                {timeRange === 'custom'
                  ? customDateRange.from && customDateRange.to
                    ? `${customDateRange.from.toLocaleDateString()} - ${customDateRange.to.toLocaleDateString()}`
                    : 'Custom Range'
                  : timeRangeOptions.find(o => o.value === timeRange)?.label || '1H'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="end">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {timeRangeOptions.filter(o => o.value !== 'custom').map((option) => (
                    <Button
                      key={option.value}
                      variant={timeRange === option.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setTimeRange(option.value);
                        setCustomDateRange({ from: undefined, to: undefined });
                      }}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={timeRange === 'custom' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTimeRange('custom')}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Custom
                  </Button>
                </div>
                {timeRange === 'custom' && (
                  <div className="flex gap-2">
                    <Input
                      type="datetime-local"
                      value={customDateRange.from?.toISOString().slice(0, 16) || ''}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, from: new Date(e.target.value) }))}
                      className="text-sm"
                      placeholder="Start"
                    />
                    <Input
                      type="datetime-local"
                      value={customDateRange.to?.toISOString().slice(0, 16) || ''}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, to: new Date(e.target.value) }))}
                      className="text-sm"
                      placeholder="End"
                    />
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="sm" onClick={() => setAutoRefresh(!autoRefresh)}>
            <RefreshCw className={cn('mr-2 h-4 w-4', autoRefresh && 'animate-spin')} />
            {autoRefresh ? 'Auto' : 'Manual'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Health Status */}
      {health && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="md:col-span-1">
            <HealthIndicator status={health.status} />
          </div>
          {Object.entries(health.checks).map(([name, check]) => (
            <Card key={name} className="p-4">
              <div className="flex items-center gap-2">
                {check.status === 'pass' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : check.status === 'warn' ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="font-medium capitalize">{name}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{check.message}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Key Metrics */}
      {statistics && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Avg Response Time"
            value={statistics.avgResponseTime.toFixed(0)}
            unit="ms"
            icon={Clock}
            status={
              statistics.avgResponseTime < 200
                ? 'good'
                : statistics.avgResponseTime < 500
                  ? 'warning'
                  : 'critical'
            }
          />
          <MetricCard
            title="Error Rate"
            value={statistics.errorRate.toFixed(2)}
            unit="%"
            icon={AlertCircle}
            status={
              statistics.errorRate < 1 ? 'good' : statistics.errorRate < 5 ? 'warning' : 'critical'
            }
          />
          <MetricCard
            title="Total Requests"
            value={statistics.totalRequests.toLocaleString()}
            icon={BarChart3}
            status="good"
          />
          <MetricCard
            title="Availability"
            value={statistics.availability.toFixed(2)}
            unit="%"
            icon={CheckCircle}
            status={
              statistics.availability > 99.9
                ? 'good'
                : statistics.availability > 99
                  ? 'warning'
                  : 'critical'
            }
          />
        </div>
      )}

      {/* Detailed Metrics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Response Time
                </CardTitle>
                <CardDescription>Response time percentiles over time</CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.length > 0 && <ResponseTimeChart data={metrics} />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Error Rate
                </CardTitle>
                <CardDescription>Error rate trend over time</CardDescription>
              </CardHeader>
              <CardContent>{metrics.length > 0 && <ErrorRateChart data={metrics} />}</CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Throughput</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Requests/sec</span>
                    <span className="font-medium">
                      {latestMetrics?.throughput.requestsPerSecond.toFixed(1) ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Requests/min</span>
                    <span className="font-medium">
                      {latestMetrics?.throughput.requestsPerMinute.toFixed(0) ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Connections</span>
                    <span className="font-medium">
                      {latestMetrics?.throughput.activeConnections ?? 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Response Time Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">P50</span>
                    <span className="font-medium">
                      {latestMetrics?.responseTime.p50.toFixed(0) ?? 0} ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">P95</span>
                    <span className="font-medium">
                      {latestMetrics?.responseTime.p95.toFixed(0) ?? 0} ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">P99</span>
                    <span className="font-medium">
                      {latestMetrics?.responseTime.p99.toFixed(0) ?? 0} ms
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Cache Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hit Rate</span>
                    <span className="font-medium">
                      {((latestMetrics?.cache.hitRate ?? 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Keys</span>
                    <span className="font-medium">{latestMetrics?.cache.keys ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Size</span>
                    <span className="font-medium">
                      {((latestMetrics?.cache.size ?? 0) / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              {latestMetrics && (
                <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Min Response Time</p>
                    <p className="text-2xl font-bold">
                      {latestMetrics.responseTime.min.toFixed(0)} ms
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Max Response Time</p>
                    <p className="text-2xl font-bold">
                      {latestMetrics.responseTime.max.toFixed(0)} ms
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Request Count</p>
                    <p className="text-2xl font-bold">
                      {latestMetrics.responseTime.count.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bytes/sec</p>
                    <p className="text-2xl font-bold">
                      {((latestMetrics.throughput.bytesPerSecond ?? 0) / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Resource Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResourceUsage metrics={latestMetrics ?? null} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {latestMetrics && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div>
                    <h4 className="mb-4 font-medium">Connections</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Active</span>
                        <span>{latestMetrics.database.connections.active}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Idle</span>
                        <span>{latestMetrics.database.connections.idle}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Max</span>
                        <span>{latestMetrics.database.connections.max}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-4 font-medium">Query Performance</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Time</span>
                        <span>{latestMetrics.database.queryTime.avg.toFixed(1)} ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">P95 Time</span>
                        <span>{latestMetrics.database.queryTime.p95.toFixed(1)} ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Slow Queries</span>
                        <span>{latestMetrics.database.slowQueries}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-4 font-medium">Transactions</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">TPS</span>
                        <span>{latestMetrics.database.transactionsPerSecond.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Error Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {latestMetrics && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="mb-4 font-medium">Errors by Type</h4>
                    <div className="space-y-2">
                      {Object.entries(latestMetrics.errors.byType).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <span className="text-muted-foreground">{type}</span>
                          <Badge variant="destructive">{count}</Badge>
                        </div>
                      ))}
                      {Object.keys(latestMetrics.errors.byType).length === 0 && (
                        <p className="text-muted-foreground">No errors recorded</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-4 font-medium">Errors by Endpoint</h4>
                    <div className="space-y-2">
                      {Object.entries(latestMetrics.errors.byEndpoint).map(([endpoint, count]) => (
                        <div key={endpoint} className="flex items-center justify-between">
                          <span className="max-w-[200px] truncate text-sm text-muted-foreground">
                            {endpoint}
                          </span>
                          <Badge variant="destructive">{count}</Badge>
                        </div>
                      ))}
                      {Object.keys(latestMetrics.errors.byEndpoint).length === 0 && (
                        <p className="text-muted-foreground">No endpoint errors recorded</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </ErrorBoundary>
  );
}
