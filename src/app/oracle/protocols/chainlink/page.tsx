'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Activity, Shield, Globe, TrendingUp, Clock, BarChart3, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ProtocolPageLayout } from '@/components/features/protocol/ProtocolPageLayout';
import { FeedTable, commonFeedColumns } from '@/components/features/protocol/FeedTable';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  PriceHistoryChart,
  generateMockPriceHistory,
  ProtocolComparison,
  PriceAlertSettings,
} from '@/components/features/protocol';
import { formatTimeAgo, truncateAddress } from '@/lib/utils/format';
import { ORACLE_PROTOCOLS } from '@/lib/types';
import { SUPPORTED_CHAINS } from '@/lib/types/protocol';
import type { ChainlinkFeed, ChainlinkNode, ChainlinkStats } from '@/lib/types/protocol';

// Chainlink 支持的链
const CHAINLINK_CHAINS = SUPPORTED_CHAINS.filter((c) =>
  ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche', 'bsc'].includes(c.id),
);

export default function ChainlinkMonitorPage() {
  const [feeds, setFeeds] = useState<ChainlinkFeed[]>([]);
  const [nodes, setNodes] = useState<ChainlinkNode[]>([]);
  const [stats, setStats] = useState<ChainlinkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChain, setSelectedChain] = useState<string>('all');

  const fetchChainlinkData = useCallback(async () => {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 模拟数据
      const mockFeeds: ChainlinkFeed[] = [
        {
          id: 'eth-usd',
          name: 'ETH / USD',
          symbol: 'ETH/USD',
          price: 3254.78,
          decimals: 8,
          updatedAt: new Date(Date.now() - 120000).toISOString(),
          roundId: '123456789',
          answeredInRound: '123456789',
          chain: 'ethereum',
          contractAddress: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
          heartbeat: 3600,
          deviationThreshold: 0.5,
          status: 'active',
        },
        {
          id: 'btc-usd',
          name: 'BTC / USD',
          symbol: 'BTC/USD',
          price: 67432.15,
          decimals: 8,
          updatedAt: new Date(Date.now() - 180000).toISOString(),
          roundId: '987654321',
          answeredInRound: '987654321',
          chain: 'ethereum',
          contractAddress: '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
          heartbeat: 3600,
          deviationThreshold: 0.5,
          status: 'active',
        },
        {
          id: 'link-usd',
          name: 'LINK / USD',
          symbol: 'LINK/USD',
          price: 18.45,
          decimals: 8,
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
          roundId: '456789123',
          answeredInRound: '456789123',
          chain: 'ethereum',
          contractAddress: '0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c',
          heartbeat: 3600,
          deviationThreshold: 1.0,
          status: 'stale',
        },
      ];

      const mockNodes: ChainlinkNode[] = [
        {
          id: 'node-1',
          name: 'Chainlink Labs 1',
          address: '0x1234567890abcdef1234567890abcdef12345678',
          status: 'active',
          lastUpdate: new Date(Date.now() - 60000).toISOString(),
          totalSubmissions: 15420,
          accuracy: 99.8,
          lastSubmission: new Date(Date.now() - 60000).toISOString(),
          successRate: 99.8,
          totalRequests: 15420,
        },
        {
          id: 'node-2',
          name: 'Chainlink Labs 2',
          address: '0xabcdef1234567890abcdef1234567890abcdef12',
          status: 'active',
          lastUpdate: new Date(Date.now() - 90000).toISOString(),
          totalSubmissions: 12350,
          accuracy: 99.5,
          lastSubmission: new Date(Date.now() - 90000).toISOString(),
          successRate: 99.5,
          totalRequests: 12350,
        },
        {
          id: 'node-3',
          name: 'Independent Node A',
          address: '0x9876543210fedcba9876543210fedcba98765432',
          status: 'inactive',
          lastUpdate: new Date(Date.now() - 86400000).toISOString(),
          totalSubmissions: 8750,
          accuracy: 97.2,
          lastSubmission: new Date(Date.now() - 86400000).toISOString(),
          successRate: 97.2,
          totalRequests: 8750,
        },
      ];

      const mockStats: ChainlinkStats = {
        totalFeeds: 150,
        activeFeeds: 147,
        staleFeeds: 3,
        totalNodes: 25,
        avgUpdateLatency: 45000,
        networkUptime: 99.9,
        totalSubmissions: 500000,
      };

      setFeeds(mockFeeds);
      setNodes(mockNodes);
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to fetch Chainlink data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChainlinkData();
    const interval = setInterval(fetchChainlinkData, 30000);
    return () => clearInterval(interval);
  }, [fetchChainlinkData]);

  // 使用 useMemo 优化筛选性能
  const filteredFeeds = useMemo(() => {
    if (selectedChain === 'all') return feeds;
    return feeds.filter((feed) => feed.chain === selectedChain);
  }, [feeds, selectedChain]);

  // 统计卡片
  const statsContent = stats && (
    <>
      <StatCard
        title="Total Feeds"
        value={stats.totalFeeds}
        icon={<TrendingUp className="h-5 w-5" />}
        color="blue"
      />
      <StatCard
        title="Active Feeds"
        value={stats.activeFeeds}
        icon={<Activity className="h-5 w-5" />}
        color="green"
        subtitle={`${stats.staleFeeds} stale`}
      />
      <StatCard
        title="Network Uptime"
        value={`${stats.networkUptime}%`}
        icon={<Shield className="h-5 w-5" />}
        color="purple"
      />
      <StatCard
        title="Avg Latency"
        value={`${(stats.avgUpdateLatency / 1000).toFixed(1)}s`}
        icon={<Clock className="h-5 w-5" />}
        color="orange"
      />
    </>
  );

  // 链选择器
  const chainSelectorContent = (
    <>
      <Button
        variant={selectedChain === 'all' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setSelectedChain('all')}
      >
        All Chains
      </Button>
      {CHAINLINK_CHAINS.map((chain) => (
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

  // 表格列配置
  const feedColumns = [
    commonFeedColumns.name,
    commonFeedColumns.price,
    commonFeedColumns.chain,
    commonFeedColumns.updatedAt,
    commonFeedColumns.status,
    {
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
    },
  ];

  // 标签页配置
  const tabs = [
    {
      id: 'feeds',
      label: 'Price Feeds',
      icon: <TrendingUp className="h-4 w-4" />,
      content: (
        <FeedTable
          feeds={filteredFeeds as unknown as Record<string, unknown>[]}
          columns={feedColumns}
          title="Price Feeds"
        />
      ),
    },
    {
      id: 'nodes',
      label: 'Node Operators',
      icon: <Globe className="h-4 w-4" />,
      content: (
        <Card>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {nodes.map((node) => (
                <Card key={node.id} className="border-0 bg-gray-50">
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{node.name}</h4>
                        <p className="font-mono text-sm text-gray-500">
                          {truncateAddress(node.address)}
                        </p>
                      </div>
                      <StatusBadge status={node.status} size="sm" />
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Success Rate</span>
                        <span className="font-medium">{node.successRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Submissions</span>
                        <span className="font-medium">
                          {node.totalSubmissions.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Last Submission</span>
                        <span className="font-medium">{formatTimeAgo(node.lastSubmission)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      ),
    },
    {
      id: 'charts',
      label: 'Charts',
      icon: <BarChart3 className="h-4 w-4" />,
      content: (
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
      ),
    },
    {
      id: 'comparison',
      label: 'Compare',
      icon: <Activity className="h-4 w-4" />,
      content: <ProtocolComparison protocols={ORACLE_PROTOCOLS} symbol="ETH/USD" />,
    },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: <Bell className="h-4 w-4" />,
      content: (
        <div className="grid gap-4 lg:grid-cols-2">
          <PriceAlertSettings symbol="ETH/USD" currentPrice={3254.78} />
          <PriceAlertSettings symbol="BTC/USD" currentPrice={67432.15} />
        </div>
      ),
    },
    {
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
                      {(((stats?.activeFeeds || 0) / (stats?.totalFeeds || 1)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={((stats?.activeFeeds || 0) / (stats?.totalFeeds || 1)) * 100} />
                </div>
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Node Participation</span>
                    <span>92%</span>
                  </div>
                  <Progress value={92} />
                </div>
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Update Frequency</span>
                    <span>98.5%</span>
                  </div>
                  <Progress value={98.5} />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4 font-semibold">About Chainlink</h3>
              <p className="mb-3 text-sm text-gray-600">
                Chainlink is the industry-standard decentralized oracle network, providing secure
                and reliable data feeds for smart contracts across multiple blockchain networks.
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                <li>Decentralized network of independent node operators</li>
                <li>Multiple layers of data aggregation and validation</li>
                <li>Support for 1000+ price feeds across 15+ chains</li>
                <li>Proven security with billions in secured value</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <ProtocolPageLayout
      protocol="chainlink"
      title="Chainlink Monitor"
      description="Decentralized Oracle Network Monitoring"
      icon="🔗"
      officialUrl="https://chain.link"
      loading={loading}
      onRefresh={fetchChainlinkData}
      stats={statsContent}
      chainSelector={chainSelectorContent}
      tabs={tabs}
      defaultTab="feeds"
    />
  );
}
