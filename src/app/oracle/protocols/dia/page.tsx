'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Activity, Shield, Database, Layers, BarChart3, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ProtocolPageLayout } from '@/components/features/protocol/ProtocolPageLayout';
import { FeedTable, commonFeedColumns } from '@/components/features/protocol/FeedTable';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SUPPORTED_CHAINS } from '@/lib/types/protocol';
import type { DIAAsset, DIAScraper } from '@/lib/types/protocol';

interface DIAStats {
  totalAssets: number;
  activeAssets: number;
  staleAssets: number;
  totalScrapers: number;
  avgConfidence: number;
  networkUptime: number;
}

const DIA_CHAINS = SUPPORTED_CHAINS.filter((c) =>
  ['ethereum', 'arbitrum', 'optimism', 'base', 'avalanche', 'polygon', 'fantom'].includes(c.id),
);

export default function DIAMonitorPage() {
  const [assets, setAssets] = useState<DIAAsset[]>([]);
  const [scrapers, setScrapers] = useState<DIAScraper[]>([]);
  const [stats, setStats] = useState<DIAStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChain, setSelectedChain] = useState<string>('all');

  const fetchDIAData = useCallback(async () => {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockAssets: DIAAsset[] = [
        {
          id: 'dia-1',
          name: 'BTC / USD',
          symbol: 'BTC/USD',
          price: 67432.15,
          decimals: 8,
          updatedAt: new Date(Date.now() - 30000).toISOString(),
          chain: 'ethereum',
          status: 'active',
          source: 'Binance',
          confidence: 99.5,
          method: 'CEX',
        },
        {
          id: 'dia-2',
          name: 'ETH / USD',
          symbol: 'ETH/USD',
          price: 3254.78,
          decimals: 8,
          updatedAt: new Date(Date.now() - 45000).toISOString(),
          chain: 'ethereum',
          status: 'active',
          source: 'Coinbase',
          confidence: 99.8,
          method: 'CEX',
        },
        {
          id: 'dia-3',
          name: 'LINK / USD',
          symbol: 'LINK/USD',
          price: 18.45,
          decimals: 8,
          updatedAt: new Date(Date.now() - 120000).toISOString(),
          chain: 'ethereum',
          status: 'stale',
          source: 'Uniswap',
          confidence: 98.5,
          method: 'DEX',
        },
      ];

      const mockScrapers: DIAScraper[] = [
        {
          id: 'scraper-1',
          name: 'Binance Scraper',
          type: 'cex',
          status: 'active',
          lastUpdate: new Date(Date.now() - 30000).toISOString(),
          totalAssets: 150,
          reliability: 99.9,
        },
        {
          id: 'scraper-2',
          name: 'Coinbase Scraper',
          type: 'cex',
          status: 'active',
          lastUpdate: new Date(Date.now() - 45000).toISOString(),
          totalAssets: 120,
          reliability: 99.8,
        },
        {
          id: 'scraper-3',
          name: 'Uniswap Scraper',
          type: 'dex',
          status: 'active',
          lastUpdate: new Date(Date.now() - 60000).toISOString(),
          totalAssets: 80,
          reliability: 99.5,
        },
      ];

      const mockStats: DIAStats = {
        totalAssets: 280,
        activeAssets: 278,
        staleAssets: 2,
        totalScrapers: 15,
        avgConfidence: 99.2,
        networkUptime: 99.95,
      };

      setAssets(mockAssets);
      setScrapers(mockScrapers);
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to fetch DIA data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDIAData();
    const interval = setInterval(fetchDIAData, 30000);
    return () => clearInterval(interval);
  }, [fetchDIAData]);

  const filteredAssets = useMemo(() => {
    if (selectedChain === 'all') return assets;
    return assets.filter((asset) => asset.chain === selectedChain);
  }, [assets, selectedChain]);

  const statsContent = stats && (
    <>
      <StatCard
        title="Total Assets"
        value={stats.totalAssets}
        icon={<Database className="h-5 w-5" />}
        color="blue"
      />
      <StatCard
        title="Active Assets"
        value={stats.activeAssets}
        icon={<Activity className="h-5 w-5" />}
        color="green"
        subtitle={`${stats.staleAssets} stale`}
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
      {DIA_CHAINS.map((chain) => (
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

  const assetColumns = [
    commonFeedColumns.symbol,
    commonFeedColumns.price,
    {
      key: 'source',
      header: 'Source',
    },
    {
      key: 'method',
      header: 'Method',
    },
    {
      key: 'confidence',
      header: 'Confidence',
      render: (value: unknown) => <span>{Number(value).toFixed(1)}%</span>,
    },
    commonFeedColumns.updatedAt,
    commonFeedColumns.status,
  ];

  const tabs = [
    {
      id: 'assets',
      label: 'Assets',
      icon: <Database className="h-4 w-4" />,
      content: (
        <FeedTable
          feeds={filteredAssets as unknown as Record<string, unknown>[]}
          columns={assetColumns}
          title="Assets"
        />
      ),
    },
    {
      id: 'scrapers',
      label: 'Scrapers',
      icon: <Layers className="h-4 w-4" />,
      content: (
        <Card>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {scrapers.map((scraper) => (
                <Card key={scraper.id} className="border-0 bg-gray-50">
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{scraper.name}</h4>
                        <StatusBadge status={scraper.status} size="sm" />
                      </div>
                      <Layers className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Type</span>
                        <span className="font-medium uppercase">{scraper.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Assets</span>
                        <span className="font-medium">{scraper.totalAssets}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Reliability</span>
                        <span className="font-medium">{scraper.reliability}%</span>
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
                    <span>Asset Coverage</span>
                    <span>
                      {(((stats?.activeAssets || 0) / (stats?.totalAssets || 1)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={((stats?.activeAssets || 0) / (stats?.totalAssets || 1)) * 100}
                  />
                </div>
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Scraper Participation</span>
                    <span>97%</span>
                  </div>
                  <Progress value={97} />
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
              <h3 className="mb-4 font-semibold">About DIA</h3>
              <p className="mb-3 text-sm text-gray-600">
                DIA (Decentralized Information Asset) is an open-source oracle platform that
                provides transparent and customizable data feeds for DeFi applications.
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                <li>Transparent data sourcing</li>
                <li>Customizable data feeds</li>
                <li>Multi-source aggregation</li>
                <li>Community-verified data</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <ProtocolPageLayout
      protocol="dia"
      title="DIA"
      description="Decentralized Information Asset"
      icon="💎"
      officialUrl="https://diadata.org"
      loading={loading}
      onRefresh={fetchDIAData}
      stats={statsContent}
      chainSelector={chainSelectorContent}
      tabs={tabs}
      defaultTab="assets"
    />
  );
}
