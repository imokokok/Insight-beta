'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Activity, Shield, Target, Users, BarChart3, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ProtocolPageLayout } from '@/components/features/protocol/ProtocolPageLayout';
import { FeedTable, commonFeedColumns } from '@/components/features/protocol/FeedTable';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SUPPORTED_CHAINS } from '@/lib/types/protocol';
import type { FluxDataRequest, FluxProvider } from '@/lib/types/protocol';

interface FluxStats {
  totalRequests: number;
  activeRequests: number;
  staleRequests: number;
  totalProviders: number;
  avgFinality: number;
  networkUptime: number;
}

const FLUX_CHAINS = SUPPORTED_CHAINS.filter((c) => ['near', 'ethereum', 'aurora'].includes(c.id));

export default function FluxMonitorPage() {
  const [requests, setRequests] = useState<FluxDataRequest[]>([]);
  const [providers, setProviders] = useState<FluxProvider[]>([]);
  const [stats, setStats] = useState<FluxStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChain, setSelectedChain] = useState<string>('all');

  const fetchFluxData = useCallback(async () => {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockRequests: FluxDataRequest[] = [
        {
          id: 'flux-1',
          name: 'BTC / USD',
          symbol: 'BTC/USD',
          price: 67432.15,
          decimals: 8,
          updatedAt: new Date(Date.now() - 30000).toISOString(),
          chain: 'near',
          status: 'active',
          finality: 99.9,
          providers: 8,
          reward: '0.5 NEAR',
        },
        {
          id: 'flux-2',
          name: 'ETH / USD',
          symbol: 'ETH/USD',
          price: 3254.78,
          decimals: 8,
          updatedAt: new Date(Date.now() - 45000).toISOString(),
          chain: 'near',
          status: 'active',
          finality: 99.8,
          providers: 7,
          reward: '0.5 NEAR',
        },
        {
          id: 'flux-3',
          name: 'NEAR / USD',
          symbol: 'NEAR/USD',
          price: 5.45,
          decimals: 8,
          updatedAt: new Date(Date.now() - 120000).toISOString(),
          chain: 'near',
          status: 'stale',
          finality: 98.5,
          providers: 6,
          reward: '0.3 NEAR',
        },
      ];

      const mockProviders: FluxProvider[] = [
        {
          id: 'provider-1',
          name: 'Flux Foundation',
          address: 'flux.near',
          status: 'active',
          lastUpdate: new Date(Date.now() - 30000).toISOString(),
          totalRequests: 2500000,
          accuracy: 99.9,
          stake: '50000 NEAR',
        },
        {
          id: 'provider-2',
          name: 'Community Node A',
          address: 'node-a.near',
          status: 'active',
          lastUpdate: new Date(Date.now() - 45000).toISOString(),
          totalRequests: 1800000,
          accuracy: 99.8,
          stake: '30000 NEAR',
        },
        {
          id: 'provider-3',
          name: 'Community Node B',
          address: 'node-b.near',
          status: 'inactive',
          lastUpdate: new Date(Date.now() - 86400000).toISOString(),
          totalRequests: 950000,
          accuracy: 99.5,
          stake: '20000 NEAR',
        },
      ];

      const mockStats: FluxStats = {
        totalRequests: 150,
        activeRequests: 148,
        staleRequests: 2,
        totalProviders: 25,
        avgFinality: 99.2,
        networkUptime: 99.95,
      };

      setRequests(mockRequests);
      setProviders(mockProviders);
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to fetch Flux data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFluxData();
    const interval = setInterval(fetchFluxData, 30000);
    return () => clearInterval(interval);
  }, [fetchFluxData]);

  const filteredRequests = useMemo(() => {
    if (selectedChain === 'all') return requests;
    return requests.filter((req) => req.chain === selectedChain);
  }, [requests, selectedChain]);

  const statsContent = stats && (
    <>
      <StatCard
        title="Total Requests"
        value={stats.totalRequests}
        icon={<Target className="h-5 w-5" />}
        color="blue"
      />
      <StatCard
        title="Active Requests"
        value={stats.activeRequests}
        icon={<Activity className="h-5 w-5" />}
        color="green"
        subtitle={`${stats.staleRequests} stale`}
      />
      <StatCard
        title="Avg Finality"
        value={`${stats.avgFinality}%`}
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
      {FLUX_CHAINS.map((chain) => (
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

  const requestColumns = [
    commonFeedColumns.symbol,
    commonFeedColumns.price,
    {
      key: 'finality',
      header: 'Finality',
      render: (value: unknown) => <span>{Number(value).toFixed(1)}%</span>,
    },
    {
      key: 'providers',
      header: 'Providers',
    },
    {
      key: 'reward',
      header: 'Reward',
    },
    commonFeedColumns.updatedAt,
    commonFeedColumns.status,
  ];

  const tabs = [
    {
      id: 'requests',
      label: 'Data Requests',
      icon: <Target className="h-4 w-4" />,
      content: (
        <FeedTable
          feeds={filteredRequests as unknown as Record<string, unknown>[]}
          columns={requestColumns}
          title="Data Requests"
        />
      ),
    },
    {
      id: 'providers',
      label: 'Providers',
      icon: <Users className="h-4 w-4" />,
      content: (
        <Card>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {providers.map((provider) => (
                <Card key={provider.id} className="border-0 bg-gray-50">
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{provider.name}</h4>
                        <StatusBadge status={provider.status} size="sm" />
                      </div>
                      <Users className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Stake</span>
                        <span className="font-medium">{provider.stake}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Requests</span>
                        <span className="font-medium">
                          {provider.totalRequests.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Accuracy</span>
                        <span className="font-medium">{provider.accuracy}%</span>
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
                    <span>Request Coverage</span>
                    <span>
                      {(((stats?.activeRequests || 0) / (stats?.totalRequests || 1)) * 100).toFixed(
                        1,
                      )}
                      %
                    </span>
                  </div>
                  <Progress
                    value={((stats?.activeRequests || 0) / (stats?.totalRequests || 1)) * 100}
                  />
                </div>
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Provider Participation</span>
                    <span>96%</span>
                  </div>
                  <Progress value={96} />
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
              <h3 className="mb-4 font-semibold">About Flux</h3>
              <p className="mb-3 text-sm text-gray-600">
                Flux is a decentralized oracle network built on NEAR Protocol, providing secure and
                reliable data feeds for DeFi applications.
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                <li>NEAR-native oracle solution</li>
                <li>Incentive-aligned data providers</li>
                <li>High finality guarantees</li>
                <li>Cross-chain compatibility</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <ProtocolPageLayout
      protocol="flux"
      title="Flux"
      description="Decentralized Oracle on NEAR"
      icon="⚡"
      officialUrl="https://fluxprotocol.org"
      loading={loading}
      onRefresh={fetchFluxData}
      stats={statsContent}
      chainSelector={chainSelectorContent}
      tabs={tabs}
      defaultTab="requests"
    />
  );
}
