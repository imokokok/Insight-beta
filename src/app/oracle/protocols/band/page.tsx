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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface BandPriceFeed {
  id: string;
  symbol: string;
  price: number;
  confidence: number;
  requestID: string;
  resolveTime: string;
  status: 'active' | 'stale' | 'error';
  dataSourceCount: number;
}

interface BandValidator {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  lastUpdate: string;
  totalRequests: number;
  accuracy: number;
  votingPower: number;
}

interface BandStats {
  totalFeeds: number;
  activeFeeds: number;
  staleFeeds: number;
  totalValidators: number;
  avgConfidence: number;
  networkUptime: number;
}

const SUPPORTED_CHAINS = [
  { id: 'ethereum', name: 'Ethereum', icon: '⬡' },
  { id: 'cosmos', name: 'Cosmos', icon: '⚛️' },
  { id: 'osmosis', name: 'Osmosis', icon: '🧪' },
  { id: ' injective', name: 'Injective', icon: '💉' },
  { id: 'secret', name: 'Secret Network', icon: '🤫' },
];

export default function BandMonitorPage() {
  const router = useRouter();
  const [feeds, setFeeds] = useState<BandPriceFeed[]>([]);
  const [validators, setValidators] = useState<BandValidator[]>([]);
  const [stats, setStats] = useState<BandStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChain, setSelectedChain] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('feeds');

  useEffect(() => {
    fetchBandData();
    const interval = setInterval(fetchBandData, 30000);
    return () => clearInterval(interval);
  }, [selectedChain]);

  async function fetchBandData() {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockFeeds: BandPriceFeed[] = [
        {
          id: 'band-1',
          symbol: 'BTC/USD',
          price: 67432.15,
          confidence: 0.98,
          requestID: '12345',
          resolveTime: new Date(Date.now() - 30000).toISOString(),
          status: 'active',
          dataSourceCount: 7,
        },
        {
          id: 'band-2',
          symbol: 'ETH/USD',
          price: 3254.78,
          confidence: 0.97,
          requestID: '12346',
          resolveTime: new Date(Date.now() - 45000).toISOString(),
          status: 'active',
          dataSourceCount: 7,
        },
        {
          id: 'band-3',
          symbol: 'ATOM/USD',
          price: 8.45,
          confidence: 0.96,
          requestID: '12347',
          resolveTime: new Date(Date.now() - 120000).toISOString(),
          status: 'stale',
          dataSourceCount: 5,
        },
        {
          id: 'band-4',
          symbol: 'OSMO/USD',
          price: 0.85,
          confidence: 0.95,
          requestID: '12348',
          resolveTime: new Date(Date.now() - 60000).toISOString(),
          status: 'active',
          dataSourceCount: 4,
        },
      ];

      const mockValidators: BandValidator[] = [
        {
          id: 'val-1',
          name: 'Band Foundation',
          status: 'active',
          lastUpdate: new Date(Date.now() - 30000).toISOString(),
          totalRequests: 2500000,
          accuracy: 99.9,
          votingPower: 15.5,
        },
        {
          id: 'val-2',
          name: 'Cosmostation',
          status: 'active',
          lastUpdate: new Date(Date.now() - 45000).toISOString(),
          totalRequests: 1800000,
          accuracy: 99.8,
          votingPower: 12.3,
        },
        {
          id: 'val-3',
          name: 'Forbole',
          status: 'active',
          lastUpdate: new Date(Date.now() - 60000).toISOString(),
          totalRequests: 1200000,
          accuracy: 99.7,
          votingPower: 8.7,
        },
      ];

      const mockStats: BandStats = {
        totalFeeds: 230,
        activeFeeds: 228,
        staleFeeds: 2,
        totalValidators: 72,
        avgConfidence: 97.5,
        networkUptime: 99.95,
      };

      setFeeds(mockFeeds);
      setValidators(mockValidators);
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to fetch Band data:', error);
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
              <span className="text-4xl">🎸</span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Band Protocol</h1>
                <p className="text-sm text-gray-500">Cross-Chain Data Oracle Platform</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchBandData} disabled={loading} className="gap-2">
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Link href="https://bandprotocol.com" target="_blank" rel="noopener noreferrer">
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
            <TabsTrigger value="validators" className="gap-2">
              <Building2 className="h-4 w-4" />
              Validators
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
                        <th className="pb-3 font-medium">Data Sources</th>
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
                          <td className="py-4">{feed.dataSourceCount}</td>
                          <td className="py-4 text-sm text-gray-500">
                            {formatTimeAgo(feed.resolveTime)}
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

          <TabsContent value="validators" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Band Validators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {validators.map((validator) => (
                    <Card key={validator.id} className="border-0 bg-gray-50">
                      <CardContent className="p-4">
                        <div className="mb-3 flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{validator.name}</h4>
                            <Badge
                              variant={validator.status === 'active' ? 'default' : 'secondary'}
                            >
                              {validator.status}
                            </Badge>
                          </div>
                          <Building2 className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Voting Power</span>
                            <span className="font-medium">{validator.votingPower}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Accuracy</span>
                            <span className="font-medium">{validator.accuracy}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Total Requests</span>
                            <span className="font-medium">
                              {validator.totalRequests.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Last Update</span>
                            <span className="font-medium">
                              {formatTimeAgo(validator.lastUpdate)}
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
                      <span>Validator Participation</span>
                      <span>96%</span>
                    </div>
                    <Progress value={96} />
                  </div>
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span>Data Source Reliability</span>
                      <span>98.5%</span>
                    </div>
                    <Progress value={98.5} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>About Band Protocol</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-600">
                  <p>
                    Band Protocol is a cross-chain data oracle platform that aggregates and connects
                    real-world data and APIs to smart contracts across multiple blockchain networks.
                  </p>
                  <ul className="list-inside list-disc space-y-1">
                    <li>Cross-chain data delivery via IBC</li>
                    <li>Decentralized validator network</li>
                    <li>Economic security through staking</li>
                    <li>Support for Cosmos ecosystem and beyond</li>
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
