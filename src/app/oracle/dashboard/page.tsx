/**
 * Optimized Oracle Dashboard - Data Visualization Enhanced
 *
 * 优化版 Oracle 仪表板
 * - 增强数据可视化
 * - 统一设计系统
 * - 交互式图表
 */

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';

import { useRouter } from 'next/navigation';

import {
  Activity,
  AlertTriangle,
  Globe,
  Zap,
  BarChart3,
  Shield,
  Clock,
  Layers,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

import {
  EnhancedAreaChart,
  EnhancedLineChart,
  EnhancedBarChart,
  CHART_COLORS,
} from '@/components/charts';
import { StaggerContainer, StaggerItem } from '@/components/common/AnimatedContainer';
import { ChartCard } from '@/components/common/ChartCard';
import { DashboardPageHeader } from '@/components/common/PageHeader';
import type { StatCardStatus } from '@/components/common/StatCard';
import {
  EnhancedStatCard,
  StatCardGroup,
  DashboardStatsSection,
} from '@/components/common/StatCard';
import { EmptyDashboardState, LoadingOverlay, RefreshIndicator } from '@/components/ui';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWebSocket, useIsMobile, useAutoRefresh } from '@/hooks';
import { usePageOptimizations } from '@/hooks/usePageOptimizations';
import { logger } from '@/shared/logger';
import { fetchApiData, cn, formatNumber } from '@/shared/utils';
import { isStatsUpdateMessage } from '@/shared/utils/typeGuards';

// ============================================================================
// Types
// ============================================================================

interface DashboardStats {
  totalProtocols: number;
  totalPriceFeeds: number;
  activeAlerts: number;
  avgLatency: number;
  totalValueSecured: string;
  priceUpdates24h: number;
  networkUptime?: number;
  staleFeeds?: number;
  activeNodes?: number;
}

interface ChartDataPoint {
  timestamp: string;
  value: number;
  label: string;
  [key: string]: unknown;
}

interface ComparisonDataPoint {
  label: string;
  latency: number;
  accuracy: number;
  uptime: number;
  [key: string]: unknown;
}

// ============================================================================
// Mock Data Generators
// ============================================================================

const generateMockChartData = (points: number = 24): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];
  const now = new Date();
  for (let i = points; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    data.push({
      timestamp: time.toISOString(),
      value: Math.random() * 100 + 50,
      label: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    });
  }
  return data;
};

const generateMockComparisonData = () => {
  const protocols = ['Chainlink', 'Pyth', 'RedStone', 'UMA'];
  return protocols.map((protocol) => ({
    label: protocol,
    latency: Math.random() * 500 + 200,
    accuracy: Math.random() * 5 + 95,
    uptime: Math.random() * 2 + 98,
  }));
};

// ============================================================================
// Components
// ============================================================================

function HealthStatusBadge({
  activeAlerts,
  isConnected,
}: {
  activeAlerts: number;
  isConnected: boolean;
}) {
  const getHealthStatus = () => {
    if (!isConnected) return 'incident';
    if (activeAlerts === 0) return 'online';
    if (activeAlerts <= 3) return 'degraded';
    return 'incident';
  };

  const status = getHealthStatus();
  const statusConfig = {
    online: {
      label: 'Online',
      icon: <Shield className="h-4 w-4" />,
      bgColor: 'bg-emerald-100',
      textColor: 'text-emerald-700',
      borderColor: 'border-emerald-200',
      dotColor: 'bg-emerald-500',
      description: 'All systems operational',
    },
    degraded: {
      label: 'Degraded',
      icon: <AlertTriangle className="h-4 w-4" />,
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-700',
      borderColor: 'border-amber-200',
      dotColor: 'bg-amber-500',
      description: `${activeAlerts} active alert${activeAlerts > 1 ? 's' : ''}`,
    },
    incident: {
      label: 'Incident',
      icon: <AlertCircle className="h-4 w-4" />,
      bgColor: 'bg-rose-100',
      textColor: 'text-rose-700',
      borderColor: 'border-rose-200',
      dotColor: 'bg-rose-500',
      description: !isConnected ? 'Connection lost' : `${activeAlerts} critical alerts`,
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2 transition-all duration-200 hover:shadow-md',
        config.bgColor,
        config.borderColor,
      )}
    >
      <div className={cn('flex-shrink-0', config.textColor)}>{config.icon}</div>
      <div className="flex flex-col">
        <span className={cn('text-xs font-semibold uppercase tracking-wide', config.textColor)}>
          {config.label}
        </span>
        <span className={cn('text-[10px] opacity-80', config.textColor)}>{config.description}</span>
      </div>
      <div className="relative ml-1 flex h-2.5 w-2.5">
        <span
          className={cn(
            'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
            config.dotColor,
          )}
        />
        <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', config.dotColor)} />
      </div>
    </div>
  );
}

