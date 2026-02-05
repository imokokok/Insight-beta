'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Activity, Shield, TrendingUp, Zap, Building2, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ProtocolPageLayout } from '@/components/features/protocol/ProtocolPageLayout';
import { FeedTable, commonFeedColumns } from '@/components/features/protocol/FeedTable';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SUPPORTED_CHAINS } from '@/lib/types/protocol';
import type { API3Feed, API3Airnode } from '@/lib/types/protocol';

interface API3Stats {
  totalFeeds: number;
  activeFeeds: number;
  staleFeeds: number;
  totalAirnodes: number;
  avgDeviation: number;
  networkUptime: number;
}

const API3_CHAINS = SUPPORTED_CHAINS.filter((c) =>
  ['ethereum', 'arbitrum', 'optimism', 'base', 'polygon', 'avalanche', 'bsc'].includes(c.id),
);

export default function API3MonitorPage() {
  const [feeds, setFeeds] = useState<API3Feed[]>([]);
  const [airnodes, setAirnodes] = useState<API3Airnode[]>([]);
  const [stats, setStats] = useState<API3Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChain, setSelectedChain] = useState<string>('all');

  const fetchAPI3Data = useCallback(async () => {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockFeeds: API3Feed[] = [
        {
          id: 'api3-1',
          name: 'BTC / USD',
          symbol: 'BTC/USD',
          price: 67432.15,
          decimals: 8,
          updatedAt: new Date(Date.now() - 30000).toISOString(),
          chain: 'ethereum',
          status: 'active',
          dapiName: 'BTC/USD',
          beaconCount: 5,
          updateThreshold: 0.5,
        },
        {
          id: 'api3-2',
          name: 'ETH / USD',
          symbol: 'ETH/USD',
          price: 3254.78,
          decimals: 8,
          updatedAt: new Date(Date.now() - 45000).toISOString(),
          chain: 'ethereum',
          status: 'active',
          dapiName: 'ETH/USD',
          beaconCount: 7,
          updateThreshold: 0.5,
        },
        {
          id: 'api3-3',
          name: 'LINK / USD',
          symbol: 'LINK/USD',
          price: 18.45,
          decimals: 8,
          updatedAt: new Date(Date.now() - 120000).toISOString(),
          chain: 'ethereum',
          status: 'stale',
          dapiName: 'LINK/USD',
          beaconCount: 3,
          updateThreshold: 1.0,
        },
      ];

      const mockAirnodes: API3Airnode[] = [
        {
          id: 'airnode-1',
          name: 'API3 Foundation',
          address: '0x1234...5678',
          status: 'active',
          lastUpdate: new Date(Date.now() - 30000).toISOString(),
          totalRequests: 2500000,
          accuracy: 99.9,
          endpointId: '0xabc...',
          xpub: 'xpub6...',
          sponsoredRequests: 1500000,
        },
        {
          id: 'airnode-2',
          name: 'ChainAPI Node',
          address: '0xabcd...efgh',
          status: 'active',
          lastUpdate: new Date(Date.now() - 45000).toISOString(),
          totalRequests: 1800000,
          accuracy: 99.8,
          endpointId: '0xdef...',
          xpub: 'xpub7...',
          sponsoredRequests: 1200000,
        },
        {
          id: 'airnode-3',
          name: 'Independent Node',
          address: '0x9876...5432',
          status: 'inactive',
          lastUpdate: new Date(Date.now() - 86400000).toISOString(),
          totalRequests: 950000,
          accuracy: 99.5,
          endpointId: '0xghi...',
          xpub: 'xpub8...',
          sponsoredRequests: 800000,
        },
      ];

      const mockStats: API3Stats = {
        totalFeeds: 120,
        activeFeeds: 118,
        staleFeeds: 2,
        totalAirnodes: 45,
        avgDeviation: 0.3,
        networkUptime: 99.95,
      };

      setFeeds(mockFeeds);
      setAirnodes(mockAirnodes);
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to fetch API3 data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAPI3Data();
    const interval = setInterval(fetchAPI3Data, 30000);
    return () => clearInterval(interval);
  }, [fetchAPI3Data]);

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
        title="Avg Deviation"
        value={`${stats.avgDeviation}%`}
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
      {API3_CHAINS.map((chain) => (
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
      key: 'dapiName',
      header: 'dAPI',
    },
    {
      key: 'beaconCount',
      header: 'Beacons',
    },
    {
      key: 'updateThreshold',
      header: 'Threshold',
      render: (value: unknown) => <span>{Number(value).toFixed(1)}%</span>,
    },
    commonFeedColumns.updatedAt,
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
      id: 'airnodes',
      label: 'Airnodes',
      icon: <Building2 className="h-4 w-4" />,
      content: (
        <Card>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {airnodes.map((airnode) => (
                <Card key={airnode.id} className="border-0 bg-gray-50">
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{airnode.name}</h4>
                        <StatusBadge status={airnode.status} size="sm" />
                      </div>
                      <Building2 className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Accuracy</span>
                        <span className="font-medium">{airnode.accuracy}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Requests</span>
                        <span className="font-medium">
                          {airnode.totalRequests.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Sponsored</span>
                        <span className="font-medium">
                          {airnode.sponsoredRequests.toLocaleString()}
                        </span>
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
                    <span>Airnode Participation</span>
                    <span>95%</span>
                  </div>
                  <Progress value={95} />
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
              <h3 className="mb-4 font-semibold">About API3</h3>
              <p className="mb-3 text-sm text-gray-600">
                API3 is a first-party oracle solution that enables data providers to operate their
                own oracles (Airnodes) for direct, secure data feeds.
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                <li>First-party oracle architecture</li>
                <li>dAPIs for aggregated data feeds</li>
                <li>DAO-governed oracle network</li>
                <li>QRNG for quantum randomness</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <ProtocolPageLayout
      protocol="api3"
      title="API3"
      description="First-Party Oracle Solution"
      icon="🌐"
      officialUrl="https://api3.org"
      loading={loading}
      onRefresh={fetchAPI3Data}
      stats={statsContent}
      chainSelector={chainSelectorContent}
      tabs={tabs}
      defaultTab="feeds"
    />
  );
}
