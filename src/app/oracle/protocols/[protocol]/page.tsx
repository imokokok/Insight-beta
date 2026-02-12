'use client';

import { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';

import { useParams } from 'next/navigation';

import { Activity, Shield, TrendingUp, Globe, BarChart3, Bell, Clock } from 'lucide-react';

import { StatCard } from '@/components/common';
import {
  FeedTable,
  commonFeedColumns,
  type FeedColumn,
} from '@/components/features/protocol/FeedTable';
import type { ProtocolComparisonData } from '@/components/features/protocol/ProtocolComparison';
import { ProtocolPageLayout } from '@/components/features/protocol/ProtocolPageLayout';
import { Button, StatusBadge, RefreshStrategyVisualizer } from '@/components/ui';
import { Card, CardContent } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Progress } from '@/components/ui/progress';
import { ChartSkeleton } from '@/components/ui/skeleton';
import { useAutoRefreshWithStats } from '@/hooks/use-auto-refresh-with-stats';
import { logger } from '@/lib/logger';
import { getProtocolConfig } from '@/lib/protocol-config';
import { ORACLE_PROTOCOLS, type OracleProtocol } from '@/lib/types';
import { SUPPORTED_CHAINS } from '@/lib/types/protocol';
import { formatTimeAgo, truncateAddress } from '@/lib/utils/format';

// 将 OracleProtocol 转换为 ProtocolComparisonData
const convertToComparisonData = (protocols: OracleProtocol[]): ProtocolComparisonData[] => {
  return protocols.map((protocol) => ({
    id: protocol,
    name: protocol.charAt(0).toUpperCase() + protocol.slice(1),
    healthScore: Math.floor(Math.random() * 30) + 70, // 70-100
    latency: Math.floor(Math.random() * 500) + 100, // 100-600ms
    accuracy: parseFloat((Math.random() * 5 + 95).toFixed(2)), // 95-100%
    uptime: parseFloat((Math.random() * 2 + 98).toFixed(3)), // 98-100%
    activeFeeds: Math.floor(Math.random() * 100) + 50,
    supportedChains: Math.floor(Math.random() * 10) + 1,
    features: ['Price Feeds', 'Data Aggregation'],
  }));
};

// Dynamic imports for heavy components with recharts
const PriceHistoryChart = lazy(() =>
  import('@/components/features/protocol').then((mod) => ({
    default: mod.PriceHistoryChart,
  })),
);

const ProtocolComparison = lazy(() =>
  import('@/components/features/protocol').then((mod) => ({
    default: mod.ProtocolComparison,
  })),
);

const PriceAlertSettings = lazy(() =>
  import('@/components/features/protocol').then((mod) => ({
    default: mod.PriceAlertSettings,
  })),
);

// Dynamic import for generateMockPriceHistory
const generateMockPriceHistory = (basePrice: number, hours: number) => {
  const data = [];
  const now = new Date();
  for (let i = hours; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const volatility = 0.02;
    const trend = Math.sin(i / 12) * 0.01;
    const randomChange = (Math.random() - 0.5) * volatility;
    const price = basePrice * (1 + trend + randomChange);
    data.push({
      timestamp: time.getTime(),
      price: Number(price.toFixed(2)),
    });
  }
  return data;
};