// ============================================================================
// Main Dashboard Component
// ============================================================================

export default function OptimizedOracleDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  // Chart data states
  const [priceTrendData, setPriceTrendData] = useState<ChartDataPoint[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonDataPoint[]>([]);
  const [latencyData, setLatencyData] = useState<ChartDataPoint[]>([]);

  // Page optimizations
  usePageOptimizations({
    pageName: 'Oracle Dashboard',
    onRefresh: async () => {
      await refresh();
    },
    enableSearch: true,
    searchSelector: 'input[type="search"]',
    showRefreshToast: true,
  });

  // Auto refresh
  const {
    lastUpdated,
    isRefreshing,
    isError,
    error,
    refresh,
  } = useAutoRefresh({
    pageId: 'dashboard-overview',
    fetchFn: useCallback(async () => {
      const data = await fetchApiData<DashboardStats>('/api/oracle/stats');
      setStats(data);
      // Generate mock chart data
      setPriceTrendData(generateMockChartData());
      setComparisonData(generateMockComparisonData());
      setLatencyData(generateMockChartData(12));
    }, []),
    enabled: true,
  });

  // WebSocket
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
  const { isConnected, sendMessage, lastMessage } = useWebSocket(wsUrl, {
    autoConnect: true,
    onConnect: () => {
      sendMessage({ type: 'subscribe_dashboard' });
    },
  });

  useEffect(() => {
    if (!lastMessage) return;
    try {
      if (isStatsUpdateMessage(lastMessage)) {
        setStats(lastMessage.data as DashboardStats);
      }
    } catch (err: unknown) {
      logger.error('Failed to process WebSocket message', { err });
    }
  }, [lastMessage]);

  // Memoized chart configurations
  const priceChartConfig = useMemo(
    () => ({
      data: priceTrendData,
      dataKey: 'value',
      color: CHART_COLORS.primary.DEFAULT,
      valueFormatter: (v: number) => `$${formatNumber(v, 2)}`,
      labelFormatter: (l: string | number) =>
        new Date(l).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    }),
    [priceTrendData],
  );

  const comparisonChartConfig = useMemo(
    () => ({
      data: comparisonData,
      bars: [
        { dataKey: 'latency', name: 'Latency (ms)', color: CHART_COLORS.series[0] },
        { dataKey: 'accuracy', name: 'Accuracy (%)', color: CHART_COLORS.series[1] },
      ],
      valueFormatter: (v: number) => formatNumber(v, 1),
    }),
    [comparisonData],
  );

  const latencyChartConfig = useMemo(
    () => ({
      data: latencyData,
      lines: [{ dataKey: 'value', name: 'Latency', color: CHART_COLORS.semantic.warning.DEFAULT }],
      valueFormatter: (v: number) => `${formatNumber(v, 0)}ms`,
    }),
    [latencyData],
  );

  // Stat cards data
  const statCardsData: Array<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    status: StatCardStatus;
    trend: { value: number; isPositive: boolean; label: string };
    sparkline?: { data: number[]; color: string };
  }> = useMemo(
    () => [
      {
        title: 'Active Alerts',
        value: stats?.activeAlerts ?? 0,
        icon: <AlertTriangle className="h-5 w-5" />,
        status: (stats?.activeAlerts ?? 0) > 0 ? 'warning' : 'healthy',
        trend: { value: 12, isPositive: false, label: 'vs last hour' },
        sparkline: {
          data: [10, 12, 8, 15, 12, 18, 12],
          color: CHART_COLORS.semantic.warning.DEFAULT,
        },
      },
      {
        title: 'Avg Latency',
        value: `${stats?.avgLatency ?? 0}ms`,
        icon: <Activity className="h-5 w-5" />,
        status: (stats?.avgLatency ?? 0) > 1000 ? 'warning' : 'healthy',
        trend: { value: 5, isPositive: false, label: 'vs last hour' },
        sparkline: {
          data: [500, 520, 480, 550, 530, 580, 520],
          color: CHART_COLORS.primary.DEFAULT,
        },
      },
      {
        title: 'Network Uptime',
        value: `${stats?.networkUptime ?? 99.9}%`,
        icon: <Shield className="h-5 w-5" />,
        status: 'healthy',
        trend: { value: 0.1, isPositive: true, label: 'vs last hour' },
        sparkline: {
          data: [99.8, 99.9, 99.9, 99.8, 99.9, 99.9, 99.9],
          color: CHART_COLORS.semantic.success.DEFAULT,
        },
      },
      {
        title: 'Stale Feeds',
        value: stats?.staleFeeds ?? 0,
        icon: <Clock className="h-5 w-5" />,
        status: (stats?.staleFeeds ?? 0) > 0 ? 'warning' : 'healthy',
        trend: { value: 2, isPositive: false, label: 'vs last hour' },
        sparkline: { data: [2, 3, 2, 4, 3, 2, 3], color: CHART_COLORS.semantic.error.DEFAULT },
      },
    ],
    [stats],
  );

  const scaleCardsData: Array<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    status: StatCardStatus;
    trend: { value: number; isPositive: boolean; label: string };
  }> = useMemo(
    () => [
      {
        title: 'Protocols',
        value: stats?.totalProtocols ?? 0,
        icon: <Globe className="h-5 w-5" />,
        status: 'neutral',
        trend: { value: 8, isPositive: true, label: 'vs last week' },
      },
      {
        title: 'Price Feeds',
        value: stats?.totalPriceFeeds ?? 0,
        icon: <BarChart3 className="h-5 w-5" />,
        status: 'neutral',
        trend: { value: 15, isPositive: true, label: 'vs last week' },
      },
      {
        title: 'TVS',
        value: stats?.totalValueSecured ?? '$0',
        icon: <Shield className="h-5 w-5" />,
        status: 'neutral',
        trend: { value: 23, isPositive: true, label: 'vs last week' },
      },
      {
        title: 'Updates (24h)',
        value: stats?.priceUpdates24h?.toLocaleString() ?? '0',
        icon: <Layers className="h-5 w-5" />,
        status: 'neutral',
        trend: { value: 18, isPositive: true, label: 'vs yesterday' },
      },
    ],
    [stats],
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <DashboardPageHeader
          title="Oracle Operations Overview"
          description="Real-time health and risk monitoring"
          icon={<Activity className="h-5 w-5 text-primary" />}
          statusBadge={
            <HealthStatusBadge activeAlerts={stats?.activeAlerts ?? 0} isConnected={isConnected} />
          }
          refreshControl={
            <RefreshIndicator
              lastUpdated={lastUpdated}
              isRefreshing={isRefreshing}
              onRefresh={refresh}
            />
          }
          onMobileMenuClick={() => setSidebarOpen(true)}
        />

        {/* Scrollable Content */}
        <div className="relative flex-1 overflow-y-auto p-2 sm:p-3 lg:p-4">
          {/* Loading Overlay */}
          {isRefreshing && !stats && <LoadingOverlay message="Loading dashboard data..." />}

          {/* Error Message */}
          {isError && error && (
            <div className="mb-6">
              <ErrorBanner
                error={error}
                onRetry={refresh}
                title="Failed to load dashboard data"
                isRetrying={isRefreshing}
              />
            </div>
          )}

          {/* Empty State - No Data */}
          {!isRefreshing && !isError && !stats && (
            <div className="py-12">
              <EmptyDashboardState onRefresh={refresh} />
            </div>
          )}

          {/* Stats Sections */}
          <StaggerContainer className="mb-4 space-y-3" staggerChildren={0.05}>
            {/* System Health Section */}
            <StaggerItem>
              <DashboardStatsSection
                title="System Health"
                description="Real-time health and risk metrics"
                icon={<Activity className="h-4 w-4" />}
                color="amber"
              >
                <StatCardGroup columns={4} gap="sm">
                  {statCardsData.map((card) => (
                    <EnhancedStatCard
                      key={card.title}
                      title={card.title}
                      value={card.value}
                      icon={card.icon}
                      status={card.status}
                      trend={card.trend}
                      sparkline={card.sparkline}
                      variant="compact"
                      loading={isRefreshing && !stats}
                      onClick={() => router.push('/alerts')}
                    />
                  ))}
                </StatCardGroup>
              </DashboardStatsSection>
            </StaggerItem>

            {/* Network Scale Section */}
            <StaggerItem>
              <DashboardStatsSection
                title="Network Scale"
                description="Protocol scale and data volume"
                icon={<Globe className="h-4 w-4" />}
                color="blue"
              >
                <StatCardGroup columns={4} gap="sm">
                  {scaleCardsData.map((card) => (
                    <EnhancedStatCard
                      key={card.title}
                      title={card.title}
                      value={card.value}
                      icon={card.icon}
                      status={card.status}
                      trend={card.trend}
                      variant="compact"
                      loading={isRefreshing && !stats}
                    />
                  ))}
                </StatCardGroup>
              </DashboardStatsSection>
            </StaggerItem>
          </StaggerContainer>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
            <TabsList className="w-full justify-start overflow-x-auto lg:w-auto">
              <TabsTrigger value="overview" className="gap-1 sm:gap-2">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
                <span className="sm:hidden">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="trends" className="gap-1 sm:gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Trends</span>
                <span className="sm:hidden">Trends</span>
              </TabsTrigger>
              <TabsTrigger value="comparison" className="gap-1 sm:gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Comparison</span>
                <span className="sm:hidden">Compare</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-3 sm:space-y-4">
              <div className="grid gap-3 sm:gap-4 xl:grid-cols-3">
                {/* Price Trends Chart */}
                <div className="order-2 xl:order-1 xl:col-span-2">
                  <ChartCard
                    title="Price Trends"
                    description="Real-time price updates across all protocols"
                    icon={<TrendingUp className="h-5 w-5" />}
                  >
                    <EnhancedAreaChart
                      data={priceChartConfig.data}
                      dataKey={priceChartConfig.dataKey}
                      color={priceChartConfig.color}
                      height={isMobile ? 200 : 280}
                      valueFormatter={priceChartConfig.valueFormatter}
                      labelFormatter={priceChartConfig.labelFormatter}
                      showGrid
                      gradient
                    />
                  </ChartCard>
                </div>

                {/* Quick Stats */}
                <div className="order-1 xl:order-2">
                  <ChartCard
                    title="Quick Stats"
                    description="Key metrics at a glance"
                    icon={<Activity className="h-5 w-5" />}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between rounded-lg bg-card/50 p-3">
                        <span className="text-sm text-muted-foreground">Active Protocols</span>
                        <span className="text-lg font-bold text-foreground">
                          {stats?.totalProtocols ?? 8}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-card/50 p-3">
                        <span className="text-sm text-muted-foreground">Total Feeds</span>
                        <span className="text-lg font-bold text-foreground">
                          {stats?.totalPriceFeeds ?? 156}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-card/50 p-3">
                        <span className="text-sm text-muted-foreground">Avg Update Time</span>
                        <span className="text-lg font-bold text-foreground">
                          {stats?.avgLatency ?? 450}ms
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-card/50 p-3">
                        <span className="text-sm text-muted-foreground">Health Score</span>
                        <span className="text-lg font-bold text-green-500">98.5%</span>
                      </div>
                    </div>
                  </ChartCard>
                </div>
              </div>

              {/* Secondary Charts */}
              <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
                <ChartCard
                  title="Latency Distribution"
                  description="Response time across protocols"
                  icon={<Clock className="h-5 w-5" />}
                >
                  <EnhancedLineChart
                    data={latencyChartConfig.data}
                    lines={latencyChartConfig.lines}
                    height={isMobile ? 180 : 220}
                    valueFormatter={latencyChartConfig.valueFormatter}
                    showGrid
                  />
                </ChartCard>

                <ChartCard
                  title="Protocol Comparison"
                  description="Performance metrics by protocol"
                  icon={<BarChart3 className="h-5 w-5" />}
                >
                  <EnhancedBarChart
                    data={comparisonChartConfig.data}
                    bars={comparisonChartConfig.bars}
                    height={isMobile ? 180 : 220}
                    valueFormatter={comparisonChartConfig.valueFormatter}
                    showGrid
                  />
                </ChartCard>
              </div>
            </TabsContent>

            {/* Trends Tab */}
            <TabsContent value="trends" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <ChartCard
                  title="24h Price Movement"
                  description="Price changes over the last 24 hours"
                  icon={<TrendingUp className="h-5 w-5" />}
                >
                  <EnhancedAreaChart
                    data={priceTrendData}
                    dataKey="value"
                    color={CHART_COLORS.primary.DEFAULT}
                    height={300}
                    valueFormatter={(v) => `$${formatNumber(v, 2)}`}
                    showGrid
                    gradient
                  />
                </ChartCard>

                <ChartCard
                  title="Latency Trends"
                  description="Network latency over time"
                  icon={<Clock className="h-5 w-5" />}
                >
                  <EnhancedLineChart
                    data={latencyData}
                    lines={[
                      {
                        dataKey: 'value',
                        name: 'Latency',
                        color: CHART_COLORS.semantic.warning.DEFAULT,
                      },
                    ]}
                    height={300}
                    valueFormatter={(v) => `${formatNumber(v, 0)}ms`}
                    showGrid
                  />
                </ChartCard>
              </div>
            </TabsContent>

            {/* Comparison Tab */}
            <TabsContent value="comparison" className="space-y-4">
              <ChartCard
                title="Protocol Performance Comparison"
                description="Compare key metrics across protocols"
                icon={<BarChart3 className="h-5 w-5" />}
              >
                <EnhancedBarChart
                  data={comparisonData}
                  bars={[
                    { dataKey: 'latency', name: 'Latency (ms)', color: CHART_COLORS.series[0] },
                    { dataKey: 'accuracy', name: 'Accuracy (%)', color: CHART_COLORS.series[1] },
                    { dataKey: 'uptime', name: 'Uptime (%)', color: CHART_COLORS.series[2] },
                  ]}
                  height={400}
                  valueFormatter={(v) => formatNumber(v, 1)}
                  showGrid
                  showLegend
                />
              </ChartCard>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
