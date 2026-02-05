'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  Activity,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  BarChart3,
  Layers,
  Database,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface DIAAsset {
  id: string;
  symbol: string;
  price: number;
  timestamp: string;
  source: string;
  confidence: number;
  status: 'active' | 'stale' | 'error';
  method: string;
}

interface DIAScraper {
  id: string;
  name: string;
  type: 'cex' | 'dex' | 'defi';
  status: 'active' | 'inactive';
  lastUpdate: string;
  totalAssets: number;
  reliability: number;
}

interface DIAStats {
  totalAssets: number;
  activeAssets: number;
  staleAssets: number;
  totalScrapers: number;
  avgConfidence: number;
  networkUptime: number;
}

const SUPPORTED_CHAINS = [
  { id: 'ethereum', name: 'Ethereum', icon: '⬡' },
  { id: 'arbitrum', name: 'Arbitrum', icon: '🔷' },
  { id: 'optimism', name: 'Optimism', icon: '🔴' },
  { id: 'base', name: 'Base', icon: '🔵' },
  { id: 'avalanche', name: 'Avalanche', icon: '❄️' },
  { id: 'polygon', name: 'Polygon', icon: '💜' },
  { id: 'fantom', name: 'Fantom', icon: '👻' },
];

export default function DIAMonitorPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<DIAAsset[]>([]);
  const [scrapers, setScrapers] = useState<DIAScraper[]>([]);
  const [stats, setStats] = useState<DIAStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChain, setSelectedChain] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('assets');

  useEffect(() => {
    fetchDIAData();
    const interval = setInterval(fetchDIAData, 30000);
    return () => clearInterval(interval);
  }, [selectedChain]);

  async function fetchDIAData() {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockAssets: DIAAsset[] = [
        {
          id: 'dia-1',
          symbol: 'BTC/USD',
          price: 67432.15,
          timestamp: new Date(Date.now() - 30000).toISOString(),
          source: 'Multi-Source',
          confidence: 0.98,
          status: 'active',
          method: 'VWAP',
        },
        {
          id: 'dia-2',
          symbol: 'ETH/USD',
          price: 3254.78,
          timestamp: new Date(Date.now() - 45000).toISOString(),
          source: 'Multi-Source',
          confidence: 0.97,
          status: 'active',
          method: 'VWAP',
        },
        {
          id: 'dia-3',
          symbol: 'AAVE/USD',
          price: 98.45,
          timestamp: new Date(Date.now() - 120000).toISOString(),
          source: 'DEX Aggregated',
          confidence: 0.95,
          status: 'stale',
          method: 'Median',
        },
        {
          id: 'dia-4',
          symbol: 'CRV/USD',
          price: 0.45,
          timestamp: new Date(Date.now() - 60000).toISOString(),
          source: 'Curve Finance',
          confidence: 0.96,
          status: 'active',
          method: 'TWAP',
        },
      ];

      const mockScrapers: DIAScraper[] = [
        {
          id: 'scraper-1',
          name: 'Binance Scraper',
          type: 'cex',
          status: 'active',
          lastUpdate: new Date(Date.now() - 30000).toISOString(),
          totalAssets: 450,
          reliability: 99.9,
        },
        {
          id: 'scraper-2',
          name: 'Uniswap Scraper',
          type: 'dex',
          status: 'active',
          lastUpdate: new Date(Date.now() - 45000).toISOString(),
          totalAssets: 320,
          reliability: 99.8,
        },
        {
          id: 'scraper-3',
          name: 'Curve Scraper',
          type: 'defi',
          status: 'active',
          lastUpdate: new Date(Date.now() - 60000).toISOString(),
          totalAssets: 85,
          reliability: 99.7,
        },
      ];

      const mockStats: DIAStats = {
        totalAssets: 2000,
        activeAssets: 1995,
        staleAssets: 5,
        totalScrapers: 45,
        avgConfidence: 97.5,
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
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle className="mr-1 h-3 w-3" />
            Active
          </Badge>
        );
      case 'stale':
        return (
          <Badge className="bg-yellow-100 text-yellow-700">
            <Clock className="mr-1 h-3 w-3" />
            Stale
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-100 text-red-700">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Error
          </Badge>
        );
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  }

  function getSourceTypeBadge(type: string) {
    switch (type) {
      case 'cex':
        return <Badge variant="outline">CEX</Badge>;
      case 'dex':
        return <Badge variant="outline">DEX</Badge>;
      case 'defi':
        return <Badge variant="outline">DeFi</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  }

  function formatTimeAgo(timestamp: string): string {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  const filteredAssets =
    selectedChain === 'all' ? assets : assets.filter((asset) => asset.status === 'active');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/oracle')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-4xl">📊</span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">DIA</h1>
                <p className="text-sm text-gray-500">Transparent and Verifiable Data Feeds</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchDIAData} disabled={loading} className="gap-2">
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Link href="https://diadata.org" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Official Site
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              icon={<Eye className="h-5 w-5" />}
              color="purple"
            />
            <StatCard
              title="Network Uptime"
              value={`${stats.networkUptime}%`}
              icon={<Shield className="h-5 w-5" />}
              color="orange"
            />
          </div>
        )}

        {/* Chain Selector */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedChain === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedChain('all')}
          >
            All Chains
          </Button>
          {SUPPORTED_CHAINS.map((chain) => (
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
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="assets" className="gap-2">
              <Database className="h-4 w-4" />
              Assets
            </TabsTrigger>
            <TabsTrigger value="scrapers" className="gap-2">
              <Layers className="h-4 w-4" />
              Data Sources
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Price Feeds</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-gray-500">
                        <th className="pb-3 font-medium">Symbol</th>
                        <th className="pb-3 font-medium">Price</th>
                        <th className="pb-3 font-medium">Source</th>
                        <th className="pb-3 font-medium">Method</th>
                        <th className="pb-3 font-medium">Confidence</th>
                        <th className="pb-3 font-medium">Last Update</th>
                        <th className="pb-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssets.map((asset) => (
                        <tr key={asset.id} className="border-b last:border-0">
                          <td className="py-4 font-medium">{asset.symbol}</td>
                          <td className="py-4 font-mono">
                            $
                            {asset.price.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 8,
                            })}
                          </td>
                          <td className="py-4">{asset.source}</td>
                          <td className="py-4">
                            <Badge variant="outline">{asset.method}</Badge>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-2">
                              <Progress value={asset.confidence * 100} className="h-2 w-20" />
                              <span className="text-sm">
                                {(asset.confidence * 100).toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="py-4 text-sm text-gray-500">
                            {formatTimeAgo(asset.timestamp)}
                          </td>
                          <td className="py-4">{getStatusBadge(asset.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scrapers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Data Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {scrapers.map((scraper) => (
                    <Card key={scraper.id} className="border-0 bg-gray-50">
                      <CardContent className="p-4">
                        <div className="mb-3 flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{scraper.name}</h4>
                            <div className="mt-1 flex gap-2">
                              <Badge
                                variant={scraper.status === 'active' ? 'default' : 'secondary'}
                              >
                                {scraper.status}
                              </Badge>
                              {getSourceTypeBadge(scraper.type)}
                            </div>
                          </div>
                          <Layers className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Reliability</span>
                            <span className="font-medium">{scraper.reliability}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Total Assets</span>
                            <span className="font-medium">{scraper.totalAssets}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Last Update</span>
                            <span className="font-medium">{formatTimeAgo(scraper.lastUpdate)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Network Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span>Asset Coverage</span>
                      <span>
                        {(((stats?.activeAssets || 0) / (stats?.totalAssets || 1)) * 100).toFixed(
                          1,
                        )}
                        %
                      </span>
                    </div>
                    <Progress
                      value={((stats?.activeAssets || 0) / (stats?.totalAssets || 1)) * 100}
                    />
                  </div>
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span>Scraper Availability</span>
                      <span>98%</span>
                    </div>
                    <Progress value={98} />
                  </div>
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span>Data Transparency</span>
                      <span>100%</span>
                    </div>
                    <Progress value={100} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>About DIA</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-600">
                  <p>
                    DIA (Decentralised Information Asset) is an open-source, transparent, and
                    verifiable oracle network that provides accurate and reliable financial data for
                    the Web3 ecosystem.
                  </p>
                  <ul className="list-inside list-disc space-y-1">
                    <li>Fully transparent data sourcing</li>
                    <li>Community-verifiable feeds</li>
                    <li>Custom data delivery</li>
                    <li>2000+ assets across multiple chains</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'orange';
  subtitle?: string;
}

function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="flex items-center gap-4 p-6">
        <div className={cn('rounded-lg p-3', colorClasses[color])}>{icon}</div>
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
