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

interface API3DataFeed {
  id: string;
  symbol: string;
  price: number;
  deviation: number;
  heartbeat: number;
  lastUpdate: string;
  status: 'active' | 'stale' | 'error';
  dAPI: string;
}

interface API3Airnode {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  lastHeartbeat: string;
  totalRequests: number;
  successRate: number;
  region: string;
}

interface API3Stats {
  totalFeeds: number;
  activeFeeds: number;
  staleFeeds: number;
  totalAirnodes: number;
  avgDeviation: number;
  networkUptime: number;
}

const SUPPORTED_CHAINS = [
  { id: 'ethereum', name: 'Ethereum', icon: '⬡' },
  { id: 'arbitrum', name: 'Arbitrum', icon: '🔷' },
  { id: 'optimism', name: 'Optimism', icon: '🔴' },
  { id: 'base', name: 'Base', icon: '🔵' },
  { id: 'polygon', name: 'Polygon', icon: '💜' },
  { id: 'avalanche', name: 'Avalanche', icon: '❄️' },
  { id: 'bsc', name: 'BSC', icon: '🟡' },
];

export default function API3MonitorPage() {
  const router = useRouter();
  const [feeds, setFeeds] = useState<API3DataFeed[]>([]);
  const [airnodes, setAirnodes] = useState<API3Airnode[]>([]);
  const [stats, setStats] = useState<API3Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChain, setSelectedChain] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('feeds');

  useEffect(() => {
    fetchAPI3Data();
    const interval = setInterval(fetchAPI3Data, 30000);
    return () => clearInterval(interval);
  }, [selectedChain]);

  async function fetchAPI3Data() {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockFeeds: API3DataFeed[] = [
        {
          id: 'api3-1',
          symbol: 'BTC/USD',
          price: 67432.15,
          deviation: 0.5,
          heartbeat: 86400,
          lastUpdate: new Date(Date.now() - 30000).toISOString(),
          status: 'active',
          dAPI: '0x1234...5678',
        },
        {
          id: 'api3-2',
          symbol: 'ETH/USD',
          price: 3254.78,
          deviation: 0.5,
          heartbeat: 86400,
          lastUpdate: new Date(Date.now() - 45000).toISOString(),
          status: 'active',
          dAPI: '0x8765...4321',
        },
        {
          id: 'api3-3',
          symbol: 'AVAX/USD',
          price: 35.45,
          deviation: 1.0,
          heartbeat: 86400,
          lastUpdate: new Date(Date.now() - 120000).toISOString(),
          status: 'stale',
          dAPI: '0xabcd...efgh',
        },
        {
          id: 'api3-4',
          symbol: 'MATIC/USD',
          price: 0.85,
          deviation: 1.0,
          heartbeat: 86400,
          lastUpdate: new Date(Date.now() - 60000).toISOString(),
          status: 'active',
          dAPI: '0xijkl...mnop',
        },
      ];

      const mockAirnodes: API3Airnode[] = [
        {
          id: 'node-1',
          name: 'API3 Foundation',
          status: 'active',
          lastHeartbeat: new Date(Date.now() - 30000).toISOString(),
          totalRequests: 2500000,
          successRate: 99.9,
          region: 'US-East',
        },
        {
          id: 'node-2',
          name: 'Blockdaemon',
          status: 'active',
          lastHeartbeat: new Date(Date.now() - 45000).toISOString(),
          totalRequests: 1800000,
          successRate: 99.8,
          region: 'EU-West',
        },
        {
          id: 'node-3',
          name: 'Chainlayer',
          status: 'active',
          lastHeartbeat: new Date(Date.now() - 60000).toISOString(),
          totalRequests: 1200000,
          successRate: 99.7,
          region: 'APAC',
        },
      ];

      const mockStats: API3Stats = {
        totalFeeds: 150,
        activeFeeds: 148,
        staleFeeds: 2,
        totalAirnodes: 25,
        avgDeviation: 0.75,
        networkUptime: 99.98,
      };

      setFeeds(mockFeeds);
      setAirnodes(mockAirnodes);
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to fetch API3 data:', error);
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
              <span className="text-4xl">🌊</span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">API3</h1>
                <p className="text-sm text-gray-500">First-Party Oracle Solution</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchAPI3Data} disabled={loading} className="gap-2">
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Link href="https://api3.org" target="_blank" rel="noopener noreferrer">
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
              Data Feeds
            </TabsTrigger>
            <TabsTrigger value="airnodes" className="gap-2">
              <Building2 className="h-4 w-4" />
              Airnodes
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feeds" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Data Feeds (dAPIs)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-gray-500">
                        <th className="pb-3 font-medium">Symbol</th>
                        <th className="pb-3 font-medium">Price</th>
                        <th className="pb-3 font-medium">Deviation</th>
                        <th className="pb-3 font-medium">Heartbeat</th>
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
                          <td className="py-4">{feed.deviation}%</td>
                          <td className="py-4">{feed.heartbeat / 3600}h</td>
                          <td className="py-4 text-sm text-gray-500">
                            {formatTimeAgo(feed.lastUpdate)}
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

          <TabsContent value="airnodes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Airnodes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {airnodes.map((airnode) => (
                    <Card key={airnode.id} className="border-0 bg-gray-50">
                      <CardContent className="p-4">
                        <div className="mb-3 flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{airnode.name}</h4>
                            <Badge variant={airnode.status === 'active' ? 'default' : 'secondary'}>
                              {airnode.status}
                            </Badge>
                          </div>
                          <Building2 className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Region</span>
                            <span className="font-medium">{airnode.region}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Success Rate</span>
                            <span className="font-medium">{airnode.successRate}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Total Requests</span>
                            <span className="font-medium">
                              {airnode.totalRequests.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Last Heartbeat</span>
                            <span className="font-medium">
                              {formatTimeAgo(airnode.lastHeartbeat)}
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
                      <span>Airnode Participation</span>
                      <span>98%</span>
                    </div>
                    <Progress value={98} />
                  </div>
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span>First-Party Data Quality</span>
                      <span>99.9%</span>
                    </div>
                    <Progress value={99.9} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>About API3</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-600">
                  <p>
                    API3 is a first-party oracle solution that enables API providers to operate
                    their own oracle nodes (Airnodes), delivering data directly to smart contracts
                    without third-party intermediaries.
                  </p>
                  <ul className="list-inside list-disc space-y-1">
                    <li>First-party oracle architecture</li>
                    <li>DAO-governed dAPIs</li>
                    <li>Quantifiable security via staking</li>
                    <li>OEV (Oracle Extractable Value) capture</li>
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
