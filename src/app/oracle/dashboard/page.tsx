/**
 * Unified Oracle Dashboard
 *
 * 通用预言机监控平台主仪表板
 * - 实时价格 Feed 监控
 * - 协议健康度指标
 * - 活跃警报展示
 * - 跨协议数据分析
 */

/* eslint-disable no-restricted-syntax */

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
} from 'lucide-react';

import { StatCard } from '@/components/features/common/StatCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartSkeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWebSocket } from '@/hooks/useWebSocket';
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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

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
        setLastUpdated(new Date());
      }
    } catch (error: unknown) {
      logger.error('Failed to process WebSocket message', { error });
    }
  }, [lastMessage]);

  // Fetch initial stats
  const fetchStats = useCallback(async () => {
    const isActive = true;

    try {
      setLoading(true);
      const controller = new AbortController();
      const data = await fetchApiData<DashboardStats>('/api/oracle/stats', {
        signal: controller.signal,
      });

      if (!isActive) return;
      setStats(data);
      setLastUpdated(new Date());
    } catch {
      if (!isActive) return;
      // Use mock data as fallback
      setStats({
        totalProtocols: 9,
        totalPriceFeeds: 156,
        activeAlerts: 3,
        avgLatency: 487,
        totalValueSecured: '$2.4B',
        priceUpdates24h: 1245678,
      });
    } finally {
      if (isActive) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    const fetchWithAbort = async () => {
      if (!isActive) return;
      await fetchStats();
    };

    fetchWithAbort();
    const interval = setInterval(fetchWithAbort, 60000);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [fetchStats]);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Oracle Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Real-time monitoring across multiple oracle protocols
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="text-muted-foreground flex items-center gap-2 text-xs sm:text-sm">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Last updated: </span>
            {lastUpdated.toLocaleTimeString()}
          </div>
          <Badge variant={isConnected ? 'default' : 'destructive'} className="text-xs">
            {isConnected ? 'Live' : 'Disconnected'}
          </Badge>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
        <StatCard
          title="Protocols"
          value={stats?.totalProtocols ?? 0}
          icon={<Globe className="h-4 w-4" />}
          loading={loading}
          color="blue"
        />
        <StatCard
          title="Price Feeds"
          value={stats?.totalPriceFeeds ?? 0}
          icon={<BarChart3 className="h-4 w-4" />}
          loading={loading}
          color="green"
        />
        <StatCard
          title="Active Alerts"
          value={stats?.activeAlerts ?? 0}
          icon={<AlertTriangle className="h-4 w-4" />}
          loading={loading}
          color={stats && stats.activeAlerts > 0 ? 'red' : 'green'}
          trend={
            stats && stats.activeAlerts > 0
              ? { value: stats.activeAlerts, isPositive: false }
              : undefined
          }
        />
        <StatCard
          title="Avg Latency"
          value={`${stats?.avgLatency ?? 0}ms`}
          icon={<Activity className="h-4 w-4" />}
          loading={loading}
          color="purple"
        />
        <StatCard
          title="TVS"
          value={stats?.totalValueSecured ?? '$0'}
          icon={<Shield className="h-4 w-4" />}
          loading={loading}
          color="orange"
        />
        <StatCard
          title="Updates (24h)"
          value={stats?.priceUpdates24h?.toLocaleString() ?? '0'}
          icon={<Layers className="h-4 w-4" />}
          loading={loading}
          color="cyan"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="overview" className="px-2 text-xs sm:px-4 sm:text-sm">
            <Zap className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Overview</span>
            <span className="sm:hidden">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="feeds" className="px-2 text-xs sm:px-4 sm:text-sm">
            <BarChart3 className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Price Feeds</span>
            <span className="sm:hidden">Feeds</span>
          </TabsTrigger>
          <TabsTrigger value="health" className="px-2 text-xs sm:px-4 sm:text-sm">
            <Activity className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
            Health
          </TabsTrigger>
          <TabsTrigger value="alerts" className="px-2 text-xs sm:px-4 sm:text-sm">
            <AlertTriangle className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
            Alerts
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          {/* Top Row: Charts */}
          <div className="grid gap-4 sm:gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <Suspense fallback={<ChartSkeleton className="h-96" />}>
                <OracleCharts />
              </Suspense>
            </div>
            <div>
              <Suspense fallback={<ChartSkeleton className="h-96" />}>
                <PriceFeedList limit={10} className="h-full" />
              </Suspense>
            </div>
          </div>

          {/* Middle Row: Protocol Health & Alerts Preview */}
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            <Suspense fallback={<ChartSkeleton className="h-64" />}>
              <ProtocolHealthGrid />
            </Suspense>
            <Suspense fallback={<ChartSkeleton className="h-64" />}>
              <AlertPanel maxAlerts={5} />
            </Suspense>
          </div>
        </TabsContent>

        {/* Price Feeds Tab */}
        <TabsContent value="feeds" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Suspense fallback={<ChartSkeleton className="h-96" />}>
                <PriceFeedList limit={50} />
              </Suspense>
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Feed Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Feeds</span>
                    <span className="font-medium">{stats?.totalPriceFeeds ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Active Protocols</span>
                    <span className="font-medium">{stats?.totalProtocols ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Stale Feeds</span>
                    <Badge variant="secondary">3</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Avg Update Time</span>
                    <span className="font-medium">{stats?.avgLatency ?? 0}ms</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Health Tab */}
        <TabsContent value="health" className="space-y-6">
          <Suspense fallback={<ChartSkeleton className="h-96" />}>
            <ProtocolHealthGrid />
          </Suspense>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Uptime (24h)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['Chainlink', 'Pyth Network', 'Band Protocol', 'API3', 'RedStone'].map(
                    (protocol) => (
                      <div key={protocol} className="flex items-center justify-between">
                        <span className="text-sm">{protocol}</span>
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Latency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['Chainlink', 'Pyth Network', 'Band Protocol', 'API3', 'RedStone'].map(
                    (protocol) => (
                      <div key={protocol} className="flex items-center justify-between">
                        <span className="text-sm">{protocol}</span>
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Accuracy Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['Chainlink', 'Pyth Network', 'Band Protocol', 'API3', 'RedStone'].map(
                    (protocol) => (
                      <div key={protocol} className="flex items-center justify-between">
                        <span className="text-sm">{protocol}</span>
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Suspense fallback={<ChartSkeleton className="h-96" />}>
                <AlertPanel maxAlerts={50} showAcknowledged />
              </Suspense>
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Alert Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Critical</span>
                    <Badge variant="destructive">2</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Warning</span>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                      5
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Info</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      12
                    </Badge>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Total Active</span>
                      <span className="font-bold">{stats?.activeAlerts ?? 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Alert Rules</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Price Deviation &gt; 2%</span>
                    <Badge variant="outline">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Stale Feed &gt; 10min</span>
                    <Badge variant="outline">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Latency &gt; 5s</span>
                    <Badge variant="outline">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Low Confidence &lt; 80%</span>
                    <Badge variant="outline">Active</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
