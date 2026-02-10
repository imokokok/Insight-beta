/**
 * Unified Oracle Dashboard - Sidebar Layout
 *
 * 通用预言机监控平台主仪表板
 * - 左侧协议过滤器侧边栏
 * - 右侧主内容区
 * - 响应式布局适配
 */

'use client';

import { useEffect, useState, useCallback, Suspense, lazy } from 'react';

import {
  Activity,
  AlertTriangle,
  Globe,
  Zap,
  BarChart3,
  Shield,
  Clock,
  Layers,
  Menu,
  Info,
  AlertCircle,
} from 'lucide-react';

import { StatCard } from '@/components/common';
import { Button, StatusBadge, CardEnhanced, TooltipEnhanced } from '@/components/ui';
import { ErrorBanner } from '@/components/ui/error-banner';
import { RefreshIndicator } from '@/components/ui/refresh-indicator';
import { ChartSkeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getRefreshStrategy } from '@/config/refresh-strategy';
import { useWebSocket } from '@/hooks';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { logger } from '@/lib/logger';
import { fetchApiData, cn } from '@/lib/utils';

// Dynamic imports for oracle components
const PriceFeedList = lazy(() =>
  import('@/components/features/oracle').then((mod) => ({ default: mod.PriceFeedList })),
);

// ============================================================================
// Mock Data Configuration - 固定示例数据（避免随机数据感）
// ============================================================================

interface ProtocolHealthData {
  uptime: number;
  latency: number;
  accuracy: number;
  latencyColor: 'green' | 'yellow' | 'red';
}

// 固定协议健康数据 - 基于真实场景合理设定
const PROTOCOL_HEALTH_MOCK: Record<string, ProtocolHealthData> = {
  Chainlink: {
    uptime: 99.98,
    latency: 450,
    accuracy: 99.7,
    latencyColor: 'green',
  },
  'Pyth Network': {
    uptime: 99.95,
    latency: 280,
    accuracy: 99.5,
    latencyColor: 'green',
  },
  'Band Protocol': {
    uptime: 99.87,
    latency: 620,
    accuracy: 98.9,
    latencyColor: 'yellow',
  },
  API3: {
    uptime: 99.92,
    latency: 380,
    accuracy: 99.3,
    latencyColor: 'green',
  },
  RedStone: {
    uptime: 99.85,
    latency: 520,
    accuracy: 99.1,
    latencyColor: 'green',
  },
  Flux: {
    uptime: 99.72,
    latency: 780,
    accuracy: 98.5,
    latencyColor: 'yellow',
  },
};

const PROTOCOL_LIST = ['Chainlink', 'Pyth Network', 'Band Protocol', 'API3', 'RedStone', 'Flux'];

// ============================================================================
// Sample Data Badge Component - 示例数据标记
// ============================================================================

function SampleDataBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700',
        className,
      )}
    >
      <Info className="h-3 w-3" />
      示例数据
    </span>
  );
}

// ============================================================================
// Health Status Badge Component - 健康总览条
// ============================================================================

interface HealthStatusBadgeProps {
  activeAlerts: number;
  isConnected: boolean;
}

/**
 * 健康状态总览徽章
 * - Online: 无活跃告警且连接正常
 * - Degraded: 有少量告警但系统仍在运行
 * - Incident: 有大量告警或连接断开
 */
function HealthStatusBadge({ activeAlerts, isConnected }: HealthStatusBadgeProps) {
  // 确定健康状态
  const getHealthStatus = () => {
    if (!isConnected) return 'incident';
    if (activeAlerts === 0) return 'online';
    if (activeAlerts <= 3) return 'degraded';
    return 'incident';
  };

  const status = getHealthStatus();

  // 状态配置
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
    <TooltipEnhanced content={config.description}>
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border px-3 py-2 transition-all duration-200',
          'hover:shadow-md',
          config.bgColor,
          config.borderColor,
        )}
      >
        {/* 状态图标 */}
        <div className={cn('flex-shrink-0', config.textColor)}>{config.icon}</div>

        {/* 状态标签 */}
        <div className="flex flex-col">
          <span className={cn('text-xs font-semibold uppercase tracking-wide', config.textColor)}>
            {config.label}
          </span>
          <span className={cn('text-[10px] opacity-80', config.textColor)}>
            {config.description}
          </span>
        </div>

        {/* 脉冲指示器 */}
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
    </TooltipEnhanced>
  );
}

