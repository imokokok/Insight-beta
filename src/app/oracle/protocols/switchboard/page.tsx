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
  Users,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface SwitchboardAggregator {
  id: string;
  name: string;
  symbol: string;
  price: number;
  varianceThreshold: number;
  forceUpdateInterval: number;
  lastUpdate: string;
  status: 'active' | 'stale' | 'error';
  jobCount: number;
}

interface SwitchboardOracle {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  lastHeartbeat: string;
  totalUpdates: number;
  stakeAmount: string;
  queue: string;
}

interface SwitchboardStats {
  totalAggregators: number;
  activeAggregators: number;
  staleAggregators: number;
  totalOracles: number;
  avgVariance: number;
  networkUptime: number;
}

const SUPPORTED_CHAINS = [
  { id: 'solana', name: 'Solana', icon: '◎' },
  { id: 'ethereum', name: 'Ethereum', icon: '⬡' },
  { id: 'arbitrum', name: 'Arbitrum', icon: '🔷' },
  { id: 'optimism', name: 'Optimism', icon: '🔴' },
  { id: 'base', name: 'Base', icon: '🔵' },
  { id: 'aptos', name: 'Aptos', icon: '🅰️' },
];

export default function SwitchboardMonitorPage() {
  const router = useRouter();
  const [aggregators, setAggregators] = useState<SwitchboardAggregator[]>([]);
  const [oracles, setOracles] = useState<SwitchboardOracle[]>([]);
  const [stats, setStats] = useState<SwitchboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChain, setSelectedChain] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('aggregators');

  useEffect(() => {
    fetchSwitchboardData();
    const interval = setInterval(fetchSwitchboardData, 30000);
    return () => clearInterval(interval);
  }, [selectedChain]);

  async function fetchSwitchboardData() {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockAggregators: SwitchboardAggregator[] = [
        {
          id: 'sb-1',
          name: 'SOL/USD',
          symbol: 'SOL/USD',
          price: 98.45,
          varianceThreshold: 0.5,
          forceUpdateInterval: 300,
          lastUpdate: new Date(Date.now() - 30000).toISOString(),
          status: 'active',
          jobCount: 12,
        },
        {
          id: 'sb-2',
          name: 'ETH/USD',
          symbol: 'ETH/USD',
          price: 3254.78,
          varianceThreshold: 0.5,
          forceUpdateInterval: 300,
          lastUpdate: new Date(Date.now() - 45000).toISOString(),
          status: 'active',
          jobCount: 15,
        },
        {
          id: 'sb-3',
          name: 'BTC/USD',
          symbol: 'BTC/USD',
          price: 67432.15,
          varianceThreshold: 0.5,
          forceUpdateInterval: 300,
          lastUpdate: new Date(Date.now() - 120000).toISOString(),
          status: 'stale',
          jobCount: 10,
        },
        {
          id: 'sb-4',
          name: 'APT/USD',
          symbol: 'APT/USD',
          price: 7.85,
          varianceThreshold: 1.0,
          forceUpdateInterval: 600,
          lastUpdate: new Date(Date.now() - 60000).toISOString(),
          status: 'active',
          jobCount: 8,
        },
      ];

      const mockOracles: SwitchboardOracle[] = [
        {
          id: 'oracle-1',
          name: 'Switchboard Foundation',
          status: 'active',
          lastHeartbeat: new Date(Date.now() - 30000).toISOString(),
          totalUpdates: 2500000,
          stakeAmount: '100,000 SB',
          queue: 'Permissionless Queue',
        },
        {
          id: 'oracle-2',
          name: 'Jupiter Oracle',
          status: 'active',
          lastHeartbeat: new Date(Date.now() - 45000).toISOString(),
          totalUpdates: 1800000,
          stakeAmount: '75,000 SB',
          queue: 'Permissionless Queue',
        },
        {
          id: 'oracle-3',
          name: 'SolanaFM Oracle',
          status: 'active',
          lastHeartbeat: new Date(Date.now() - 60000).toISOString(),
          totalUpdates: 1200000,
          stakeAmount: '50,000 SB',
          queue: 'Permissionless Queue',
        },
      ];

      const mockStats: SwitchboardStats = {
        totalAggregators: 180,
        activeAggregators: 178,
        staleAggregators: 2,
        totalOracles: 45,
        avgVariance: 0.45,
        networkUptime: 99.9,
      };

      setAggregators(mockAggregators);
      setOracles(mockOracles);
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to fetch Switchboard data:', error);
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

  const filteredAggregators =
    selectedChain === 'all' ? aggregators : aggregators.filter((agg) => agg.status === 'active');

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
              <span className="text-4xl">🎛️</span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Switchboard</h1>
                <p className="text-sm text-gray-500">Solana & EVM Compatible Oracle Network</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={fetchSwitchboardData}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Link href="https://switchboard.xyz" target="_blank" rel="noopener noreferrer">
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
              icon={<Settings className="h-5 w-5" />}
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
            <TabsTrigger value="aggregators" className="gap-2">
              <Layers className="h-4 w-4" />
              Aggregators
            </TabsTrigger>
            <TabsTrigger value="oracles" className="gap-2">
              <Users className="h-4 w-4" />
              Oracles
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="aggregators" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Data Aggregators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-gray-500">
                        <th className="pb-3 font-medium">Name</th>
                        <th className="pb-3 font-medium">Price</th>
                        <th className="pb-3 font-medium">Variance Threshold</th>
                        <th className="pb-3 font-medium">Jobs</th>
                        <th className="pb-3 font-medium">Last Update</th>
                        <th className="pb-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAggregators.map((aggregator) => (
                        <tr key={aggregator.id} className="border-b last:border-0">
                          <td className="py-4 font-medium">{aggregator.name}</td>
                          <td className="py-4 font-mono">
                            $
                            {aggregator.price.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 8,
                            })}
                          </td>
                          <td className="py-4">{aggregator.varianceThreshold}%</td>
                          <td className="py-4">{aggregator.jobCount}</td>
                          <td className="py-4 text-sm text-gray-500">
                            {formatTimeAgo(aggregator.lastUpdate)}
                          </td>
                          <td className="py-4">{getStatusBadge(aggregator.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="oracles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Oracle Operators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {oracles.map((oracle) => (
                    <Card key={oracle.id} className="border-0 bg-gray-50">
                      <CardContent className="p-4">
                        <div className="mb-3 flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{oracle.name}</h4>
                            <Badge variant={oracle.status === 'active' ? 'default' : 'secondary'}>
                              {oracle.status}
                            </Badge>
                          </div>
                          <Users className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Queue</span>
                            <span className="font-medium">{oracle.queue}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Stake</span>
                            <span className="font-medium">{oracle.stakeAmount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Total Updates</span>
                            <span className="font-medium">
                              {oracle.totalUpdates.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Last Heartbeat</span>
                            <span className="font-medium">
                              {formatTimeAgo(oracle.lastHeartbeat)}
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
                      value={
                        ((stats?.activeAggregators || 0) / (stats?.totalAggregators || 1)) * 100
                      }
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
                      <span>99.5%</span>
                    </div>
                    <Progress value={99.5} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>About Switchboard</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-600">
                  <p>
                    Switchboard is a decentralized oracle network built on Solana that provides
                    reliable and customizable data feeds for both Solana and EVM-compatible
                    blockchains.
                  </p>
                  <ul className="list-inside list-disc space-y-1">
                    <li>Permissionless oracle network</li>
                    <li>Custom data feed creation</li>
                    <li>Cross-chain compatibility</li>
                    <li>Staking-based security model</li>
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
