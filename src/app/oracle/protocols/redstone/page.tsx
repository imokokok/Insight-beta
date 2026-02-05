'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Activity, Shield, Database, Cpu, BarChart3, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ProtocolPageLayout } from '@/components/features/protocol/ProtocolPageLayout';
import { FeedTable, commonFeedColumns } from '@/components/features/protocol/FeedTable';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SUPPORTED_CHAINS } from '@/lib/types/protocol';
import type { RedStonePackage, RedStoneService } from '@/lib/types/protocol';

interface RedStoneStats {
  totalPackages: number;
  activePackages: number;
  stalePackages: number;
  totalServices: number;
  avgLatency: number;
  networkUptime: number;
}

const REDSTONE_CHAINS = SUPPORTED_CHAINS.filter((c) =>
  ['ethereum', 'arbitrum', 'optimism', 'base', 'avalanche', 'polygon', 'starknet'].includes(c.id),
);

export default function RedStoneMonitorPage() {
  const [packages, setPackages] = useState<RedStonePackage[]>([]);
  const [services, setServices] = useState<RedStoneService[]>([]);
  const [stats, setStats] = useState<RedStoneStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChain, setSelectedChain] = useState<string>('all');

  const fetchRedStoneData = useCallback(async () => {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockPackages: RedStonePackage[] = [
        {
          id: 'rs-1',
          name: 'BTC / USD',
          symbol: 'BTC/USD',
          price: 67432.15,
          decimals: 8,
          updatedAt: new Date(Date.now() - 30000).toISOString(),
          chain: 'ethereum',
          status: 'active',
          dataFeedId: 'btc-usd',
          timestamp: new Date(Date.now() - 30000).toISOString(),
          value: 67432.15,
          liteSignature: '0xabc...',
        },
        {
          id: 'rs-2',
          name: 'ETH / USD',
          symbol: 'ETH/USD',
          price: 3254.78,
          decimals: 8,
          updatedAt: new Date(Date.now() - 45000).toISOString(),
          chain: 'ethereum',
          status: 'active',
          dataFeedId: 'eth-usd',
          timestamp: new Date(Date.now() - 45000).toISOString(),
          value: 3254.78,
          liteSignature: '0xdef...',
        },
        {
          id: 'rs-3',
          name: 'AVAX / USD',
          symbol: 'AVAX/USD',
          price: 28.45,
          decimals: 8,
          updatedAt: new Date(Date.now() - 120000).toISOString(),
          chain: 'avalanche',
          status: 'stale',
          dataFeedId: 'avax-usd',
          timestamp: new Date(Date.now() - 120000).toISOString(),
          value: 28.45,
          liteSignature: '0xghi...',
        },
      ];

      const mockServices: RedStoneService[] = [
        {
          id: 'svc-1',
          name: 'RedStone Core',
          status: 'active',
          lastUpdate: new Date(Date.now() - 30000).toISOString(),
          dataPackages: 2500000,
          avgLatency: 150,
          reliability: 99.9,
        },
        {
          id: 'svc-2',
          name: 'RedStone Classic',
          status: 'active',
          lastUpdate: new Date(Date.now() - 45000).toISOString(),
          dataPackages: 1800000,
          avgLatency: 200,
          reliability: 99.8,
        },
        {
          id: 'svc-3',
          name: 'RedStone X',
          status: 'active',
          lastUpdate: new Date(Date.now() - 60000).toISOString(),
          dataPackages: 1200000,
          avgLatency: 100,
          reliability: 99.7,
        },
      ];

      const mockStats: RedStoneStats = {
        totalPackages: 350,
        activePackages: 348,
        stalePackages: 2,
        totalServices: 12,
        avgLatency: 150,
        networkUptime: 99.9,
      };

      setPackages(mockPackages);
      setServices(mockServices);
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to fetch RedStone data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRedStoneData();
    const interval = setInterval(fetchRedStoneData, 30000);
    return () => clearInterval(interval);
  }, [fetchRedStoneData]);

  const filteredPackages = useMemo(() => {
    if (selectedChain === 'all') return packages;
    return packages.filter((pkg) => pkg.chain === selectedChain);
  }, [packages, selectedChain]);

  const statsContent = stats && (
    <>
      <StatCard
        title="Total Packages"
        value={stats.totalPackages}
        icon={<Database className="h-5 w-5" />}
        color="blue"
      />
      <StatCard
        title="Active Packages"
        value={stats.activePackages}
        icon={<Activity className="h-5 w-5" />}
        color="green"
        subtitle={`${stats.stalePackages} stale`}
      />
      <StatCard
        title="Avg Latency"
        value={`${stats.avgLatency}ms`}
        icon={<Zap className="h-5 w-5" />}
        color="purple"
      />
      <StatCard
        title="Network Uptime"
        value={`${stats.networkUptime}%`}
        icon={<Shield className="h-5 w-5" />}
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
      {REDSTONE_CHAINS.map((chain) => (
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

  const packageColumns = [
    commonFeedColumns.symbol,
    commonFeedColumns.price,
    {
      key: 'dataFeedId',
      header: 'Data Feed',
    },
    commonFeedColumns.updatedAt,
    commonFeedColumns.status,
  ];

  const tabs = [
    {
      id: 'packages',
      label: 'Data Packages',
      icon: <Database className="h-4 w-4" />,
      content: (
        <FeedTable
          feeds={filteredPackages as unknown as Record<string, unknown>[]}
          columns={packageColumns}
          title="Data Packages"
        />
      ),
    },
    {
      id: 'services',
      label: 'Services',
      icon: <Cpu className="h-4 w-4" />,
      content: (
        <Card>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <Card key={service.id} className="border-0 bg-gray-50">
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{service.name}</h4>
                        <StatusBadge status={service.status} size="sm" />
                      </div>
                      <Cpu className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Reliability</span>
                        <span className="font-medium">{service.reliability}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Data Packages</span>
                        <span className="font-medium">{service.dataPackages.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Avg Latency</span>
                        <span className="font-medium">{service.avgLatency}ms</span>
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
                    <span>Package Coverage</span>
                    <span>
                      {(((stats?.activePackages || 0) / (stats?.totalPackages || 1)) * 100).toFixed(
                        1,
                      )}
                      %
                    </span>
                  </div>
                  <Progress
                    value={((stats?.activePackages || 0) / (stats?.totalPackages || 1)) * 100}
                  />
                </div>
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Service Participation</span>
                    <span>98%</span>
                  </div>
                  <Progress value={98} />
                </div>
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Update Frequency</span>
                    <span>99.5%</span>
                  </div>
                  <Progress value={99.5} />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4 font-semibold">About RedStone</h3>
              <p className="mb-3 text-sm text-gray-600">
                RedStone is a modular oracle providing low-latency, high-frequency data feeds for
                DeFi protocols across multiple blockchain networks.
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                <li>Modular oracle architecture</li>
                <li>Low-latency data feeds</li>
                <li>Multi-chain deployment</li>
                <li>On-demand data delivery</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <ProtocolPageLayout
      protocol="redstone"
      title="RedStone"
      description="Modular Oracle for DeFi"
      icon="💎"
      officialUrl="https://redstone.finance"
      loading={loading}
      onRefresh={fetchRedStoneData}
      stats={statsContent}
      chainSelector={chainSelectorContent}
      tabs={tabs}
      defaultTab="packages"
    />
  );
}
