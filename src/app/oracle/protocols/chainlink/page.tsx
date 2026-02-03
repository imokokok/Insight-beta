'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  Activity,
  Shield,
  Globe,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  BarChart3,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ChainlinkFeed {
  id: string;
  name: string;
  symbol: string;
  price: number;
  decimals: number;
  updatedAt: string;
  roundId: string;
  answeredInRound: string;
  chain: string;
  contractAddress: string;
  heartbeat: number;
  deviationThreshold: number;
  status: 'active' | 'stale' | 'error';
}

interface ChainlinkNode {
  id: string;
  name: string;
  address: string;
  status: 'active' | 'inactive';
  lastSubmission: string;
  totalSubmissions: number;
  successRate: number;
}

interface ChainlinkStats {
  totalFeeds: number;
  activeFeeds: number;
  staleFeeds: number;
  totalNodes: number;
  avgUpdateLatency: number;
  networkUptime: number;
}

const SUPPORTED_CHAINS = [
  { id: 'ethereum', name: 'Ethereum', icon: '⬡' },
  { id: 'polygon', name: 'Polygon', icon: '💜' },
  { id: 'arbitrum', name: 'Arbitrum', icon: '🔷' },
  { id: 'optimism', name: 'Optimism', icon: '🔴' },
  { id: 'base', name: 'Base', icon: '🔵' },
  { id: 'avalanche', name: 'Avalanche', icon: '❄️' },
  { id: 'bsc', name: 'BSC', icon: '🟡' },
];

