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
  RefreshCw,
  Shield,
  Clock,
  Layers,
  Menu,
  AlertCircle,
} from 'lucide-react';

import { StatCardEnhanced } from '@/components/common';
import { ButtonEnhanced, StatusBadge, CardEnhanced, TooltipEnhanced } from '@/components/ui';
import { ChartSkeleton } from '@/components/ui/skeleton-enhanced';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDataRefresh, useWebSocket } from '@/hooks';
import { logger } from '@/lib/logger';
import { fetchApiData, cn } from '@/lib/utils';

// Dynamic imports for oracle components
const PriceFeedList = lazy(() =>
  import('@/components/features/oracle').then((mod) => ({ default: mod.PriceFeedList })),
);

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
}

// ============================================================================
// Main Component
// ============================================================================

export default function UnifiedDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedProtocols, setSelectedProtocols] = useState<string[]>(['all']);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Use the new data refresh hook for stats
  const { lastUpdated, isLoading, isError, error, refresh } = useDataRefresh({
    maxRetries: 3,
    retryDelay: 2000,
    staleThreshold: 300,
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

  // Fetch stats using the new refresh hook
  const fetchStats = useCallback(async (signal: AbortSignal) => {
    const data = await fetchApiData<DashboardStats>('/api/oracle/stats', {
      signal,
    });
    return data;
  }, []);

  // Initial fetch and interval
  useEffect(() => {
    refresh(fetchStats);

    const interval = setInterval(() => {
      refresh(fetchStats);
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [refresh, fetchStats]);

  const handleRefresh = useCallback(() => {
    refresh(fetchStats);
  }, [refresh, fetchStats]);

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
          'fixed inset-y-0 left-0 z-50 w-64 transform border-r border-gray-200 bg-white shadow-lg transition-transform duration-300 lg:static lg:translate-x-0',
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
        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:px-6">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <ButtonEnhanced
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </ButtonEnhanced>

            <div>
              <h1 className="text-xl font-bold text-gray-900 lg:text-2xl">Oracle Dashboard</h1>
              <p className="text-muted-foreground hidden text-sm sm:block">
                Real-time monitoring across multiple oracle protocols
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-muted-foreground hidden items-center gap-2 text-sm sm:flex">
              <Clock className="h-4 w-4" />
              <span>{lastUpdated?.toLocaleTimeString() ?? '--:--:--'}</span>
            </div>
            <StatusBadge
              status={isConnected ? 'online' : 'offline'}
              text={isConnected ? 'Live' : 'Disconnected'}
            />
            <TooltipEnhanced content="Refresh data">
              <ButtonEnhanced
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                loading={isLoading}
                className="h-8 w-8"
              >
                <RefreshCw className="h-4 w-4" />
              </ButtonEnhanced>
            </TooltipEnhanced>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Stats Cards */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
            <StatCardEnhanced
              title="Protocols"
              value={stats?.totalProtocols ?? 0}
              icon={<Globe className="h-4 w-4" />}
              loading={isLoading}
              color="blue"
              lastUpdated={lastUpdated}
            />
            <StatCardEnhanced
              title="Price Feeds"
              value={stats?.totalPriceFeeds ?? 0}
              icon={<BarChart3 className="h-4 w-4" />}
              loading={isLoading}
              color="green"
              lastUpdated={lastUpdated}
            />
            <StatCardEnhanced
              title="Active Alerts"
              value={stats?.activeAlerts ?? 0}
              icon={<AlertTriangle className="h-4 w-4" />}
              loading={isLoading}
              color={stats && stats.activeAlerts > 0 ? 'red' : 'green'}
              trend={
                stats && stats.activeAlerts > 0
                  ? { value: stats.activeAlerts, isPositive: false }
                  : undefined
              }
              lastUpdated={lastUpdated}
            />
            <StatCardEnhanced
              title="Avg Latency"
              value={`${stats?.avgLatency ?? 0}ms`}
              icon={<Activity className="h-4 w-4" />}
              loading={isLoading}
              color="purple"
              lastUpdated={lastUpdated}
            />
            <StatCardEnhanced
              title="TVS"
              value={stats?.totalValueSecured ?? '$0'}
              icon={<Shield className="h-4 w-4" />}
              loading={isLoading}
              color="orange"
              lastUpdated={lastUpdated}
            />
            <StatCardEnhanced
              title="Updates (24h)"
              value={stats?.priceUpdates24h?.toLocaleString() ?? '0'}
              icon={<Layers className="h-4 w-4" />}
              loading={isLoading}
              color="cyan"
              lastUpdated={lastUpdated}
            />
          </div>

          {/* Error Message */}
          {isError && error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>Failed to load dashboard data: {error.message}</span>
              </div>
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

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Charts Row */}
              <div className="grid gap-6 xl:grid-cols-3">
                <div className="xl:col-span-2">
                  <CardEnhanced className="h-full" hover glow>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-purple-900">Price Trends</h3>
                    </div>
                    <Suspense fallback={<ChartSkeleton className="h-80" />}>
                      <OracleCharts />
                    </Suspense>
                  </CardEnhanced>
                </div>
                <div>
                  <CardEnhanced className="h-full" hover glow>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-purple-900">Latest Prices</h3>
                    </div>
                    <Suspense fallback={<ChartSkeleton className="h-80" />}>
                      <PriceFeedList limit={10} className="h-full" />
                    </Suspense>
                  </CardEnhanced>
                </div>
              </div>

              {/* Health & Alerts Row */}
              <div className="grid gap-6 lg:grid-cols-2">
                <CardEnhanced hover glow>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-purple-900">Protocol Health</h3>
                  </div>
                  <Suspense fallback={<ChartSkeleton className="h-64" />}>
                    <ProtocolHealthGrid />
                  </Suspense>
                </CardEnhanced>

                <CardEnhanced hover glow>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-purple-900">Recent Alerts</h3>
                  </div>
                  <Suspense fallback={<ChartSkeleton className="h-64" />}>
                    <AlertPanel maxAlerts={5} />
                  </Suspense>
                </CardEnhanced>
              </div>
            </TabsContent>

            {/* Health Tab */}
            <TabsContent value="health" className="space-y-6">
              <CardEnhanced hover glow>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-purple-900">Protocol Health Status</h3>
                </div>
                <Suspense fallback={<ChartSkeleton className="h-96" />}>
                  <ProtocolHealthGrid />
                </Suspense>
              </CardEnhanced>

              <div className="grid gap-6 lg:grid-cols-3">
                <CardEnhanced hover>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-purple-900">Uptime (24h)</h3>
                  </div>
                  <div className="space-y-3">
                    {['Chainlink', 'Pyth Network', 'Band Protocol', 'API3', 'RedStone', 'Flux'].map(
                      (protocol) => (
                        <div key={protocol} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{protocol}</span>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 rounded-full bg-gray-100">
                              <div
                                className="h-2 rounded-full bg-green-500"
                                style={{ width: `${99 + Math.random()}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">
                              {(99 + Math.random()).toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </CardEnhanced>

                <CardEnhanced hover>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-purple-900">Average Latency</h3>
                  </div>
                  <div className="space-y-3">
                    {['Chainlink', 'Pyth Network', 'Band Protocol', 'API3', 'RedStone', 'Flux'].map(
                      (protocol) => (
                        <div key={protocol} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{protocol}</span>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 rounded-full bg-gray-100">
                              <div
                                className={cn(
                                  'h-2 rounded-full',
                                  Math.random() > 0.5 ? 'bg-green-500' : 'bg-yellow-500',
                                )}
                                style={{ width: `${Math.random() * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">
                              {Math.floor(Math.random() * 1000)}ms
                            </span>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </CardEnhanced>

                <CardEnhanced hover>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-purple-900">Accuracy Score</h3>
                  </div>
                  <div className="space-y-3">
                    {['Chainlink', 'Pyth Network', 'Band Protocol', 'API3', 'RedStone', 'Flux'].map(
                      (protocol) => (
                        <div key={protocol} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{protocol}</span>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 rounded-full bg-gray-100">
                              <div
                                className="h-2 rounded-full bg-blue-500"
                                style={{ width: `${95 + Math.random() * 5}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">
                              {(95 + Math.random() * 5).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </CardEnhanced>
              </div>
            </TabsContent>

            {/* Alerts Tab */}
            <TabsContent value="alerts" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <CardEnhanced hover glow>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-purple-900">All Alerts</h3>
                    </div>
                    <Suspense fallback={<ChartSkeleton className="h-96" />}>
                      <AlertPanel maxAlerts={50} showAcknowledged />
                    </Suspense>
                  </CardEnhanced>
                </div>
                <div className="space-y-6">
                  <CardEnhanced hover>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-purple-900">Alert Summary</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Critical</span>
                        <StatusBadge status="error" text="2" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Warning</span>
                        <StatusBadge status="warning" text="5" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Info</span>
                        <StatusBadge status="pending" text="12" />
                      </div>
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-700">Total Active</span>
                          <span className="font-bold text-gray-900">
                            {stats?.activeAlerts ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardEnhanced>

                  <CardEnhanced hover>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-purple-900">Alert Rules</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>Price Deviation &gt; 2%</span>
                        <StatusBadge status="online" text="Active" />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Stale Feed &gt; 10min</span>
                        <StatusBadge status="online" text="Active" />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Latency &gt; 5s</span>
                        <StatusBadge status="online" text="Active" />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Low Confidence &lt; 80%</span>
                        <StatusBadge status="online" text="Active" />
                      </div>
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
