'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  Activity,
  Zap,
  Globe,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  BarChart3,
  Layers,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface PythPriceFeed {
  id: string;
  symbol: string;
  name: string;
  price: number;
  confidence: number;
  exponent: number;
  publishTime: string;
  status: 'active' | 'stale' | 'unknown';
  assetType: 'crypto' | 'equity' | 'fx' | 'commodity';
  sourceChains: string[];
}

interface PythPublisher {
  id: string;
  name: string;
  stake: number;
  feedsPublished: number;
  lastPublish: string;
  status: 'active' | 'inactive';
}

interface PythStats {
  totalFeeds: number;
  activeFeeds: number;
  totalPublishers: number;
  avgConfidence: number;
  avgLatency: number;
}

const ASSET_TYPES = [
  { id: 'all', name: 'All Assets', icon: '📊' },
  { id: 'crypto', name: 'Crypto', icon: '₿' },
  { id: 'equity', name: 'Equities', icon: '📈' },
  { id: 'fx', name: 'Forex', icon: '💱' },
  { id: 'commodity', name: 'Commodities', icon: '🛢️' },
];

const SUPPORTED_CHAINS = [
  { id: 'ethereum', name: 'Ethereum', icon: '⬡' },
  { id: 'solana', name: 'Solana', icon: '◎' },
  { id: 'arbitrum', name: 'Arbitrum', icon: '🔷' },
  { id: 'optimism', name: 'Optimism', icon: '🔴' },
  { id: 'base', name: 'Base', icon: '🔵' },
  { id: 'avalanche', name: 'Avalanche', icon: '❄️' },
  { id: 'bsc', name: 'BSC', icon: '🟡' },
];

