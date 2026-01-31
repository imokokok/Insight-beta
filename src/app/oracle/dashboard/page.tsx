/**
 * Unified Oracle Dashboard - Simplified Version
 *
 * 通用预言机监控平台统一仪表板 - 简化版
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Activity,
  Database,
  TrendingUp,
  AlertTriangle,
  Server,
  Globe,
  RefreshCw,
  Plus,
  Search,
  Bell,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { logger } from '@/lib/logger';

// ============================================================================
// 类型定义
// ============================================================================

interface OverviewData {
  timestamp: string;
  instances: {
    total: number;
    byProtocol: Record<string, number>;
    byChain: Record<string, number>;
    enabled: number;
    disabled: number;
  };
  prices: {
    recentUpdates: Array<{
      protocol: string;
      update_count: string;
      symbol_count: string;
    }>;
    totalUpdates1h: number;
  };
  sync: Array<{
    protocol: string;
    total: string;
    healthy: string;
    error: string;
  }>;
  alerts: {
    active: Array<{
      severity: string;
      count: string;
    }>;
    totalActive: number;
  };
}

interface Protocol {
  id: string;
  name: string;
  description: string;
  supportedChains: string[];
  features: string[];
  activeInstances: number;
}

interface Instance {
  id: string;
  name: string;
  protocol: string;
  chain: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  protocol?: string;
  chain?: string;
  symbol?: string;
  status: 'open' | 'acknowledged' | 'resolved';
  createdAt: string;
}

// ============================================================================
// 主组件
// ============================================================================

export default function UnifiedDashboardPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProtocol, setSelectedProtocol] = useState<string>('all');
  const [selectedChain, setSelectedChain] = useState<string>('all');

  // 获取概览数据
  const fetchOverview = useCallback(async () => {
    try {
      const response = await fetch('/api/oracle/unified?action=overview');
      if (!response.ok) throw new Error('Failed to fetch overview');
      const data = await response.json();
      setOverview(data);
    } catch (error) {
      logger.error('Failed to fetch overview', { error });
    }
  }, []);

  // 获取协议列表
  const fetchProtocols = useCallback(async () => {
    try {
      const response = await fetch('/api/oracle/unified?action=protocols');
      if (!response.ok) throw new Error('Failed to fetch protocols');
      const data = await response.json();
      setProtocols(data.protocols || []);
    } catch (error) {
      logger.error('Failed to fetch protocols', { error });
    }
  }, []);

  // 获取实例列表
  const fetchInstances = useCallback(async () => {
    try {
      const response = await fetch('/api/oracle/unified?action=instances');
      if (!response.ok) throw new Error('Failed to fetch instances');
      const data = await response.json();
      setInstances(data.instances || []);
    } catch (error) {
      logger.error('Failed to fetch instances', { error });
    }
  }, []);

  // 获取告警列表
  const fetchAlerts = useCallback(async () => {
    try {
      const response = await fetch('/api/oracle/unified?action=alerts');
      if (!response.ok) throw new Error('Failed to fetch alerts');
      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      logger.error('Failed to fetch alerts', { error });
    }
  }, []);

  // 加载所有数据
  const loadAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchOverview(), fetchProtocols(), fetchInstances(), fetchAlerts()]);
    setLoading(false);
  }, [fetchOverview, fetchProtocols, fetchInstances, fetchAlerts]);

  // 刷新数据
  const refreshData = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  // 初始加载
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // 过滤实例
  const filteredInstances = instances.filter((instance) => {
    const matchesSearch =
      instance.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      instance.protocol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      instance.chain.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProtocol = selectedProtocol === 'all' || instance.protocol === selectedProtocol;
    const matchesChain = selectedChain === 'all' || instance.chain === selectedChain;
    return matchesSearch && matchesProtocol && matchesChain;
  });

  // 获取所有唯一的链
  const uniqueChains = Array.from(new Set(instances.map((i) => i.chain))).sort();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="border-primary h-12 w-12 animate-spin rounded-full border-b-2"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">通用预言机监控平台</h1>
          <p className="text-muted-foreground mt-1">Unified Oracle Monitoring Platform</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refreshData} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            添加实例
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      {overview && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="总实例数"
            value={overview.instances.total}
            subtitle={`${overview.instances.enabled} 个活跃`}
            icon={<Server className="h-5 w-5" />}
            alert={false}
          />
          <StatCard
            title="支持协议"
            value={Object.keys(overview.instances.byProtocol).length}
            subtitle="10+ 种预言机"
            icon={<Database className="h-5 w-5" />}
            alert={false}
          />
          <StatCard
            title="1小时更新"
            value={overview.prices.totalUpdates1h}
            subtitle="价格数据点"
            icon={<TrendingUp className="h-5 w-5" />}
            alert={false}
          />
          <StatCard
            title="活跃告警"
            value={overview.alerts.totalActive}
            subtitle={overview.alerts.totalActive > 0 ? '需要关注' : '系统正常'}
            icon={<AlertTriangle className="h-5 w-5" />}
            alert={overview.alerts.totalActive > 0}
          />
        </div>
      )}

      {/* 主内容区 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 lg:w-[500px]">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="protocols">协议</TabsTrigger>
          <TabsTrigger value="instances">实例</TabsTrigger>
          <TabsTrigger value="comparison">对比</TabsTrigger>
          <TabsTrigger value="alerts">
            告警
            {overview && overview.alerts.totalActive > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {overview.alerts.totalActive}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 概览 Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* 协议分布 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Database className="h-5 w-5" />
                  协议分布
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overview && Object.entries(overview.instances.byProtocol).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(overview.instances.byProtocol).map(([protocol, count]) => (
                      <div key={protocol} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{protocol.toUpperCase()}</Badge>
                          <span className="text-muted-foreground text-sm">
                            {getProtocolName(protocol)}
                          </span>
                        </div>
                        <span className="font-medium">{count} 个实例</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground py-4 text-center">暂无协议数据</p>
                )}
              </CardContent>
            </Card>

            {/* 同步状态 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="h-5 w-5" />
                  同步状态
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overview && overview.sync.length > 0 ? (
                  <div className="space-y-2">
                    {overview.sync.map((sync) => (
                      <div key={sync.protocol} className="flex items-center justify-between">
                        <Badge variant="secondary">{sync.protocol.toUpperCase()}</Badge>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-green-600">{sync.healthy} 正常</span>
                          {parseInt(sync.error) > 0 && (
                            <span className="text-sm text-red-600">{sync.error} 异常</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground py-4 text-center">暂无同步数据</p>
                )}
              </CardContent>
            </Card>

            {/* 链分布 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="h-5 w-5" />
                  链分布
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overview && Object.entries(overview.instances.byChain).length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(overview.instances.byChain).map(([chain, count]) => (
                      <div
                        key={chain}
                        className="bg-muted flex items-center justify-between rounded p-2"
                      >
                        <span className="text-sm font-medium capitalize">{chain}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground py-4 text-center">暂无链数据</p>
                )}
              </CardContent>
            </Card>

            {/* 告警状态 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5" />
                  告警状态
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overview && overview.alerts.active.length > 0 ? (
                  <div className="space-y-2">
                    {overview.alerts.active.map((alert) => (
                      <div
                        key={alert.severity}
                        className={`flex items-center justify-between rounded p-2 ${
                          alert.severity === 'critical'
                            ? 'bg-red-100'
                            : alert.severity === 'warning'
                              ? 'bg-yellow-100'
                              : 'bg-blue-100'
                        }`}
                      >
                        <span className="text-sm font-medium capitalize">
                          {alert.severity === 'critical'
                            ? '严重'
                            : alert.severity === 'warning'
                              ? '警告'
                              : '信息'}
                        </span>
                        <Badge variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                          {alert.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center">
                    <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                      <Activity className="h-6 w-6 text-green-600" />
                    </div>
                    <p className="text-muted-foreground">系统运行正常</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 协议 Tab */}
        <TabsContent value="protocols" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {protocols.map((protocol) => (
              <Card key={protocol.id} className="transition-shadow hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{protocol.name}</CardTitle>
                    <Badge variant={protocol.activeInstances > 0 ? 'default' : 'secondary'}>
                      {protocol.activeInstances} 实例
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">{protocol.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium">支持链:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {protocol.supportedChains.slice(0, 5).map((chain) => (
                          <Badge key={chain} variant="outline" className="text-xs">
                            {chain}
                          </Badge>
                        ))}
                        {protocol.supportedChains.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{protocol.supportedChains.length - 5}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium">功能:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {protocol.features.slice(0, 3).map((feature) => (
                          <Badge key={feature} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 实例 Tab */}
        <TabsContent value="instances" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>实例列表</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="text-muted-foreground absolute left-2 top-2.5 h-4 w-4" />
                    <Input
                      placeholder="搜索实例..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-[200px] pl-8"
                    />
                  </div>
                  <select
                    value={selectedProtocol}
                    onChange={(e) => setSelectedProtocol(e.target.value)}
                    className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                  >
                    <option value="all">所有协议</option>
                    {protocols.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedChain}
                    onChange={(e) => setSelectedChain(e.target.value)}
                    className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                  >
                    <option value="all">所有链</option>
                    {uniqueChains.map((chain) => (
                      <option key={chain} value={chain}>
                        {chain}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredInstances.length > 0 ? (
                <div className="space-y-2">
                  {filteredInstances.map((instance) => (
                    <InstanceRow
                      key={instance.id}
                      instance={instance}
                      onToggle={async () => {
                        try {
                          await fetch('/api/oracle/unified', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              id: instance.id,
                              updates: { enabled: !instance.enabled },
                            }),
                          });
                          loadAllData();
                        } catch (error) {
                          logger.error('Failed to toggle instance', { error });
                        }
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Server className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                  <p className="text-muted-foreground">暂无实例</p>
                  <Button className="mt-4" variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    创建第一个实例
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 对比 Tab */}
        <TabsContent value="comparison" className="space-y-4">
          <PriceComparison />
        </TabsContent>

        {/* 告警 Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <AlertsPanel alerts={alerts} onRefresh={fetchAlerts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// 子组件
// ============================================================================

function StatCard({
  title,
  value,
  subtitle,
  icon,
  alert = false,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <Card className={alert ? 'border-red-200' : ''}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div
            className={`rounded-lg p-2 ${
              alert ? 'bg-red-100' : 'bg-green-100'
            }`}
          >
            {icon}
          </div>
        </div>
        <div className="mt-4">
          <p className="text-muted-foreground text-sm">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          <p className={`text-sm ${alert ? 'text-red-600' : 'text-muted-foreground'}`}>
            {subtitle}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function InstanceRow({
  instance,
  onToggle,
}: {
  instance: Instance;
  onToggle: () => void;
}) {
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    setIsToggling(true);
    await onToggle();
    setIsToggling(false);
  };

  return (
    <div className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3 transition-colors">
      <div className="flex items-center gap-3">
        <div
          className={`h-2 w-2 rounded-full ${
            instance.enabled ? 'bg-green-500' : 'bg-gray-400'
          }`}
        />
        <div>
          <p className="font-medium">{instance.name}</p>
          <p className="text-muted-foreground text-sm">
            {instance.protocol} • {instance.chain}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={instance.enabled}
          onCheckedChange={handleToggle}
          disabled={isToggling}
        />
        <Button variant="ghost" size="sm">
          详情
        </Button>
      </div>
    </div>
  );
}

function PriceComparison() {
  const [symbol, setSymbol] = useState('ETH/USD');
  const [comparison, setComparison] = useState<{
    available: boolean;
    prices: Array<{
      protocol: string;
      chain: string;
      price: number;
      isStale: boolean;
    }>;
    statistics: {
      avgPrice: number;
      medianPrice: number;
      priceRangePercent: number;
    };
    recommended: {
      price: number;
      source: string;
    };
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchComparison = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/oracle/unified?action=comparison&symbol=${symbol}`);
      if (response.ok) {
        const data = await response.json();
        setComparison(data);
      }
    } catch (error) {
      logger.error('Failed to fetch comparison', { error });
    }
    setLoading(false);
  }, [symbol]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            跨协议价格对比
          </CardTitle>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          >
            <option value="ETH/USD">ETH/USD</option>
            <option value="BTC/USD">BTC/USD</option>
            <option value="LINK/USD">LINK/USD</option>
            <option value="MATIC/USD">MATIC/USD</option>
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : comparison?.available ? (
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left">协议</th>
                    <th className="py-2 text-left">链</th>
                    <th className="py-2 text-right">价格</th>
                    <th className="py-2 text-center">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.prices.map((price, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="py-2">
                        <Badge variant="secondary">{price.protocol.toUpperCase()}</Badge>
                      </td>
                      <td className="py-2 capitalize">{price.chain}</td>
                      <td className="py-2 text-right font-medium">
                        ${price.price.toLocaleString()}
                      </td>
                      <td className="py-2 text-center">
                        {price.isStale ? (
                          <Badge variant="destructive">过期</Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600">
                            正常
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t pt-4 md:grid-cols-4">
              <div>
                <p className="text-muted-foreground text-sm">平均价格</p>
                <p className="text-lg font-medium">
                  ${comparison.statistics.avgPrice.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">中位数</p>
                <p className="text-lg font-medium">
                  ${comparison.statistics.medianPrice.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">价格范围</p>
                <p className="text-lg font-medium">
                  {comparison.statistics.priceRangePercent.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">推荐价格</p>
                <p className="text-lg font-medium text-green-600">
                  ${comparison.recommended.price.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">暂无对比数据</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AlertsPanel({ alerts, onRefresh }: { alerts: Alert[]; onRefresh: () => void }) {
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'acknowledged' | 'resolved'>('open');

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSeverity = filter === 'all' || alert.severity === filter;
    const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
    return matchesSeverity && matchesStatus;
  });

  const handleAcknowledge = async (alertId: string) => {
    try {
      await fetch('/api/oracle/unified', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'acknowledgeAlert',
          alertId,
        }),
      });
      onRefresh();
    } catch (error) {
      logger.error('Failed to acknowledge alert', { error });
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      await fetch('/api/oracle/unified', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolveAlert',
          alertId,
        }),
      });
      onRefresh();
    } catch (error) {
      logger.error('Failed to resolve alert', { error });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              告警管理
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'critical' | 'warning' | 'info')}
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              >
                <option value="all">所有级别</option>
                <option value="critical">严重</option>
                <option value="warning">警告</option>
                <option value="info">信息</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'open' | 'acknowledged' | 'resolved')}
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              >
                <option value="all">所有状态</option>
                <option value="open">未处理</option>
                <option value="acknowledged">已确认</option>
                <option value="resolved">已解决</option>
              </select>
              <Button variant="outline" size="icon" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[500px] overflow-y-auto">
            {filteredAlerts.length > 0 ? (
              <div className="space-y-3">
                {filteredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`rounded-lg border p-4 transition-colors ${
                      alert.severity === 'critical'
                        ? 'border-red-200 bg-red-50'
                        : alert.severity === 'warning'
                          ? 'border-yellow-200 bg-yellow-50'
                          : 'border-blue-200 bg-blue-50'
                    } ${alert.status === 'resolved' ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {alert.severity === 'critical' ? (
                          <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
                        ) : alert.severity === 'warning' ? (
                          <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-600" />
                        ) : (
                          <Bell className="mt-0.5 h-5 w-5 text-blue-600" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{alert.title}</span>
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
                            <Badge variant="outline">{alert.status}</Badge>
                          </div>
                          <p className="text-muted-foreground mt-1 text-sm">{alert.message}</p>
                          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                            {alert.protocol && (
                              <span>
                                协议: <Badge variant="secondary">{alert.protocol}</Badge>
                              </span>
                            )}
                            {alert.chain && <span>链: {alert.chain}</span>}
                            {alert.symbol && <span>币种: {alert.symbol}</span>}
                            <span>时间: {new Date(alert.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {alert.status === 'open' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcknowledge(alert.id)}
                          >
                            确认
                          </Button>
                        )}
                        {alert.status !== 'resolved' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleResolve(alert.id)}
                          >
                            解决
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center py-12">
                <CheckCircle2 className="mb-4 h-16 w-16 text-green-500" />
                <p className="text-lg font-medium">暂无告警</p>
                <p className="text-muted-foreground">系统运行正常</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// 辅助函数
// ============================================================================

function getProtocolName(protocolId: string): string {
  const names: Record<string, string> = {
    insight: 'OracleMonitor',
    uma: 'UMA Optimistic Oracle',
    chainlink: 'Chainlink Data Feeds',
    pyth: 'Pyth Network',
    band: 'Band Protocol',
    api3: 'API3',
    redstone: 'RedStone',
    switchboard: 'Switchboard',
    flux: 'Flux',
    dia: 'DIA',
  };
  return names[protocolId] || protocolId;
}
