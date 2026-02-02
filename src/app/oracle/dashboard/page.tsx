/**
 * Unified Oracle Dashboard
 *
 * 通用预言机监控平台主仪表板
 * - 多协议价格监控
 * - 实时价格对比
 * - 性能排名
 * - 价格偏差告警
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  CheckCircle,
  Globe,
  Zap,
  BarChart3,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { ProtocolSelector } from '@/components/features/protocol/ProtocolSelector';
import { ProtocolCard } from '@/components/features/protocol/ProtocolCard';
import { EmptyState } from '@/components/features/common/EmptyState';
import { Button } from '@/components/ui/button';
import type {
  CrossOracleComparison,
  OracleProtocol,
  SupportedChain,
} from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// 类型定义
// ============================================================================

type ProtocolStats = {
  protocol: OracleProtocol;
  name: string;
  totalFeeds: number;
  avgLatency: number;
  uptime: number;
  status: 'healthy' | 'degraded' | 'down';
};

type DashboardStats = {
  totalProtocols: number;
  totalFeeds: number;
  activeAlerts: number;
  avgDeviation: number;
};

// ============================================================================
// 主组件
// ============================================================================

export default function UnifiedDashboardPage() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('ETH/USD');
  const [selectedChain, setSelectedChain] = useState<SupportedChain | 'all'>('all');
  const [comparison, setComparison] = useState<CrossOracleComparison | null>(null);
  const [priceHistory, setPriceHistory] = useState<CrossOracleComparison[]>([]);
  const [protocolStats, setProtocolStats] = useState<ProtocolStats[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('comparison');
  const [selectedProtocol, setSelectedProtocol] = useState<OracleProtocol | 'all'>('all');

  // WebSocket 连接
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    let isUnmounting = false;

    const connect = () => {
      // 如果组件正在卸载，不要创建新连接
      if (isUnmounting) return;

      try {
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (isUnmounting) {
            ws?.close();
            return;
          }
          setWsConnected(true);
          reconnectAttempts = 0;
          // 订阅默认交易对
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'subscribe',
                symbols: ['ETH/USD', 'BTC/USD', 'LINK/USD'],
              }),
            );
          }
        };

        ws.onclose = (event) => {
          setWsConnected(false);
          ws = null;

          // 只有在非主动关闭且未卸载时才重连
          if (!isUnmounting && !event.wasClean && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            reconnectTimeout = setTimeout(connect, Math.min(3000 * reconnectAttempts, 15000));
          }
        };

        ws.onerror = () => {
          // 只在非开发环境或首次连接时记录错误，避免开发模式下频繁重连的噪音
          if (process.env.NODE_ENV === 'production' || reconnectAttempts === 0) {
            console.warn('WebSocket connection error, will retry...');
          }
          // 错误发生后让 onclose 处理重连逻辑
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (typeof message !== 'object' || message === null) return;

            const msg = message as { type: string; data: unknown };

            switch (msg.type) {
              case 'price_update':
                // 处理价格更新
                break;
              case 'comparison_update':
                setComparison(msg.data as CrossOracleComparison);
                break;
            }
          } catch {
            // 静默处理解析错误，避免控制台噪音
          }
        };
      } catch {
        // WebSocket 创建失败时的静默处理
        if (!isUnmounting && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          reconnectTimeout = setTimeout(connect, Math.min(3000 * reconnectAttempts, 15000));
        }
      }
    };

    connect();

    return () => {
      isUnmounting = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null; // 移除 onclose 处理器避免重连
        ws.close();
      }
    };
  }, []);

  // 初始数据加载
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // 并行加载所有数据
        const [statsRes, protocolsRes, historyRes] = await Promise.all([
          fetch('/api/oracle/unified/stats'),
          fetch('/api/oracle/unified/protocols'),
          fetch(`/api/oracle/unified/comparison/history?symbol=${selectedSymbol}&hours=24`),
        ]);

        if (statsRes.ok) {
          setDashboardStats(await statsRes.json());
        }

        if (protocolsRes.ok) {
          setProtocolStats(await protocolsRes.json());
        }

        if (historyRes.ok) {
          setPriceHistory(await historyRes.json());
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedSymbol]);

  // 当选择变化时加载对比数据
  useEffect(() => {
    const fetchComparisonData = async () => {
      try {
        const chain = selectedChain === 'all' ? undefined : selectedChain;
        const url = new URL('/api/oracle/unified/comparison', window.location.origin);
        url.searchParams.set('symbol', selectedSymbol);
        if (chain) url.searchParams.set('chain', chain);

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setComparison(data);
        }
      } catch (error) {
        console.error('Failed to load comparison data:', error);
      }
    };

    fetchComparisonData();
  }, [selectedSymbol, selectedChain]);

  // ============================================================================
  // 渲染函数
  // ============================================================================

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* 页面标题 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Unified Oracle Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Real-time multi-protocol price monitoring and comparison
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={wsConnected ? 'default' : 'destructive'}>
            {wsConnected ? (
              <>
                <Zap className="mr-1 h-3 w-3" />
                Live
              </>
            ) : (
              <>
                <AlertTriangle className="mr-1 h-3 w-3" />
                Offline
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <Filter className="text-muted-foreground h-4 w-4" />
          <span className="text-sm font-medium">Filter by Protocol:</span>
        </div>
        <div className="w-full md:w-64">
          <ProtocolSelector
            value={selectedProtocol}
            onChange={(protocol) => setSelectedProtocol(protocol as OracleProtocol | 'all')}
            showAll={true}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedProtocol('all');
            setSelectedSymbol('ETH/USD');
            setSelectedChain('all');
          }}
          className="ml-auto"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset Filters
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Protocols"
          value={dashboardStats?.totalProtocols || 0}
          icon={<Globe className="h-4 w-4" />}
          loading={loading}
        />
        <StatsCard
          title="Total Price Feeds"
          value={dashboardStats?.totalFeeds || 0}
          icon={<Activity className="h-4 w-4" />}
          loading={loading}
        />
        <StatsCard
          title="Active Alerts"
          value={dashboardStats?.activeAlerts || 0}
          icon={<AlertTriangle className="h-4 w-4" />}
          trend={dashboardStats && dashboardStats.activeAlerts > 0 ? 'up' : 'stable'}
          loading={loading}
        />
        <StatsCard
          title="Avg Deviation"
          value={`${(dashboardStats?.avgDeviation || 0).toFixed(2)}%`}
          icon={<BarChart3 className="h-4 w-4" />}
          trend={dashboardStats && dashboardStats.avgDeviation > 1 ? 'up' : 'down'}
          loading={loading}
        />
      </div>

      {/* 主内容区 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="comparison">Price Comparison</TabsTrigger>
          <TabsTrigger value="protocols">Protocol Status</TabsTrigger>
          <TabsTrigger value="history">Price History</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        {/* 价格对比 */}
        <TabsContent value="comparison" className="space-y-4">
          {/* 选择器 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="w-48">
                  <label className="mb-2 block text-sm font-medium">Trading Pair</label>
                  <select
                    value={selectedSymbol}
                    onChange={(e) => setSelectedSymbol(e.target.value)}
                    className="w-full rounded-md border p-2"
                  >
                    <option value="ETH/USD">ETH/USD</option>
                    <option value="BTC/USD">BTC/USD</option>
                    <option value="LINK/USD">LINK/USD</option>
                    <option value="MATIC/USD">MATIC/USD</option>
                    <option value="AVAX/USD">AVAX/USD</option>
                  </select>
                </div>
                <div className="w-48">
                  <label className="mb-2 block text-sm font-medium">Chain</label>
                  <select
                    value={selectedChain}
                    onChange={(e) => setSelectedChain(e.target.value as SupportedChain | 'all')}
                    className="w-full rounded-md border p-2"
                  >
                    <option value="all">All Chains</option>
                    <option value="ethereum">Ethereum</option>
                    <option value="polygon">Polygon</option>
                    <option value="arbitrum">Arbitrum</option>
                    <option value="optimism">Optimism</option>
                    <option value="base">Base</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 对比数据 */}
          {comparison ? (
            <div className="grid gap-4 md:grid-cols-2">
              {/* 价格对比表 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Protocol Prices</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {comparison.prices.map((price) => (
                      <div
                        key={price.protocol}
                        className="bg-muted/50 flex items-center justify-between rounded-lg p-3"
                      >
                        <div className="flex items-center gap-3">
                          <ProtocolBadge protocol={price.protocol} />
                          <span className="text-muted-foreground text-sm">{price.instanceId}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-medium">
                            ${price.price.toLocaleString()}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {new Date(price.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 推荐价格和统计 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Aggregated Price</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 推荐价格 */}
                  <div className="bg-primary/5 rounded-lg p-6 text-center">
                    <div className="text-muted-foreground mb-1 text-sm">Recommended Price</div>
                    <div className="text-4xl font-bold">
                      ${comparison.recommendedPrice.toLocaleString()}
                    </div>
                    <div className="text-muted-foreground mt-2 text-xs">
                      Source: {comparison.recommendationSource}
                    </div>
                  </div>

                  {/* 统计数据 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-muted-foreground text-xs">Average</div>
                      <div className="font-mono">${comparison.avgPrice.toLocaleString()}</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-muted-foreground text-xs">Median</div>
                      <div className="font-mono">${comparison.medianPrice.toLocaleString()}</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-muted-foreground text-xs">Min</div>
                      <div className="font-mono">${comparison.minPrice.toLocaleString()}</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-muted-foreground text-xs">Max</div>
                      <div className="font-mono">${comparison.maxPrice.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* 偏差警告 */}
                  {comparison.maxDeviationPercent > 1 && (
                    <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
                      <div className="flex items-center gap-2 text-yellow-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">Price Deviation Detected</span>
                      </div>
                      <div className="text-muted-foreground mt-1 text-sm">
                        Max deviation: {comparison.maxDeviationPercent.toFixed(2)}%
                        {comparison.outlierProtocols.length > 0 && (
                          <span className="mt-1 block">
                            Outliers: {comparison.outlierProtocols.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Activity className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                <p className="text-muted-foreground">
                  No comparison data available for {selectedSymbol}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 协议状态 */}
        <TabsContent value="protocols">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {protocolStats
              .filter((p) => selectedProtocol === 'all' || p.protocol === selectedProtocol)
              .map((protocol) => (
                <ProtocolCard
                  key={protocol.protocol}
                  protocol={protocol.protocol}
                  stats={{
                    currentPrice: 0,
                    updates24h: protocol.totalFeeds,
                    uptime: protocol.uptime,
                  }}
                  isLoading={loading}
                />
              ))}
          </div>
          {protocolStats.filter(
            (p) => selectedProtocol === 'all' || p.protocol === selectedProtocol,
          ).length === 0 && (
            <EmptyState
              variant="search"
              title="No protocols found"
              description="Try adjusting your protocol filter."
              action={{
                label: 'Clear filter',
                onClick: () => setSelectedProtocol('all'),
              }}
            />
          )}
        </TabsContent>

        {/* 价格历史 */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>24h Price History - {selectedSymbol}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis domain={['auto', 'auto']} />
                    <Tooltip
                      formatter={(value) => `$${Number(value).toLocaleString()}`}
                      labelFormatter={(label) => new Date(label as string).toLocaleString()}
                    />
                    <Line
                      type="monotone"
                      dataKey="recommendedPrice"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={false}
                      name="Recommended"
                    />
                    <Line
                      type="monotone"
                      dataKey="avgPrice"
                      stroke="#82ca9d"
                      strokeWidth={2}
                      dot={false}
                      name="Average"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 告警 */}
        <TabsContent value="alerts">
          <AlertsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// 子组件
// ============================================================================

function StatsCard({
  title,
  value,
  icon,
  trend,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="mb-2 h-8 w-24" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">{title}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
          <div
            className={`rounded-full p-2 ${
              trend === 'up'
                ? 'bg-green-100 text-green-600'
                : trend === 'down'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-blue-100 text-blue-600'
            }`}
          >
            {icon}
          </div>
        </div>
        {trend && (
          <div className="mt-2 flex items-center text-xs">
            {trend === 'up' ? (
              <TrendingUp className="mr-1 h-3 w-3 text-green-600" />
            ) : trend === 'down' ? (
              <TrendingDown className="mr-1 h-3 w-3 text-green-600" />
            ) : null}
            <span
              className={trend === 'up' ? 'text-red-600' : trend === 'down' ? 'text-green-600' : ''}
            >
              {trend === 'up' ? 'Increasing' : trend === 'down' ? 'Decreasing' : 'Stable'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProtocolBadge({ protocol }: { protocol: OracleProtocol }) {
  const colors: Record<OracleProtocol, string> = {
    chainlink: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    pyth: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    band: 'bg-green-500/10 text-green-600 border-green-500/20',
    api3: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    redstone: 'bg-red-500/10 text-red-600 border-red-500/20',
    switchboard: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
    flux: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    dia: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
    uma: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
    insight: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  };

  return (
    <Badge variant="outline" className={colors[protocol] || colors.insight}>
      {protocol.toUpperCase()}
    </Badge>
  );
}

function AlertsPanel() {
  const [alerts, setAlerts] = useState<
    Array<{
      id: string;
      severity: 'info' | 'warning' | 'critical';
      title: string;
      message: string;
      timestamp: string;
    }>
  >([]);

  useEffect(() => {
    fetch('/api/oracle/unified/alerts?status=open')
      .then((res) => res.json())
      .then((data) => setAlerts(data))
      .catch(console.error);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>No active alerts</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg border p-4 ${
                  alert.severity === 'critical'
                    ? 'border-red-500/20 bg-red-500/5'
                    : alert.severity === 'warning'
                      ? 'border-yellow-500/20 bg-yellow-500/5'
                      : 'border-blue-500/20 bg-blue-500/5'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          alert.severity === 'critical'
                            ? 'destructive'
                            : alert.severity === 'warning'
                              ? 'default'
                              : 'secondary'
                        }
                      >
                        {alert.severity}
                      </Badge>
                      <span className="font-medium">{alert.title}</span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm">{alert.message}</p>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