export default function PythMonitorPage() {
  const router = useRouter();
  const [feeds, setFeeds] = useState<PythPriceFeed[]>([]);
  const [publishers, setPublishers] = useState<PythPublisher[]>([]);
  const [stats, setStats] = useState<PythStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAssetType, setSelectedAssetType] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('feeds');

  useEffect(() => {
    fetchPythData();
    const interval = setInterval(fetchPythData, 30000);
    return () => clearInterval(interval);
  }, [selectedAssetType]);

  async function fetchPythData() {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockFeeds: PythPriceFeed[] = [
        {
          id: '0xe62df6c8b4a85fe1f67ebb44ce95e0f5f5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e',
          symbol: 'Crypto.BTC/USD',
          name: 'Bitcoin / USD',
          price: 67432.158473,
          confidence: 0.05,
          exponent: -8,
          publishTime: new Date(Date.now() - 500).toISOString(),
          status: 'active',
          assetType: 'crypto',
          sourceChains: ['ethereum', 'solana', 'arbitrum'],
        },
        {
          id: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
          symbol: 'Crypto.ETH/USD',
          name: 'Ethereum / USD',
          price: 3254.784521,
          confidence: 0.02,
          exponent: -8,
          publishTime: new Date(Date.now() - 800).toISOString(),
          status: 'active',
          assetType: 'crypto',
          sourceChains: ['ethereum', 'solana', 'optimism'],
        },
        {
          id: '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cf2b2e1a5b5c5',
          symbol: 'Equity.AAPL/USD',
          name: 'Apple Inc. / USD',
          price: 178.35,
          confidence: 0.01,
          exponent: -5,
          publishTime: new Date(Date.now() - 5000).toISOString(),
          status: 'active',
          assetType: 'equity',
          sourceChains: ['ethereum'],
        },
        {
          id: '0xa1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
          symbol: 'FX.EUR/USD',
          name: 'Euro / USD',
          price: 1.0845,
          confidence: 0.0001,
          exponent: -5,
          publishTime: new Date(Date.now() - 1200).toISOString(),
          status: 'active',
          assetType: 'fx',
          sourceChains: ['ethereum', 'arbitrum'],
        },
      ];

      const mockPublishers: PythPublisher[] = [
        {
          id: 'pub-1',
          name: 'Jump Crypto',
          stake: 500000,
          feedsPublished: 45,
          lastPublish: new Date(Date.now() - 300).toISOString(),
          status: 'active',
        },
        {
          id: 'pub-2',
          name: 'Jane Street',
          stake: 750000,
          feedsPublished: 52,
          lastPublish: new Date(Date.now() - 600).toISOString(),
          status: 'active',
        },
        {
          id: 'pub-3',
          name: 'Wintermute',
          stake: 300000,
          feedsPublished: 38,
          lastPublish: new Date(Date.now() - 900).toISOString(),
          status: 'active',
        },
      ];

      const mockStats: PythStats = {
        totalFeeds: 400,
        activeFeeds: 398,
        totalPublishers: 85,
        avgConfidence: 99.8,
        avgLatency: 350,
      };

      setFeeds(mockFeeds);
      setPublishers(mockPublishers);
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to fetch Pyth data:', error);
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
      case 'unknown':
        return (
          <Badge className="bg-gray-100 text-gray-700">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Unknown
          </Badge>
        );
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  }

  function formatTimeAgo(timestamp: string): string {
    const ms = Date.now() - new Date(timestamp).getTime();
    if (ms < 1000) return `${ms}ms ago`;
    if (ms < 60000) return `${Math.floor(ms / 1000)}s ago`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
    return `${Math.floor(ms / 3600000)}h ago`;
  }

  function formatPrice(price: number, exponent: number): string {
    const actualPrice = price * Math.pow(10, exponent);
    return actualPrice.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: Math.abs(exponent) + 2,
    });
  }

  const filteredFeeds =
    selectedAssetType === 'all'
      ? feeds
      : feeds.filter((feed) => feed.assetType === selectedAssetType);

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
              <span className="text-4xl">🐍</span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Pyth Network Monitor</h1>
                <p className="text-sm text-gray-500">Low-Latency Financial Data Infrastructure</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchPythData} disabled={loading} className="gap-2">
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Link href="https://pyth.network" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Official Site
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              title="Total Feeds"
              value={stats.totalFeeds}
              icon={<Layers className="h-5 w-5" />}
              color="blue"
            />
            <StatCard
              title="Active Feeds"
              value={stats.activeFeeds}
              icon={<Activity className="h-5 w-5" />}
              color="green"
            />
            <StatCard
              title="Publishers"
              value={stats.totalPublishers}
              icon={<Globe className="h-5 w-5" />}
              color="purple"
            />
            <StatCard
              title="Avg Confidence"
              value={`${stats.avgConfidence}%`}
              icon={<Shield className="h-5 w-5" />}
              color="orange"
            />
            <StatCard
              title="Avg Latency"
              value={`${stats.avgLatency}ms`}
              icon={<Zap className="h-5 w-5" />}
              color="cyan"
            />
          </div>
        )}

        {/* Asset Type Selector */}
        <div className="flex flex-wrap gap-2">
          {ASSET_TYPES.map((type) => (
            <Button
              key={type.id}
              variant={selectedAssetType === type.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedAssetType(type.id)}
              className="gap-1"
            >
              <span>{type.icon}</span>
              {type.name}
            </Button>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="feeds" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Price Feeds
            </TabsTrigger>
            <TabsTrigger value="publishers" className="gap-2">
              <Globe className="h-4 w-4" />
              Publishers
            </TabsTrigger>
            <TabsTrigger value="chains" className="gap-2">
              <Layers className="h-4 w-4" />
              Chains
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feeds" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Price Feeds</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-gray-500">
                        <th className="pb-3 font-medium">Asset</th>
                        <th className="pb-3 font-medium">Price</th>
                        <th className="pb-3 font-medium">Confidence</th>
                        <th className="pb-3 font-medium">Type</th>
                        <th className="pb-3 font-medium">Last Update</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Chains</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFeeds.map((feed) => (
                        <tr key={feed.id} className="border-b last:border-0">
                          <td className="py-4">
                            <div>
                              <p className="font-medium">{feed.name}</p>
                              <p className="font-mono text-xs text-gray-500">{feed.symbol}</p>
                            </div>
                          </td>
                          <td className="py-4 font-mono">
                            ${formatPrice(feed.price, feed.exponent)}
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-2">
                              <Progress value={100 - feed.confidence * 100} className="w-20" />
                              <span className="text-sm text-gray-600">
                                ±{feed.confidence.toFixed(3)}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 capitalize">
                            <Badge variant="outline">{feed.assetType}</Badge>
                          </td>
                          <td className="py-4 text-sm text-gray-500">
                            {formatTimeAgo(feed.publishTime)}
                          </td>
                          <td className="py-4">{getStatusBadge(feed.status)}</td>
                          <td className="py-4">
                            <div className="flex gap-1">
                              {feed.sourceChains.slice(0, 3).map((chain) => (
                                <Badge key={chain} variant="secondary" className="text-xs">
                                  {chain}
                                </Badge>
                              ))}
                              {feed.sourceChains.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{feed.sourceChains.length - 3}
                                </Badge>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="publishers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Data Publishers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {publishers.map((publisher) => (
                    <Card key={publisher.id} className="border-0 bg-gray-50">
                      <CardContent className="p-4">
                        <div className="mb-3 flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{publisher.name}</h4>
                            <Badge
                              variant={publisher.status === 'active' ? 'default' : 'secondary'}
                              className="mt-1"
                            >
                              {publisher.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Stake</span>
                            <span className="font-medium">
                              {publisher.stake.toLocaleString()} PYTH
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Feeds Published</span>
                            <span className="font-medium">{publisher.feedsPublished}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Last Publish</span>
                            <span className="font-medium">
                              {formatTimeAgo(publisher.lastPublish)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chains" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {SUPPORTED_CHAINS.map((chain) => (
                <Card key={chain.id} className="border-0 bg-gray-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{chain.icon}</span>
                      <div>
                        <h4 className="font-semibold">{chain.name}</h4>
                        <p className="text-sm text-gray-500">
                          {Math.floor(Math.random() * 100 + 50)} feeds
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="mb-1 flex justify-between text-sm">
                        <span>Latency</span>
                        <span>{Math.floor(Math.random() * 500 + 200)}ms</span>
                      </div>
                      <Progress value={Math.random() * 30 + 70} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Network Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span>Feed Availability</span>
                      <span>99.5%</span>
                    </div>
                    <Progress value={99.5} />
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
                      <span>Price Freshness</span>
                      <span>98.8%</span>
                    </div>
                    <Progress value={98.8} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>About Pyth Network</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-600">
                  <p>
                    Pyth Network is a next-generation oracle solution that delivers high-fidelity,
                    low-latency financial data from institutional sources directly to smart
                    contracts.
                  </p>
                  <ul className="list-inside list-disc space-y-1">
                    <li>Sub-second price updates from 85+ publishers</li>
                    <li>Confidence intervals for every price feed</li>
                    <li>Support for crypto, equities, FX, and commodities</li>
                    <li>Available across 20+ blockchain networks</li>
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
  color: 'blue' | 'green' | 'purple' | 'orange' | 'cyan';
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    cyan: 'bg-cyan-50 text-cyan-600',
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="flex items-center gap-4 p-6">
        <div className={cn('rounded-lg p-3', colorClasses[color])}>{icon}</div>
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