export default function UnifiedProtocolPage() {
  const params = useParams();
  const protocol = params.protocol as OracleProtocol;
  const config = getProtocolConfig(protocol);

  const [feeds, setFeeds] = useState<unknown[]>([]);
  const [nodes, setNodes] = useState<unknown[]>([]);
  const [publishers, setPublishers] = useState<unknown[]>([]);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [selectedChain, setSelectedChain] = useState<string>('all');
  const [isValid, setIsValid] = useState(true);

  // Validate protocol
  useEffect(() => {
    setIsValid(ORACLE_PROTOCOLS.includes(protocol));
  }, [protocol]);

  // 使用新的自动刷新 hook，配置为 30 秒刷新策略
  const {
    lastUpdated,
    isRefreshing,
    isError,
    error,
    refresh,
    strategy,
    refreshHistory,
    refreshStats,
  } = useAutoRefreshWithStats({
    pageId: 'protocol-detail',
    fetchFn: useCallback(async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        setFeeds(config.mockData.feeds);
        setStats(config.mockData.stats);
        if (config.mockData.nodes) {
          setNodes(config.mockData.nodes);
        }
        if (config.mockData.publishers) {
          setPublishers(config.mockData.publishers);
        }
      } catch (err) {
        logger.error(`Failed to fetch ${protocol} data`, { error: err });
        throw err;
      }
    }, [protocol, config]),
    enabled: true,
  });

  // Filter feeds by chain
  const filteredFeeds = useMemo(() => {
    if (selectedChain === 'all') return feeds;
    return feeds.filter((feed: unknown) => (feed as { chain: string }).chain === selectedChain);
  }, [feeds, selectedChain]);

  // Get supported chains with icons
  const protocolChains = useMemo(() => {
    return SUPPORTED_CHAINS.filter((c) => config.supportedChains.includes(c.id));
  }, [config.supportedChains]);

  // Feed columns configuration
  const feedColumns = useMemo<FeedColumn[]>(() => {
    const baseColumns: FeedColumn[] = [
      commonFeedColumns.name,
      commonFeedColumns.price,
      commonFeedColumns.chain,
      commonFeedColumns.updatedAt,
      commonFeedColumns.status,
    ];

    // Add protocol-specific columns
    if (protocol === 'chainlink') {
      baseColumns.push({
        key: 'contractAddress',
        header: 'Contract',
        render: (value: unknown) => (
          <a
            href={`https://etherscan.io/address/${String(value)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm text-blue-600 hover:underline"
          >
            {truncateAddress(String(value))}
          </a>
        ),
      });
    }

    return baseColumns;
  }, [protocol]);

  // Build tabs based on protocol features
  const tabs = useMemo(() => {
    const tabList: {
      id: string;
      label: string;
      icon: React.ReactNode;
      content: React.ReactNode;
    }[] = [
      {
        id: 'feeds',
        label: 'Price Feeds',
        icon: <TrendingUp className="h-4 w-4" />,
        content: (
          <FeedTable
            feeds={filteredFeeds as Record<string, unknown>[]}
            columns={feedColumns}
            title="Price Feeds"
          />
        ),
      },
    ];

    // Add Nodes tab for Chainlink
    if (config.features.hasNodes && nodes.length > 0) {
      tabList.push({
        id: 'nodes',
        label: 'Node Operators',
        icon: <Globe className="h-4 w-4" />,
        content: (
          <Card>
            <CardContent className="p-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {nodes.map((node: unknown) => {
                  const n = node as {
                    id: string;
                    name: string;
                    address: string;
                    status: 'active' | 'inactive';
                    successRate: number;
                    totalSubmissions: number;
                    lastSubmission: string;
                  };
                  return (
                    <Card key={n.id} className="border-0 bg-gray-50">
                      <CardContent className="p-4">
                        <div className="mb-3 flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{n.name}</h4>
                            <p className="font-mono text-sm text-gray-500">
                              {truncateAddress(n.address)}
                            </p>
                          </div>
                          <StatusBadge status={n.status} size="sm" />
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Success Rate</span>
                            <span className="font-medium">{n.successRate}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Total Submissions</span>
                            <span className="font-medium">
                              {n.totalSubmissions.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Last Submission</span>
                            <span className="font-medium">{formatTimeAgo(n.lastSubmission)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ),
      });
    }

    // Add Publishers tab for Pyth
    if (config.features.hasPublishers && publishers.length > 0) {
      tabList.push({
        id: 'publishers',
        label: 'Publishers',
        icon: <Globe className="h-4 w-4" />,
        content: (
          <Card>
            <CardContent className="p-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {publishers.map((pub: unknown) => {
                  const p = pub as {
                    id: string;
                    name: string;
                    status: 'active' | 'inactive';
                    accuracy: number;
                    totalPublishes: number;
                    lastPublish: string;
                  };
                  return (
                    <Card key={p.id} className="border-0 bg-gray-50">
                      <CardContent className="p-4">
                        <div className="mb-3 flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{p.name}</h4>
                          </div>
                          <StatusBadge status={p.status} size="sm" />
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Accuracy</span>
                            <span className="font-medium">{p.accuracy}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Total Publishes</span>
                            <span className="font-medium">{p.totalPublishes.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Last Publish</span>
                            <span className="font-medium">{formatTimeAgo(p.lastPublish)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ),
      });
    }

    // Add Charts tab
    if (config.features.hasPriceHistory) {
      tabList.push({
        id: 'charts',
        label: 'Charts',
        icon: <BarChart3 className="h-4 w-4" />,
        content: (
          <Suspense fallback={<ChartSkeleton className="h-96" />}>
            <div className="grid gap-4 lg:grid-cols-2">
              <PriceHistoryChart
                data={generateMockPriceHistory(3254.78, 168)}
                symbol="ETH/USD"
                title="ETH/USD Price History"
              />
              <PriceHistoryChart
                data={generateMockPriceHistory(67432.15, 168)}
                symbol="BTC/USD"
                title="BTC/USD Price History"
              />
            </div>
          </Suspense>
        ),
      });
    }

    // Add Comparison tab
    if (config.features.hasComparison) {
      tabList.push({
        id: 'comparison',
        label: 'Compare',
        icon: <Activity className="h-4 w-4" />,
        content: (
          <Suspense fallback={<ChartSkeleton className="h-96" />}>
            <ProtocolComparison protocols={convertToComparisonData(ORACLE_PROTOCOLS)} />
          </Suspense>
        ),
      });
    }

    // Add Alerts tab
    if (config.features.hasAlerts) {
      tabList.push({
        id: 'alerts',
        label: 'Alerts',
        icon: <Bell className="h-4 w-4" />,
        content: (
          <Suspense fallback={<ChartSkeleton className="h-96" />}>
            <div className="grid gap-4 lg:grid-cols-2">
              <PriceAlertSettings symbol="ETH/USD" currentPrice={3254.78} />
              <PriceAlertSettings symbol="BTC/USD" currentPrice={67432.15} />
            </div>
          </Suspense>
        ),
      });
    }

    // Add Analytics tab
    if (config.features.hasAnalytics) {
      tabList.push({
        id: 'analytics',
        label: 'Analytics',
        icon: <BarChart3 className="h-4 w-4" />,
        content: (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="p-6">
                <h3 className="mb-4 font-semibold">Network Health</h3>
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span>Feed Coverage</span>
                      <span>
                        {(
                          (((stats?.activeFeeds as number) || 0) /
                            ((stats?.totalFeeds as number) || 1)) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                    <Progress
                      value={
                        (((stats?.activeFeeds as number) || 0) /
                          ((stats?.totalFeeds as number) || 1)) *
                        100
                      }
                    />
                  </div>
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span>Network Uptime</span>
                      <span>{stats?.networkUptime as number}%</span>
                    </div>
                    <Progress value={stats?.networkUptime as number} />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="mb-4 font-semibold">About {config.name}</h3>
                <p className="mb-3 text-sm text-gray-600">{config.description}</p>
                <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                  <li>Real-time price feed monitoring</li>
                  <li>Multi-chain support</li>
                  <li>Decentralized oracle network</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        ),
      });
    }

    return tabList;
  }, [config, filteredFeeds, feedColumns, nodes, publishers, stats]);

  // Stats content
  const statsContent = stats && (
    <>
      <StatCard
        title="Total Feeds"
        value={stats.totalFeeds as number}
        icon={<TrendingUp className="h-5 w-5" />}
        color="blue"
      />
      <StatCard
        title="Active Feeds"
        value={stats.activeFeeds as number}
        icon={<Activity className="h-5 w-5" />}
        color="green"
        subtitle={`${stats.staleFeeds as number} stale`}
      />
      <StatCard
        title="Network Uptime"
        value={`${stats.networkUptime as number}%`}
        icon={<Shield className="h-5 w-5" />}
        color="purple"
      />
      <StatCard
        title="Avg Latency"
        value={`${((stats.avgUpdateLatency as number) / 1000).toFixed(1)}s`}
        icon={<Clock className="h-5 w-5" />}
        color="amber"
      />
    </>
  );

  // Chain selector
  const chainSelectorContent = (
    <>
      <Button
        variant={selectedChain === 'all' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setSelectedChain('all')}
      >
        All Chains
      </Button>
      {protocolChains.map((chain) => (
        <Button
          key={chain.id}
          variant={selectedChain === chain.id ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedChain(chain.id)}
          className="gap-1"
        >
          <span>{chain.icon}</span>
          {chain.name}
        </Button>
      ))}
    </>
  );

  // Early return for invalid protocol - must be after all hooks
  if (!isValid) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">Invalid Protocol</h1>
          <p className="text-muted-foreground mb-4">
            The protocol &quot;{protocol}&quot; is not supported.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 错误提示 */}
      {isError && error && (
        <ErrorBanner
          error={error}
          onRetry={refresh}
          title={`加载 ${config.name} 数据失败`}
          isRetrying={isRefreshing}
        />
      )}

      {/* 刷新策略可视化 */}
      <div className="flex justify-end px-4">
        <RefreshStrategyVisualizer
          strategy={strategy}
          lastUpdated={lastUpdated}
          isRefreshing={isRefreshing}
          onRefresh={refresh}
          refreshHistory={refreshHistory}
          refreshStats={refreshStats}
          showHistory={true}
          showStats={true}
          compact={true}
        />
      </div>

      <ProtocolPageLayout
        protocol={protocol}
        title={config.name}
        description={config.description}
        icon={config.icon}
        officialUrl={config.officialUrl}
        loading={isRefreshing && !stats}
        onRefresh={refresh}
        stats={statsContent}
        chainSelector={chainSelectorContent}
        tabs={tabs}
        defaultTab="feeds"
      />
    </div>
  );
}
