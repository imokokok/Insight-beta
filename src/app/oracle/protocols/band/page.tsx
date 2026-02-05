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
import type { BandFeed, BandValidator } from '@/lib/types/protocol';

interface BandStats {
  totalFeeds: number;
  activeFeeds: number;
  staleFeeds: number;
  totalValidators: number;
  avgConfidence: number;
  networkUptime: number;
}

const BAND_CHAINS = SUPPORTED_CHAINS.filter((c) =>
  ['ethereum', 'cosmos', 'osmosis', 'injective', 'secret'].includes(c.id),
);

export default function BandMonitorPage() {
  const [feeds, setFeeds] = useState<BandFeed[]>([]);
  const [validators, setValidators] = useState<BandValidator[]>([]);
  const [stats, setStats] = useState<BandStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChain, setSelectedChain] = useState<string>('all');

  const fetchBandData = useCallback(async () => {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockFeeds: BandFeed[] = [
        {
          id: 'band-1',
          name: 'BTC / USD',
          symbol: 'BTC/USD',
          price: 67432.15,
          decimals: 8,
          updatedAt: new Date(Date.now() - 30000).toISOString(),
          chain: 'cosmos',
          status: 'active',
          requestId: '12345',
          blockHeight: 1234567,
          validatorCount: 7,
        },
        {
          id: 'band-2',
          name: 'ETH / USD',
          symbol: 'ETH/USD',
          price: 3254.78,
          decimals: 8,
          updatedAt: new Date(Date.now() - 45000).toISOString(),
          chain: 'cosmos',
          status: 'active',
          requestId: '12346',
          blockHeight: 1234568,
          validatorCount: 7,
        },
        {
          id: 'band-3',
          name: 'ATOM / USD',
          symbol: 'ATOM/USD',
          price: 8.45,
          decimals: 8,
          updatedAt: new Date(Date.now() - 120000).toISOString(),
          chain: 'cosmos',
          status: 'stale',
          requestId: '12347',
          blockHeight: 1234565,
          validatorCount: 5,
        },
      ];

      const mockValidators: BandValidator[] = [
        {
          id: 'val-1',
          name: 'Band Foundation',
          address: 'band1...abc',
          status: 'active',
          lastUpdate: new Date(Date.now() - 30000).toISOString(),
          totalRequests: 1500000,
          accuracy: 99.8,
          votingPower: 25.5,
          commission: 5,
          delegators: 1200,
        },
        {
          id: 'val-2',
          name: 'Cosmostation',
          address: 'band1...def',
          status: 'active',
          lastUpdate: new Date(Date.now() - 45000).toISOString(),
          totalRequests: 1200000,
          accuracy: 99.7,
          votingPower: 18.3,
          commission: 8,
          delegators: 980,
        },
        {
          id: 'val-3',
          name: 'Stakewolle',
          address: 'band1...ghi',
          status: 'active',
          lastUpdate: new Date(Date.now() - 60000).toISOString(),
          totalRequests: 980000,
          accuracy: 99.5,
          votingPower: 12.1,
          commission: 10,
          delegators: 650,
        },
      ];

      const mockStats: BandStats = {
        totalFeeds: 150,
        activeFeeds: 147,
        staleFeeds: 3,
        totalValidators: 72,
        avgConfidence: 98.5,
        networkUptime: 99.9,
      };

      setFeeds(mockFeeds);
      setValidators(mockValidators);
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to fetch Band data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBandData();
    const interval = setInterval(fetchBandData, 30000);
    return () => clearInterval(interval);
  }, [fetchBandData]);

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
      {BAND_CHAINS.map((chain) => (
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
      key: 'validatorCount',
      header: 'Validators',
    },
    {
      key: 'blockHeight',
      header: 'Block Height',
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
      id: 'validators',
      label: 'Validators',
      icon: <Building2 className="h-4 w-4" />,
      content: (
        <Card>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {validators.map((validator) => (
                <Card key={validator.id} className="border-0 bg-gray-50">
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{validator.name}</h4>
                        <StatusBadge status={validator.status} size="sm" />
                      </div>
                      <Building2 className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Voting Power</span>
                        <span className="font-medium">{validator.votingPower}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Commission</span>
                        <span className="font-medium">{validator.commission}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Delegators</span>
                        <span className="font-medium">{validator.delegators}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Accuracy</span>
                        <span className="font-medium">{validator.accuracy}%</span>
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
                    <span>Validator Participation</span>
                    <span>96%</span>
                  </div>
                  <Progress value={96} />
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
              <h3 className="mb-4 font-semibold">About Band Protocol</h3>
              <p className="mb-3 text-sm text-gray-600">
                Band Protocol is a cross-chain data oracle platform that aggregates and connects
                real-world data and APIs to smart contracts.
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                <li>Decentralized oracle network</li>
                <li>Cross-chain compatibility</li>
                <li>Customizable data feeds</li>
                <li>Economic security through staking</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <ProtocolPageLayout
      protocol="band"
      title="Band Protocol"
      description="Cross-Chain Data Oracle Platform"
      icon="🎸"
      officialUrl="https://bandprotocol.com"
      loading={loading}
      onRefresh={fetchBandData}
      stats={statsContent}
      chainSelector={chainSelectorContent}
      tabs={tabs}
      defaultTab="feeds"
    />
  );
}