export default function ChainlinkMonitorPage() {
  const router = useRouter();
  const [feeds, setFeeds] = useState<ChainlinkFeed[]>([]);
  const [nodes, setNodes] = useState<ChainlinkNode[]>([]);
  const [stats, setStats] = useState<ChainlinkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChain, setSelectedChain] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('feeds');

  useEffect(() => {
    fetchChainlinkData();
    const interval = setInterval(fetchChainlinkData, 30000);
    return () => clearInterval(interval);
  }, [selectedChain]);

  async function fetchChainlinkData() {
    try {
      setLoading(true);
      // 模拟 API 调用 - 实际项目中替换为真实 API
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 生成模拟数据
      const mockFeeds: ChainlinkFeed[] = [
        {
          id: 'eth-usd',
          name: 'ETH / USD',
          symbol: 'ETH/USD',
          price: 3254.78,
          decimals: 8,
          updatedAt: new Date(Date.now() - 120000).toISOString(),
          roundId: '123456789',
          answeredInRound: '123456789',
          chain: 'ethereum',
          contractAddress: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
          heartbeat: 3600,
          deviationThreshold: 0.5,
          status: 'active',
        },
        {
          id: 'btc-usd',
          name: 'BTC / USD',
          symbol: 'BTC/USD',
          price: 67432.15,
          decimals: 8,
          updatedAt: new Date(Date.now() - 180000).toISOString(),
          roundId: '987654321',
          answeredInRound: '987654321',
          chain: 'ethereum',
          contractAddress: '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
          heartbeat: 3600,
          deviationThreshold: 0.5,
          status: 'active',
        },
        {
          id: 'link-usd',
          name: 'LINK / USD',
          symbol: 'LINK/USD',
          price: 18.45,
          decimals: 8,
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
          roundId: '456789123',
          answeredInRound: '456789123',
          chain: 'ethereum',
          contractAddress: '0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c',
          heartbeat: 3600,
          deviationThreshold: 1.0,
          status: 'stale',
        },
      ];

      const mockNodes: ChainlinkNode[] = [
        {
          id: 'node-1',
          name: 'Chainlink Labs 1',
          address: '0x1234...5678',
          status: 'active',
          lastSubmission: new Date(Date.now() - 60000).toISOString(),
          totalSubmissions: 15420,
          successRate: 99.8,
        },
        {
          id: 'node-2',
          name: 'Chainlink Labs 2',
          address: '0xabcd...efgh',
          status: 'active',
          lastSubmission: new Date(Date.now() - 90000).toISOString(),
          totalSubmissions: 12350,
          successRate: 99.5,
        },
        {
          id: 'node-3',
          name: 'Independent Node A',
          address: '0x9876...5432',
          status: 'inactive',
          lastSubmission: new Date(Date.now() - 86400000).toISOString(),
          totalSubmissions: 8750,
          successRate: 97.2,
        },
      ];

      const mockStats: ChainlinkStats = {
        totalFeeds: 150,
        activeFeeds: 147,
        staleFeeds: 3,
        totalNodes: 25,
        avgUpdateLatency: 45000,
        networkUptime: 99.9,
      };

      setFeeds(mockFeeds);
      setNodes(mockNodes);
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to fetch Chainlink data:', error);
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
    selectedChain === 'all' ? feeds : feeds.filter((feed) => feed.chain === selectedChain);

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
              <span className="text-4xl">🔗</span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Chainlink Monitor</h1>
                <p className="text-sm text-gray-500">Decentralized Oracle Network Monitoring</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={fetchChainlinkData}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Link href="https://chain.link" target="_blank" rel="noopener noreferrer">
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
              title="Network Uptime"
              value={`${stats.networkUptime}%`}
              icon={<Shield className="h-5 w-5" />}
              color="purple"
            />
            <StatCard
              title="Avg Latency"
              value={`${(stats.avgUpdateLatency / 1000).toFixed(1)}s`}
              icon={<Clock className="h-5 w-5" />}
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
            <TabsTrigger value="nodes" className="gap-2">
              <Globe className="h-4 w-4" />
              Node Operators
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
                        <th className="pb-3 font-medium">Pair</th>
                        <th className="pb-3 font-medium">Price</th>
                        <th className="pb-3 font-medium">Chain</th>
                        <th className="pb-3 font-medium">Last Update</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Contract</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFeeds.map((feed) => (
                        <tr key={feed.id} className="border-b last:border-0">
                          <td className="py-4 font-medium">{feed.name}</td>
                          <td className="py-4 font-mono">
                            $
                            {feed.price.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: feed.decimals,
                            })}
                          </td>
                          <td className="py-4 capitalize">{feed.chain}</td>
                          <td className="py-4 text-sm text-gray-500">
                            {formatTimeAgo(feed.updatedAt)}
                          </td>
                          <td className="py-4">{getStatusBadge(feed.status)}</td>
                          <td className="py-4">
                            <a
                              href={`https://etherscan.io/address/${feed.contractAddress}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-sm text-blue-600 hover:underline"
                            >
                              {feed.contractAddress.slice(0, 6)}...
                              {feed.contractAddress.slice(-4)}
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="nodes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Node Operators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {nodes.map((node) => (
                    <Card key={node.id} className="border-0 bg-gray-50">
                      <CardContent className="p-4">
                        <div className="mb-3 flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{node.name}</h4>
                            <p className="font-mono text-sm text-gray-500">{node.address}</p>
                          </div>
                          <Badge variant={node.status === 'active' ? 'default' : 'secondary'}>
                            {node.status}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Success Rate</span>
                            <span className="font-medium">{node.successRate}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Total Submissions</span>
                            <span className="font-medium">
                              {node.totalSubmissions.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Last Submission</span>
                            <span className="font-medium">
                              {formatTimeAgo(node.lastSubmission)}
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
                      <span>Node Participation</span>
                      <span>92%</span>
                    </div>
                    <Progress value={92} />
                  </div>
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span>Update Frequency</span>
                      <span>98.5%</span>
                    </div>
                    <Progress value={98.5} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>About Chainlink</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-600">
                  <p>
                    Chainlink is the industry-standard decentralized oracle network, providing
                    secure and reliable data feeds for smart contracts across multiple blockchain
                    networks.
                  </p>
                  <ul className="list-inside list-disc space-y-1">
                    <li>Decentralized network of independent node operators</li>
                    <li>Multiple layers of data aggregation and validation</li>
                    <li>Support for 1000+ price feeds across 15+ chains</li>
                    <li>Proven security with billions in secured value</li>
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
