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
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, AlertTriangle, Globe, Zap, BarChart3, RefreshCw, Filter } from 'lucide-react';
import { ProtocolSelector } from '@/components/features/protocol/ProtocolSelector';
import { ProtocolCard } from '@/components/features/protocol/ProtocolCard';
import { EmptyState } from '@/components/features/common/EmptyState';
import { Button } from '@/components/ui/button';
import {
  StatsCard,
  PriceComparisonCard,
  PriceHistoryChart,
  AlertsPanel,
} from '@/components/features/dashboard';
import type { CrossProtocolComparison, OracleProtocol, SupportedChain } from '@/lib/types';

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
  const [comparison, setComparison] = useState<CrossProtocolComparison | null>(null);
  const [priceHistory, setPriceHistory] = useState<CrossProtocolComparison[]>([]);
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

          if (!isUnmounting && !event.wasClean && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            reconnectTimeout = setTimeout(connect, Math.min(3000 * reconnectAttempts, 15000));
          }
        };

        ws.onerror = () => {
          if (process.env.NODE_ENV === 'production' || reconnectAttempts === 0) {
            console.warn('WebSocket connection error, will retry...');
          }
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (typeof message !== 'object' || message === null) return;

            const msg = message as { type: string; data: unknown };

            switch (msg.type) {
              case 'price_update':
                break;
              case 'comparison_update':
                setComparison(msg.data as CrossProtocolComparison);
                break;
            }
          } catch {
            // 静默处理解析错误
          }
        };
      } catch {
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
        ws.onclose = null;
        ws.close();
      }
    };
  }, []);

  // 初始数据加载
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

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

  const handleResetFilters = () => {
    setSelectedProtocol('all');
    setSelectedSymbol('ETH/USD');
    setSelectedChain('all');
  };

  const getDeviationTrend = (): 'up' | 'down' | 'stable' => {
    if (!dashboardStats) return 'stable';
    return dashboardStats.avgDeviation > 1 ? 'up' : 'down';
  };

  const getAlertsTrend = (): 'up' | 'down' | 'stable' => {
    if (!dashboardStats) return 'stable';
    return dashboardStats.activeAlerts > 0 ? 'up' : 'stable';
  };

  // ============================================================================
  // 渲染
  // ============================================================================

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      {/* 页面标题 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            Unified Oracle Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 md:text-base">
            Real-time multi-protocol price monitoring and comparison
          </p>
        </div>
        <ConnectionBadge connected={wsConnected} />
      </div>

      {/* 筛选栏 */}
      <FilterBar
        selectedProtocol={selectedProtocol}
        onProtocolChange={setSelectedProtocol}
        onReset={handleResetFilters}
      />

      {/* 统计卡片 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          trend={getAlertsTrend()}
          loading={loading}
        />
        <StatsCard
          title="Avg Deviation"
          value={`${(dashboardStats?.avgDeviation || 0).toFixed(2)}%`}
          icon={<BarChart3 className="h-4 w-4" />}
          trend={getDeviationTrend()}
          loading={loading}
        />
      </div>

      {/* 主内容区 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="comparison">Price Comparison</TabsTrigger>
          <TabsTrigger value="protocols">Protocol Status</TabsTrigger>
          <TabsTrigger value="history">Price History</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        {/* 价格对比 */}
        <TabsContent value="comparison" className="space-y-4">
          <ComparisonFilters
            selectedSymbol={selectedSymbol}
            onSymbolChange={setSelectedSymbol}
            selectedChain={selectedChain}
            onChainChange={setSelectedChain}
          />

          {comparison ? (
            <PriceComparisonCard comparison={comparison} />
          ) : (
            <EmptyComparisonState symbol={selectedSymbol} />
          )}
        </TabsContent>

        {/* 协议状态 */}
        <TabsContent value="protocols">
          <ProtocolGrid
            protocols={protocolStats}
            selectedProtocol={selectedProtocol}
            loading={loading}
            onClearFilter={() => setSelectedProtocol('all')}
          />
        </TabsContent>

        {/* 价格历史 */}
        <TabsContent value="history">
          <PriceHistoryChart data={priceHistory} symbol={selectedSymbol} />
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

