'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Activity, Shield, Layers, Users, BarChart3, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ProtocolPageLayout } from '@/components/features/protocol/ProtocolPageLayout';
import { FeedTable, commonFeedColumns } from '@/components/features/protocol/FeedTable';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SUPPORTED_CHAINS } from '@/lib/types/protocol';
import type { SwitchboardAggregator, SwitchboardOracle } from '@/lib/types/protocol';

interface SwitchboardStats {
  totalAggregators: number;
  activeAggregators: number;
  staleAggregators: number;
  totalOracles: number;
  avgVariance: number;
  networkUptime: number;
}

const SWITCHBOARD_CHAINS = SUPPORTED_CHAINS.filter((c) =>
  ['solana', 'ethereum', 'arbitrum', 'optimism', 'base', 'aptos'].includes(c.id),
);

export default function SwitchboardMonitorPage() {
  const [aggregators, setAggregators] = useState<SwitchboardAggregator[]>([]);
  const [oracles, setOracles] = useState<SwitchboardOracle[]>([]);
  const [stats, setStats] = useState<SwitchboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChain, setSelectedChain] = useState<string>('all');

  const fetchSwitchboardData = useCallback(async () => {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockAggregators: SwitchboardAggregator[] = [
        {
          id: 'sb-1',
          name: 'BTC / USD',
          symbol: 'BTC/USD',
          price: 67432.15,
          decimals: 8,
          updatedAt: new Date(Date.now() - 30000).toISOString(),
          chain: 'solana',
          status: 'active',
          queueId: 'queue-1',
          batchSize: 5,
          minOracleResults: 3,
          varianceThreshold: 0.5,
        },
        {
          id: 'sb-2',
          name: 'ETH / USD',
          symbol: 'ETH/USD',
          price: 3254.78,
          decimals: 8,
          updatedAt: new Date(Date.now() - 45000).toISOString(),
          chain: 'solana',
          status: 'active',
          queueId: 'queue-1',
          batchSize: 5,
          minOracleResults: 3,
          varianceThreshold: 0.5,
        },
        {
          id: 'sb-3',
          name: 'SOL / USD',
          symbol: 'SOL/USD',
          price: 98.45,
          decimals: 8,
          updatedAt: new Date(Date.now() - 120000).toISOString(),
          chain: 'solana',
          status: 'stale',
          queueId: 'queue-2',
          batchSize: 3,
          minOracleResults: 2,
          varianceThreshold: 1.0,
        },
      ];

      const mockOracles: SwitchboardOracle[] = [
        {
          id: 'oracle-1',
          name: 'Switchboard Foundation',
          address: '0x1234...5678',
          status: 'active',
          lastUpdate: new Date(Date.now() - 30000).toISOString(),
          totalRequests: 2500000,
          accuracy: 99.9,
          queueId: 'queue-1',
          stake: 10000,
          jobCount: 50,
          lastHeartbeat: new Date(Date.now() - 30000).toISOString(),
        },
        {
          id: 'oracle-2',
          name: 'Community Node A',
          address: '0xabcd...efgh',
          status: 'active',
          lastUpdate: new Date(Date.now() - 45000).toISOString(),
          totalRequests: 1800000,
          accuracy: 99.8,
          queueId: 'queue-1',
          stake: 8000,
          jobCount: 45,
          lastHeartbeat: new Date(Date.now() - 45000).toISOString(),
        },
        {
          id: 'oracle-3',
          name: 'Community Node B',
          address: '0x9876...5432',
          status: 'inactive',
          lastUpdate: new Date(Date.now() - 86400000).toISOString(),
          totalRequests: 950000,
          accuracy: 99.5,
          queueId: 'queue-2',
          stake: 5000,
          jobCount: 30,
          lastHeartbeat: new Date(Date.now() - 86400000).toISOString(),
        },
      ];

      const mockStats: SwitchboardStats = {
        totalAggregators: 200,
        activeAggregators: 198,
        staleAggregators: 2,
        totalOracles: 85,
        avgVariance: 0.3,
        networkUptime: 99.95,
      };

      setAggregators(mockAggregators);
      setOracles(mockOracles);
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to fetch Switchboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSwitchboardData();
    const interval = setInterval(fetchSwitchboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchSwitchboardData]);

  const filteredAggregators = useMemo(() => {
    if (selectedChain === 'all') return aggregators;
    return aggregators.filter((agg) => agg.chain === selectedChain);
  }, [aggregators, selectedChain]);

  const statsContent = stats && (
    <>
      <StatCard
        title="Total Aggregators"
        value={stats.totalAggregators}
        icon={<Layers className="h-5 w-5" />}
        color="blue"
      />
      <StatCard
        title="Active Aggregators"
        value={stats.activeAggregators}
        icon={<Activity className="h-5 w-5" />}
        color="green"
        subtitle={`${stats.staleAggregators} stale`}
      />
      <StatCard
        title="Avg Variance"
        value={`${stats.avgVariance}%`}
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
      {SWITCHBOARD_CHAINS.map((chain) => (
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

  const aggregatorColumns = [
    commonFeedColumns.symbol,
    commonFeedColumns.price,
    {
      key: 'varianceThreshold',
      header: 'Variance',
      render: (value: unknown) => <span>{Number(value).toFixed(1)}%</span>,
    },
    {
      key: 'minOracleResults',
      header: 'Min Oracles',
    },
    commonFeedColumns.updatedAt,
    commonFeedColumns.status,
  ];

  const tabs = [
    {
      id: 'aggregators',
      label: 'Aggregators',
      icon: <Layers className="h-4 w-4" />,
      content: (
        <FeedTable
          feeds={filteredAggregators as unknown as Record<string, unknown>[]}
          columns={aggregatorColumns}
          title="Aggregators"
        />
      ),
    },
    {
      id: 'oracles',
      label: 'Oracles',
      icon: <Users className="h-4 w-4" />,
      content: (
        <Card>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {oracles.map((oracle) => (
                <Card key={oracle.id} className="border-0 bg-gray-50">
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{oracle.name}</h4>
                        <StatusBadge status={oracle.status} size="sm" />
                      </div>
                      <Users className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Stake</span>
                        <span className="font-medium">{oracle.stake.toLocaleString()} SB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Jobs</span>
                        <span className="font-medium">{oracle.jobCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Accuracy</span>
                        <span className="font-medium">{oracle.accuracy}%</span>
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
                    <span>Aggregator Coverage</span>
                    <span>
                      {(
                        ((stats?.activeAggregators || 0) / (stats?.totalAggregators || 1)) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                  <Progress
                    value={((stats?.activeAggregators || 0) / (stats?.totalAggregators || 1)) * 100}
                  />
                </div>
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Oracle Participation</span>
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
              <h3 className="mb-4 font-semibold">About Switchboard</h3>
              <p className="mb-3 text-sm text-gray-600">
                Switchboard is a permissionless oracle network built on Solana, enabling
                customizable data feeds for decentralized applications.
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                <li>Permissionless oracle network</li>
                <li>Customizable data feeds</li>
                <li>Staking-based security</li>
                <li>Multi-chain support</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <ProtocolPageLayout
      protocol="switchboard"
      title="Switchboard"
      description="Permissionless Oracle Network"
      icon="🔮"
      officialUrl="https://switchboard.xyz"
      loading={loading}
      onRefresh={fetchSwitchboardData}
      stats={statsContent}
      chainSelector={chainSelectorContent}
      tabs={tabs}
      defaultTab="aggregators"
    />
  );
}