const ProtocolHealthGrid = lazy(() =>
  import('@/components/features/oracle').then((mod) => ({ default: mod.ProtocolHealthGrid })),
);

const AlertPanel = lazy(() =>
  import('@/components/features/oracle').then((mod) => ({ default: mod.AlertPanel })),
);

const OracleCharts = lazy(() =>
  import('@/components/features/oracle').then((mod) => ({ default: mod.OracleCharts })),
);

const ProtocolSidebar = lazy(() =>
  import('@/components/features/oracle/ProtocolSidebar').then((mod) => ({
    default: mod.ProtocolSidebar,
  })),
);

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

// ============================================================================
// Main Component
// ============================================================================

export default function UnifiedDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedProtocols, setSelectedProtocols] = useState<string[]>(['all']);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 使用新的自动刷新 hook，配置为 1 分钟刷新策略
  const dashboardStrategy = getRefreshStrategy('dashboard-overview');
  const { lastUpdated, isRefreshing, isError, error, refresh } = useAutoRefresh({
    pageId: 'dashboard-overview',
    fetchFn: useCallback(async () => {
      const data = await fetchApiData<DashboardStats>('/api/oracle/stats');
      setStats(data);
    }, []),
    enabled: true,
  });

  // WebSocket Connection using useWebSocket hook
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
  const { isConnected, sendMessage, lastMessage } = useWebSocket(wsUrl, {
    autoConnect: true,
    onConnect: () => {
      sendMessage({ type: 'subscribe_dashboard' });
    },
  });

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    try {
      const message = lastMessage as { type: string; data: DashboardStats };
      if (message.type === 'stats_update') {
        setStats(message.data);
      }
    } catch (err: unknown) {
      logger.error('Failed to process WebSocket message', { err });
    }
  }, [lastMessage]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Protocol Filter */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform border-r border-gray-200/50 bg-gray-50/80 backdrop-blur-sm transition-transform duration-300 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <Suspense
          fallback={
            <div className="flex h-full flex-col p-4">
              <div className="mb-4 h-6 w-32 animate-pulse rounded bg-gray-200" />
              {[...Array(8)].map((_, i) => (
                <div key={i} className="mb-2 h-12 animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          }
        >
          <ProtocolSidebar
            selectedProtocols={selectedProtocols}
            onChange={setSelectedProtocols}
            className="h-full"
          />
        </Suspense>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header - 运维视角优先布局 */}
        <header className="border-b border-gray-200/50 bg-gray-50/80 px-4 py-3 backdrop-blur-sm lg:px-6">
          <div className="flex items-center justify-between">
            {/* 左侧：标题区域 */}
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>

              <div>
                <h1 className="text-xl font-bold text-gray-900 lg:text-2xl">
                  Oracle Operations Overview
                </h1>
                <p className="text-muted-foreground hidden text-sm sm:block">
                  跨多协议 oracle 的实时健康与风险视图
                </p>
              </div>
            </div>

            {/* 右侧：健康总览条 */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* 健康状态徽章 - 最突出 */}
              <HealthStatusBadge
                activeAlerts={stats?.activeAlerts ?? 0}
                isConnected={isConnected}
              />

              {/* 分隔线 */}
              <div className="hidden h-6 w-px bg-gray-200 sm:block" />

              {/* 刷新状态指示器 - 新的统一组件 */}
              <RefreshIndicator
                lastUpdated={lastUpdated}
                isRefreshing={isRefreshing}
                strategy={dashboardStrategy}
                isWebSocketConnected={isConnected}
                onRefresh={refresh}
              />

              {/* WebSocket 状态 */}
              <div
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium',
                  isConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
                )}
              >
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    isConnected ? 'animate-pulse bg-emerald-500' : 'bg-rose-500',
                  )}
                />
                <span className="hidden sm:inline">{isConnected ? 'Live' : 'Disconnected'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content - 优化信息密度 */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-4">
          {/* Stats Cards - 按任务分组（紧凑布局） */}
          <div className="mb-4 space-y-3">
            {/* 上行：健康相关指标（核心 4 个） */}
            <div className="rounded-lg border border-amber-200/50 bg-amber-50/20 p-3">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100">
                  <Activity className="h-3 w-3 text-amber-600" />
                </div>
                <h3 className="text-xs font-semibold text-gray-700">System Health</h3>
                <span className="text-muted-foreground text-[10px]">实时健康与风险指标</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatCard
                  title="Active Alerts"
                  value={stats?.activeAlerts ?? 0}
                  icon={<AlertTriangle className="h-3.5 w-3.5" />}
                  loading={isRefreshing && !stats}
                  color={stats && stats.activeAlerts > 0 ? 'red' : 'green'}
                  trend={
                    stats && stats.activeAlerts > 0
                      ? { value: stats.activeAlerts, isPositive: false }
                      : undefined
                  }
                  lastUpdated={lastUpdated}
                />
                <StatCard
                  title="Avg Latency"
                  value={`${stats?.avgLatency ?? 0}ms`}
                  icon={<Activity className="h-3.5 w-3.5" />}
                  loading={isRefreshing && !stats}
                  color="purple"
                  lastUpdated={lastUpdated}
                />
                <StatCard
                  title="Network Uptime"
                  value={stats?.networkUptime ? `${stats.networkUptime}%` : '99.9%'}
                  icon={<Shield className="h-3.5 w-3.5" />}
                  loading={isRefreshing && !stats}
                  color="green"
                  lastUpdated={lastUpdated}
                />
                <StatCard
                  title="Stale Feeds"
                  value={stats?.staleFeeds ?? 0}
                  icon={<Clock className="h-3.5 w-3.5" />}
                  loading={isRefreshing && !stats}
                  color={stats && (stats.staleFeeds ?? 0) > 0 ? 'orange' : 'green'}
                  lastUpdated={lastUpdated}
                />
              </div>
            </div>

            {/* 下行：规模相关指标（精简为 4 个核心） */}
            <div className="rounded-lg border border-blue-200/50 bg-blue-50/20 p-3">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100">
                  <Globe className="h-3 w-3 text-blue-600" />
                </div>
                <h3 className="text-xs font-semibold text-gray-700">Network Scale</h3>
                <span className="text-muted-foreground text-[10px]">协议规模与数据量</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatCard
                  title="Protocols"
                  value={stats?.totalProtocols ?? 0}
                  icon={<Globe className="h-3.5 w-3.5" />}
                  loading={isRefreshing && !stats}
                  color="blue"
                  lastUpdated={lastUpdated}
                />
                <StatCard
                  title="Price Feeds"
                  value={stats?.totalPriceFeeds ?? 0}
                  icon={<BarChart3 className="h-3.5 w-3.5" />}
                  loading={isRefreshing && !stats}
                  color="cyan"
                  lastUpdated={lastUpdated}
                />
                <StatCard
                  title="TVS"
                  value={stats?.totalValueSecured ?? '$0'}
                  icon={<Shield className="h-3.5 w-3.5" />}
                  loading={isRefreshing && !stats}
                  color="purple"
                  lastUpdated={lastUpdated}
                />
                <StatCard
                  title="Updates (24h)"
                  value={stats?.priceUpdates24h?.toLocaleString() ?? '0'}
                  icon={<Layers className="h-3.5 w-3.5" />}
                  loading={isRefreshing && !stats}
                  color="cyan"
                  lastUpdated={lastUpdated}
                />
              </div>
            </div>
          </div>

          {/* Error Message - 使用统一的 ErrorBanner 组件 */}
          {isError && error && (
            <div className="mb-6">
              <ErrorBanner
                error={error}
                onRetry={refresh}
                title="加载仪表板数据失败"
                isRetrying={isRefreshing}
              />
            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="w-full justify-start lg:w-auto">
              <TabsTrigger value="overview" className="gap-2">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
                <span className="sm:hidden">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="health" className="gap-2">
                <Activity className="h-4 w-4" />
                Health
              </TabsTrigger>
              <TabsTrigger value="alerts" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                Alerts
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab - 运维视角重排（紧凑布局） */}
            <TabsContent value="overview" className="space-y-4">
              {/* 第一行：Price Trends + AlertPanel（告警优先，高度优化） */}
              <div className="grid gap-4 xl:grid-cols-3">
                <div className="xl:col-span-2">
                  <CardEnhanced className="h-[280px] bg-transparent" hover glow>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-base font-semibold text-purple-900">Price Trends</h3>
                    </div>
                    <Suspense fallback={<ChartSkeleton className="h-[240px]" />}>
                      <div className="h-[240px]">
                        <OracleCharts />
                      </div>
                    </Suspense>
                  </CardEnhanced>
                </div>
                <div>
                  <CardEnhanced className="h-[280px] border-amber-200/50 bg-amber-50/20" hover glow>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100">
                          <AlertTriangle className="h-3 w-3 text-amber-600" />
                        </div>
                        <h3 className="text-base font-semibold text-purple-900">Recent Alerts</h3>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-amber-600 hover:bg-amber-100 hover:text-amber-700"
                        onClick={() => setActiveTab('alerts')}
                      >
                        View All →
                      </Button>
                    </div>
                    <Suspense fallback={<ChartSkeleton className="h-[240px]" />}>
                      <div className="h-[240px] overflow-auto">
                        <AlertPanel maxAlerts={8} />
                      </div>
                    </Suspense>
                  </CardEnhanced>
                </div>
              </div>

              {/* 第二行：Protocol Health + Latest Prices（紧凑布局） */}
              <div className="grid gap-4 lg:grid-cols-2">
                <CardEnhanced className="h-[200px] bg-transparent" hover glow>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-purple-900">Protocol Health</h3>
                  </div>
                  <Suspense fallback={<ChartSkeleton className="h-[160px]" />}>
                    <div className="h-[160px] overflow-auto">
                      <ProtocolHealthGrid />
                    </div>
                  </Suspense>
                </CardEnhanced>

                <CardEnhanced className="h-[200px] bg-transparent" hover glow>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-purple-900">Latest Prices</h3>
                  </div>
                  <Suspense fallback={<ChartSkeleton className="h-[160px]" />}>
                    <div className="h-[160px] overflow-auto">
                      <PriceFeedList limit={6} />
                    </div>
                  </Suspense>
                </CardEnhanced>
              </div>
            </TabsContent>

            {/* Health Tab - 使用固定 Mock 数据 */}
            <TabsContent value="health" className="space-y-4">
              <CardEnhanced hover glow className="bg-transparent">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-purple-900">
                      Protocol Health Status
                    </h3>
                    <SampleDataBadge />
                  </div>
                </div>
                <Suspense fallback={<ChartSkeleton className="h-96" />}>
                  <ProtocolHealthGrid />
                </Suspense>
              </CardEnhanced>

              <div className="grid gap-4 lg:grid-cols-3">
                {/* Uptime Card */}
                <CardEnhanced hover className="relative bg-transparent">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-purple-900">Uptime (24h)</h3>
                    <SampleDataBadge />
                  </div>
                  <div className="space-y-3">
                    {PROTOCOL_LIST.map((protocol) => {
                      const data = PROTOCOL_HEALTH_MOCK[protocol]!;
                      return (
                        <div key={protocol} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{protocol}</span>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 rounded-full bg-gray-200">
                              <div
                                className="h-2 rounded-full bg-green-500"
                                style={{ width: `${data.uptime}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{data.uptime.toFixed(2)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardEnhanced>

                {/* Latency Card */}
                <CardEnhanced hover className="relative bg-transparent">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-purple-900">Average Latency</h3>
                    <SampleDataBadge />
                  </div>
                  <div className="space-y-3">
                    {PROTOCOL_LIST.map((protocol) => {
                      const data = PROTOCOL_HEALTH_MOCK[protocol]!;
                      const maxLatency = 1000;
                      const percentage = (data.latency / maxLatency) * 100;
                      return (
                        <div key={protocol} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{protocol}</span>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 rounded-full bg-gray-200">
                              <div
                                className={cn(
                                  'h-2 rounded-full',
                                  data.latencyColor === 'green'
                                    ? 'bg-green-500'
                                    : data.latencyColor === 'yellow'
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500',
                                )}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{data.latency}ms</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardEnhanced>

                {/* Accuracy Card */}
                <CardEnhanced hover className="relative bg-transparent">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-purple-900">Accuracy Score</h3>
                    <SampleDataBadge />
                  </div>
                  <div className="space-y-3">
                    {PROTOCOL_LIST.map((protocol) => {
                      const data = PROTOCOL_HEALTH_MOCK[protocol]!;
                      return (
                        <div key={protocol} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{protocol}</span>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 rounded-full bg-gray-200">
                              <div
                                className="h-2 rounded-full bg-blue-500"
                                style={{ width: `${data.accuracy}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{data.accuracy.toFixed(1)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardEnhanced>
              </div>
            </TabsContent>

            {/* Alerts Tab - 运维视角：从总览到 drill-down 的闭环 */}
            <TabsContent value="alerts" className="space-y-4">
              {/* Mini KPIs 区域 */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                <CardEnhanced
                  className="cursor-pointer border-red-200/50 bg-red-50/20 transition-all hover:shadow-md"
                  hover
                  onClick={() => {
                    // Drill-down: 跳转到 /alerts?severity=critical
                    window.location.href = '/alerts?severity=critical';
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Critical Open</p>
                      <p className="text-2xl font-bold text-red-600">2</p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </div>
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400">点击查看详情 →</p>
                </CardEnhanced>

                <CardEnhanced
                  className="cursor-pointer border-amber-200/50 bg-amber-50/20 transition-all hover:shadow-md"
                  hover
                  onClick={() => {
                    window.location.href = '/alerts?severity=warning';
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Warning Open</p>
                      <p className="text-2xl font-bold text-amber-600">5</p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    </div>
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400">点击查看详情 →</p>
                </CardEnhanced>

                <CardEnhanced
                  className="cursor-pointer border-blue-200/50 bg-blue-50/20 transition-all hover:shadow-md"
                  hover
                  onClick={() => {
                    window.location.href = '/alerts?severity=info';
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Info Open</p>
                      <p className="text-2xl font-bold text-blue-600">12</p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                      <Info className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400">点击查看详情 →</p>
                </CardEnhanced>

                <CardEnhanced
                  className="cursor-pointer border-purple-200/50 bg-purple-50/20 transition-all hover:shadow-md"
                  hover
                  onClick={() => {
                    window.location.href = '/alerts?status=acked';
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Acked, Not Resolved</p>
                      <p className="text-2xl font-bold text-purple-600">3</p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                      <Clock className="h-4 w-4 text-purple-600" />
                    </div>
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400">点击查看详情 →</p>
                </CardEnhanced>

                <CardEnhanced className="border-gray-200/50 bg-gray-50/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Total Active</p>
                      <p className="text-2xl font-bold text-gray-700">
                        {stats?.activeAlerts ?? 19}
                      </p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                      <Activity className="h-4 w-4 text-gray-600" />
                    </div>
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400">所有活跃告警</p>
                </CardEnhanced>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {/* All Alerts 列表 - 带行为按钮 */}
                <div className="lg:col-span-2">
                  <CardEnhanced hover glow className="h-full bg-transparent">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-base font-semibold text-purple-900">All Alerts</h3>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            window.location.href = '/alerts';
                          }}
                        >
                          View All Alerts
                        </Button>
                      </div>
                    </div>
                    <Suspense fallback={<ChartSkeleton className="h-96" />}>
                      <div className="space-y-2">
                        {/* 示例告警列表项 - 带行为按钮 */}
                        {[
                          {
                            id: 1,
                            severity: 'critical',
                            title: 'Chainlink ETH/USD 价格偏差 > 2%',
                            protocol: 'Chainlink',
                            time: '2 min ago',
                          },
                          {
                            id: 2,
                            severity: 'critical',
                            title: 'Pyth Network 节点离线',
                            protocol: 'Pyth',
                            time: '5 min ago',
                          },
                          {
                            id: 3,
                            severity: 'warning',
                            title: 'Band Protocol 延迟 > 5s',
                            protocol: 'Band',
                            time: '12 min ago',
                          },
                          {
                            id: 4,
                            severity: 'warning',
                            title: 'API3 数据源过期',
                            protocol: 'API3',
                            time: '18 min ago',
                          },
                          {
                            id: 5,
                            severity: 'info',
                            title: 'RedStone 价格更新频率降低',
                            protocol: 'RedStone',
                            time: '25 min ago',
                          },
                        ].map((alert) => (
                          <div
                            key={alert.id}
                            className="group flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3 transition-all hover:border-purple-200 hover:shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  'h-2 w-2 rounded-full',
                                  alert.severity === 'critical'
                                    ? 'bg-red-500'
                                    : alert.severity === 'warning'
                                      ? 'bg-amber-500'
                                      : 'bg-blue-500',
                                )}
                              />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                                <p className="text-xs text-gray-500">
                                  {alert.protocol} • {alert.time}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-purple-600 hover:bg-purple-50"
                                onClick={() => {
                                  // Drill-down: 跳转到协议详情页
                                  window.location.href = `/oracle/protocols/${alert.protocol.toLowerCase()}`;
                                }}
                              >
                                View in Protocol
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-gray-600 hover:bg-gray-50"
                                onClick={() => {
                                  // Drill-down: 跳转到 incident timeline
                                  window.location.href = `/alerts/${alert.id}`;
                                }}
                              >
                                Timeline →
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => {
                            window.location.href = '/alerts';
                          }}
                        >
                          View All 19 Alerts
                        </Button>
                      </div>
                    </Suspense>
                  </CardEnhanced>
                </div>

                {/* 右侧：Alert Rules */}
                <div className="space-y-4">
                  <CardEnhanced hover className="h-full bg-transparent">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-base font-semibold text-purple-900">Alert Rules</h3>
                      <SampleDataBadge />
                    </div>
                    <div className="space-y-3">
                      {[
                        { rule: 'Price Deviation > 2%', status: 'active', triggers: 3 },
                        { rule: 'Stale Feed > 10min', status: 'active', triggers: 1 },
                        { rule: 'Latency > 5s', status: 'active', triggers: 2 },
                        { rule: 'Low Confidence < 80%', status: 'active', triggers: 0 },
                        { rule: 'Node Offline', status: 'active', triggers: 1 },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-lg border border-gray-200/50 bg-gray-100/50 p-2"
                        >
                          <div>
                            <span className="text-sm text-gray-700">{item.rule}</span>
                            {item.triggers > 0 && (
                              <span className="ml-2 text-xs text-red-500">
                                ({item.triggers} triggers)
                              </span>
                            )}
                          </div>
                          <StatusBadge
                            status={item.status === 'active' ? 'online' : 'offline'}
                            text={item.status === 'active' ? 'Active' : 'Paused'}
                            size="sm"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 border-t border-gray-100 pt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-gray-500 hover:text-purple-600"
                        onClick={() => {
                          window.location.href = '/admin/alerts/rules';
                        }}
                      >
                        Manage Alert Rules →
                      </Button>
                    </div>
                  </CardEnhanced>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
