'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  Activity,
  Shield,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  BarChart3,
  Layers,
  Zap,
  Building2,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  PriceHistoryChart,
  generateMockPriceHistory,
  ProtocolComparison,
  PriceAlertSettings,
} from '@/components/features/protocol';
import { ORACLE_PROTOCOLS } from '@/lib/types';

interface PythPriceFeed {
  id: string;
  symbol: string;
  price: number;
  confidence: number;
  expo: number;
  publishTime: string;
  status: 'active' | 'stale' | 'error';
  sources: number;
}

interface PythPublisher {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  lastPublish: string;
  totalPublishes: number;
  accuracy: number;
}

interface PythStats {
  totalFeeds: number;
  activeFeeds: number;
  staleFeeds: number;
  totalPublishers: number;
  avgConfidence: number;
  networkUptime: number;
}

const SUPPORTED_CHAINS = [
  { id: 'ethereum', name: 'Ethereum', icon: '⬡' },
  { id: 'solana', name: 'Solana', icon: '◎' },
  { id: 'arbitrum', name: 'Arbitrum', icon: '🔷' },
  { id: 'optimism', name: 'Optimism', icon: '🔴' },
  { id: 'base', name: 'Base', icon: '🔵' },
  { id: 'avalanche', name: 'Avalanche', icon: '❄️' },
  { id: 'polygon', name: 'Polygon', icon: '💜' },
];

export default function PythMonitorPage() {
  const router = useRouter();
  const [feeds, setFeeds] = useState<PythPriceFeed[]>([]);
  const [publishers, setPublishers] = useState<PythPublisher[]>([]);
  const [stats, setStats] = useState<PythStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChain, setSelectedChain] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('feeds');

  useEffect(() => {
    fetchPythData();
    const interval = setInterval(fetchPythData, 30000);
    return () => clearInterval(interval);
  }, [selectedChain]);

  async function fetchPythData() {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockFeeds: PythPriceFeed[] = [
        {
          id: '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
          symbol: 'BTC/USD',
          price: 67432.15,
          confidence: 0.05,
          expo: -8,
          publishTime: new Date(Date.now() - 30000).toISOString(),
          status: 'active',
          sources: 12,
        },
        {
          id: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
          symbol: 'ETH/USD',
          price: 3254.78,
          confidence: 0.02,
          expo: -8,
          publishTime: new Date(Date.now() - 45000).toISOString(),
          status: 'active',
          sources: 15,
        },
        {
          id: '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cf2b1c9c12345',
          symbol: 'SOL/USD',
          price: 98.45,
          confidence: 0.03,
          expo: -8,
          publishTime: new Date(Date.now() - 120000).toISOString(),
          status: 'stale',
          sources: 8,
        },
        {
          id: '0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31e7f6b1234',
          symbol: 'LINK/USD',
          price: 18.45,
          confidence: 0.01,
          expo: -8,
          publishTime: new Date(Date.now() - 60000).toISOString(),
          status: 'active',
          sources: 10,
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
        totalPublishers: 45,
        avgConfidence: 99.7,
        networkUptime: 99.99,
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

  function formatTimeAgo(timestamp: string): string {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  const filteredFeeds =
    selectedChain === 'all' ? feeds : feeds.filter((feed) => feed.status === 'active');

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
                <h1 className="text-2xl font-bold text-gray-900">Pyth Network</h1>
                <p className="text-sm text-gray-500">Low-Latency Financial Data Oracle</p>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <TabsTrigger value="feeds" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Price Feeds
            </TabsTrigger>
            <TabsTrigger value="publishers" className="gap-2">
              <Building2 className="h-4 w-4" />
              Publishers
            </TabsTrigger>
            <TabsTrigger value="charts" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Charts
            </TabsTrigger>
            <TabsTrigger value="comparison" className="gap-2">
              <Activity className="h-4 w-4" />
              Compare
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <Bell className="h-4 w-4" />
              Alerts
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
                        <th className="pb-3 font-medium">Symbol</th>
                        <th className="pb-3 font-medium">Price</th>
                        <th className="pb-3 font-medium">Confidence</th>
                        <th className="pb-3 font-medium">Sources</th>
                        <th className="pb-3 font-medium">Last Update</th>
                        <th className="pb-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFeeds.map((feed) => (
                        <tr key={feed.id} className="border-b last:border-0">
                          <td className="py-4 font-medium">{feed.symbol}</td>
                          <td className="py-4 font-mono">
                            $
                            {feed.price.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 8,
                            })}
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-2">
                              <Progress value={feed.confidence * 100} className="h-2 w-20" />
                              <span className="text-sm">{(feed.confidence * 100).toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className="py-4">{feed.sources}</td>
                          <td className="py-4 text-sm text-gray-500">
                            {formatTimeAgo(feed.publishTime)}
                          </td>
                          <td className="py-4">{getStatusBadge(feed.status)}</td>
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
                            >
                              {publisher.status}
                            </Badge>
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

          <TabsContent value="charts" className="space-y-4">
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
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4">
            <ProtocolComparison protocols={ORACLE_PROTOCOLS} symbol="ETH/USD" />
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <PriceAlertSettings symbol="ETH/USD" currentPrice={3254.78} />
              <PriceAlertSettings symbol="BTC/USD" currentPrice={67432.15} />
            </div>
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
                      <span>Feed Coverage</span>
                      <span>
                        {(((stats?.activeFeeds || 0) / (stats?.totalFeeds || 1)) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={((stats?.activeFeeds || 0) / (stats?.totalFeeds || 1)) * 100}
                    />
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>About Pyth Network</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-600">
                  <p>
                    Pyth Network is a next-generation oracle solution that delivers high-fidelity,
                    high-frequency financial data to decentralized applications across multiple
                    blockchains.
                  </p>
                  <ul className="list-inside list-disc space-y-1">
                    <li>First-party data from institutional sources</li>
                    <li>Sub-second price updates</li>
                    <li>Confidence intervals for every price</li>
                    <li>400+ price feeds across 50+ blockchains</li>
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