function ConnectionBadge({ connected }: { connected: boolean }) {
  return (
    <Badge variant={connected ? 'default' : 'destructive'} className="w-fit">
      {connected ? (
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
  );
}

interface FilterBarProps {
  selectedProtocol: OracleProtocol | 'all';
  onProtocolChange: (protocol: OracleProtocol | 'all') => void;
  onReset: () => void;
}

function FilterBar({ selectedProtocol, onProtocolChange, onReset }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-700">Filter by Protocol:</span>
      </div>
      <div className="w-full sm:w-64">
        <ProtocolSelector
          value={selectedProtocol}
          onChange={(protocol) => onProtocolChange(protocol as OracleProtocol | 'all')}
          showAll={true}
        />
      </div>
      <Button variant="outline" size="sm" onClick={onReset} className="w-full sm:ml-auto sm:w-auto">
        <RefreshCw className="mr-2 h-4 w-4" />
        Reset Filters
      </Button>
    </div>
  );
}

interface ComparisonFiltersProps {
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
  selectedChain: SupportedChain | 'all';
  onChainChange: (chain: SupportedChain | 'all') => void;
}

function ComparisonFilters({
  selectedSymbol,
  onSymbolChange,
  selectedChain,
  onChainChange,
}: ComparisonFiltersProps) {
  const symbols = ['ETH/USD', 'BTC/USD', 'LINK/USD', 'MATIC/USD', 'AVAX/USD'];
  const chains: { value: SupportedChain | 'all'; label: string }[] = [
    { value: 'all', label: 'All Chains' },
    { value: 'ethereum', label: 'Ethereum' },
    { value: 'polygon', label: 'Polygon' },
    { value: 'arbitrum', label: 'Arbitrum' },
    { value: 'optimism', label: 'Optimism' },
    { value: 'base', label: 'Base' },
  ];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="w-full sm:w-48">
            <label className="mb-2 block text-sm font-medium text-gray-700">Trading Pair</label>
            <select
              value={selectedSymbol}
              onChange={(e) => onSymbolChange(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            >
              {symbols.map((symbol) => (
                <option key={symbol} value={symbol}>
                  {symbol}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-48">
            <label className="mb-2 block text-sm font-medium text-gray-700">Chain</label>
            <select
              value={selectedChain}
              onChange={(e) => onChainChange(e.target.value as SupportedChain | 'all')}
              className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            >
              {chains.map((chain) => (
                <option key={chain.value} value={chain.value}>
                  {chain.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyComparisonState({ symbol }: { symbol: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <Activity className="mx-auto mb-4 h-12 w-12 text-gray-300" />
        <p className="text-gray-500">No comparison data available for {symbol}</p>
        <p className="mt-1 text-sm text-gray-400">
          Try selecting a different trading pair or check back later
        </p>
      </CardContent>
    </Card>
  );
}

interface ProtocolGridProps {
  protocols: ProtocolStats[];
  selectedProtocol: OracleProtocol | 'all';
  loading: boolean;
  onClearFilter: () => void;
}

function ProtocolGrid({ protocols, selectedProtocol, loading, onClearFilter }: ProtocolGridProps) {
  const filteredProtocols = protocols.filter(
    (p) => selectedProtocol === 'all' || p.protocol === selectedProtocol,
  );

  if (filteredProtocols.length === 0) {
    return (
      <EmptyState
        variant="search"
        title="No protocols found"
        description="Try adjusting your protocol filter."
        action={{
          label: 'Clear filter',
          onClick: onClearFilter,
        }}
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {filteredProtocols.map((protocol) => (
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
  );
}
