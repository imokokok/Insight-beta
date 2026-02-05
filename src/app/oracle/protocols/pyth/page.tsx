'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Activity, Shield, TrendingUp, Zap, Building2, BarChart3, Bell } from 'lucide-react';
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
import { formatTimeAgo } from '@/lib/utils/format';
import { ORACLE_PROTOCOLS } from '@/lib/types';
import { SUPPORTED_CHAINS } from '@/lib/types/protocol';
import type { PythFeed, PythPublisher, PythStats } from '@/lib/types/protocol';

// Pyth 支持的链
const PYTH_CHAINS = SUPPORTED_CHAINS.filter((c) =>
  ['ethereum', 'solana', 'arbitrum', 'optimism', 'base', 'avalanche', 'polygon'].includes(c.id),
);

export default function PythMonitorPage() {
  const [feeds, setFeeds] = useState<PythFeed[]>([]);
  const [publishers, setPublishers] = useState<PythPublisher[]>([]);
  const [stats, setStats] = useState<PythStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChain, setSelectedChain] = useState<string>('all');

  const fetchPythData = useCallback(async () => {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockFeeds: PythFeed[] = [
        {
          id: 'btc-usd',
          name: 'BTC / USD',
          symbol: 'BTC/USD',
          price: 67432.15,
          decimals: 8,
          updatedAt: new Date(Date.now() - 30000).toISOString(),
          chain: 'solana',
          status: 'active',
          confidence: 0.05,
          sources: 12,
          publishTime: new Date(Date.now() - 30000).toISOString(),
        },
        {
          id: 'eth-usd',
          name: 'ETH / USD',
          symbol: 'ETH/USD',
          price: 3254.78,
          decimals: 8,
          updatedAt: new Date(Date.now() - 45000).toISOString(),
          chain: 'solana',
          status: 'active',
          confidence: 0.02,
          sources: 15,
          publishTime: new Date(Date.now() - 45000).toISOString(),
        },
        {
          id: 'sol-usd',
          name: 'SOL / USD',
          symbol: 'SOL/USD',
          price: 98.45,
          decimals: 8,
          updatedAt: new Date(Date.now() - 120000).toISOString(),
          chain: 'solana',
          status: 'stale',
          confidence: 0.03,
          sources: 8,
          publishTime: new Date(Date.now() - 120000).toISOString(),
        },
        {
          id: 'link-usd',
          name: 'LINK / USD',
          symbol: 'LINK/USD',
          price: 18.45,
          decimals: 8,
          updatedAt: new Date(Date.now() - 60000).toISOString(),
          chain: 'ethereum',
          status: 'active',
          confidence: 0.01,
          sources: 10,
          publishTime: new Date(Date.now() - 60000).toISOString(),
        },
      ];

      const mockPublishers: PythPublisher[] = [
        {
          id: 'pub-1',
          name: 'Jump Crypto',
          status: 'active',
          lastPublish: new Date(Date.now() - 30000).toISOString(),
          totalPublishes: 2500000,
          accuracy: 99.9,
        },
        {
          id: 'pub-2',
          name: 'Jane Street',
          status: 'active',
          lastPublish: new Date(Date.now() - 45000).toISOString(),
          totalPublishes: 1800000,
          accuracy: 99.8,
        },
        {
          id: 'pub-3',
          name: 'Wintermute',
          status: 'active',
          lastPublish: new Date(Date.now() - 60000).toISOString(),
          totalPublishes: 1200000,
          accuracy: 99.7,
        },
      ];

      const mockStats: PythStats = {
        totalFeeds: 400,
        activeFeeds: 398,
        staleFeeds: 2,
        totalNodes: 45,
        avgUpdateLatency: 200,
        networkUptime: 99.99,
        totalPublishers: 45,
        avgConfidence: 99.7,
      };

      setFeeds(mockFeeds);
      setPublishers(mockPublishers);
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to fetch Pyth data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPythData();
    const interval = setInterval(fetchPythData, 30000);
    return () => clearInterval(interval);
  }, [fetchPythData]);

  const filteredFeeds = useMemo(() => {
    if (selectedChain === 'all') return feeds;
    return feeds.filter((feed) => feed.chain === selectedChain);
  }, [feeds, selectedChain]);

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
        title="Avg Confidence"
        value={`${stats.avgConfidence}%`}
        icon={<Shield className="h-5 w-5" />}
        color="purple"
      />
      <StatCard
        title="Network Uptime"
        value={`${stats.networkUptime}%`}
        icon={<Zap className="h-5 w-5" />}
        color="orange"
      />
    </>
  );

  const chainSelectorContent = (
    <>
      <Button
        variant={selectedChain === 'all' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setSelectedChain('all')}
      >
        All Chains
      </Button>
      {PYTH_CHAINS.map((chain) => (
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

  const feedColumns = [
    commonFeedColumns.symbol,
    commonFeedColumns.price,
    {
      key: 'confidence',
      header: 'Confidence',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Progress value={Number(value) * 100} className="h-2 w-20" />
          <span className="text-sm">{(Number(value) * 100).toFixed(1)}%</span>
        </div>
      ),
    },
    {
      key: 'sources',
      header: 'Sources',
    },
    {
      key: 'publishTime',
      header: 'Last Update',
      render: (value: unknown) => (
        <span className="text-sm text-gray-500">{formatTimeAgo(String(value))}</span>
      ),
    },
    commonFeedColumns.status,
  ];

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
      id: 'publishers',
      label: 'Publishers',
      icon: <Building2 className="h-4 w-4" />,
      content: (
        <Card>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {publishers.map((publisher) => (
                <Card key={publisher.id} className="border-0 bg-gray-50">
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{publisher.name}</h4>
                        <StatusBadge status={publisher.status} size="sm" />
                      </div>
                      <Building2 className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Accuracy</span>
                        <span className="font-medium">{publisher.accuracy}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Publishes</span>
                        <span className="font-medium">
                          {publisher.totalPublishes.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Last Publish</span>
                        <span className="font-medium">{formatTimeAgo(publisher.lastPublish)}</span>
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
                    <span>Publisher Participation</span>
                    <span>94%</span>
                  </div>
                  <Progress value={94} />
                </div>
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Update Frequency</span>
                    <span>99.8%</span>
                  </div>
                  <Progress value={99.8} />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4 font-semibold">About Pyth Network</h3>
              <p className="mb-3 text-sm text-gray-600">
                Pyth Network is a next-generation oracle solution that provides high-fidelity,
                real-time market data for cryptocurrencies, equities, FX, and commodities.
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                <li>Sub-second price updates</li>
                <li>Confidence intervals for each price</li>
                <li>First-party data from institutional traders</li>
                <li>Multi-chain deployment</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <ProtocolPageLayout
      protocol="pyth"
      title="Pyth Network"
      description="Low-Latency Financial Data Oracle"
      icon="🐍"
      officialUrl="https://pyth.network"
      loading={loading}
      onRefresh={fetchPythData}
      stats={statsContent}
      chainSelector={chainSelectorContent}
      tabs={tabs}
      defaultTab="feeds"
    />
  );
}
