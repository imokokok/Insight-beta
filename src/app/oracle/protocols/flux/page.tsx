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
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface FluxDataRequest {
  id: string;
  symbol: string;
  price: number;
  timestamp: string;
  finality: number;
  providers: number;
  status: 'active' | 'stale' | 'error';
  reward: string;
}

interface FluxProvider {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  lastUpdate: string;
  totalRequests: number;
  accuracy: number;
  stake: string;
}

interface FluxStats {
  totalRequests: number;
  activeRequests: number;
  staleRequests: number;
  totalProviders: number;
  avgFinality: number;
  networkUptime: number;
}

const SUPPORTED_CHAINS = [
  { id: 'near', name: 'NEAR', icon: '⛓️' },
  { id: 'ethereum', name: 'Ethereum', icon: '⬡' },
  { id: 'aurora', name: 'Aurora', icon: '🌅' },
];

export default function FluxMonitorPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<FluxDataRequest[]>([]);
  const [providers, setProviders] = useState<FluxProvider[]>([]);
  const [stats, setStats] = useState<FluxStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChain, setSelectedChain] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('requests');

  useEffect(() => {
    fetchFluxData();
    const interval = setInterval(fetchFluxData, 30000);
    return () => clearInterval(interval);
  }, [selectedChain]);

  async function fetchFluxData() {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockRequests: FluxDataRequest[] = [
        {
          id: 'flux-1',
          symbol: 'NEAR/USD',
          price: 3.45,
          timestamp: new Date(Date.now() - 30000).toISOString(),
          finality: 5,
          providers: 12,
          status: 'active',
          reward: '0.5 FLUX',
        },
        {
          id: 'flux-2',
          symbol: 'ETH/USD',
          price: 3254.78,
          timestamp: new Date(Date.now() - 45000).toISOString(),
          finality: 5,
          providers: 15,
          status: 'active',
          reward: '0.5 FLUX',
        },
        {
          id: 'flux-3',
          symbol: 'BTC/USD',
          price: 67432.15,
          timestamp: new Date(Date.now() - 120000).toISOString(),
          finality: 5,
          providers: 10,
          status: 'stale',
          reward: '0.5 FLUX',
        },
        {
          id: 'flux-4',
          symbol: 'AURORA/USD',
          price: 0.25,
          timestamp: new Date(Date.now() - 60000).toISOString(),
          finality: 5,
          providers: 8,
          status: 'active',
          reward: '0.5 FLUX',
        },
      ];

      const mockProviders: FluxProvider[] = [
        {
          id: 'provider-1',
          name: 'Flux Foundation',
          status: 'active',
          lastUpdate: new Date(Date.now() - 30000).toISOString(),
          totalRequests: 2500000,
          accuracy: 99.9,
          stake: '100,000 FLUX',
        },
        {
          id: 'provider-2',
          name: 'Near Foundation',
          status: 'active',
          lastUpdate: new Date(Date.now() - 45000).toISOString(),
          totalRequests: 1800000,
          accuracy: 99.8,
          stake: '75,000 FLUX',
        },
        {
          id: 'provider-3',
          name: 'Meta Pool',
          status: 'active',
          lastUpdate: new Date(Date.now() - 60000).toISOString(),
          totalRequests: 1200000,
          accuracy: 99.7,
          stake: '50,000 FLUX',
        },
      ];

      const mockStats: FluxStats = {
        totalRequests: 150,
        activeRequests: 148,
        staleRequests: 2,
        totalProviders: 25,
        avgFinality: 5,
        networkUptime: 99.9,
      };

      setRequests(mockRequests);
      setProviders(mockProviders);
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to fetch Flux data:', error);
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

  const filteredRequests =
    selectedChain === 'all' ? requests : requests.filter((req) => req.status === 'active');

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
              <span className="text-4xl">⚡</span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Flux</h1>
                <p className="text-sm text-gray-500">Decentralized Oracle Aggregator on NEAR</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchFluxData} disabled={loading} className="gap-2">
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Link href="https://fluxprotocol.org" target="_blank" rel="noopener noreferrer">
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
              title="Total Requests"
              value={stats.totalRequests}
              icon={<Layers className="h-5 w-5" />}
              color="blue"
            />
            <StatCard
              title="Active Requests"
              value={stats.activeRequests}
              icon={<Activity className="h-5 w-5" />}
              color="green"
              subtitle={`${stats.staleRequests} stale`}
            />
            <StatCard
              title="Avg Finality"
              value={`${stats.avgFinality}s`}
              icon={<Target className="h-5 w-5" />}
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
            <TabsTrigger value="requests" className="gap-2">
              <Layers className="h-4 w-4" />
              Data Requests
            </TabsTrigger>
            <TabsTrigger value="providers" className="gap-2">
              <Users className="h-4 w-4" />
              Providers
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Data Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-gray-500">
                        <th className="pb-3 font-medium">Symbol</th>
                        <th className="pb-3 font-medium">Price</th>
                        <th className="pb-3 font-medium">Finality</th>
                        <th className="pb-3 font-medium">Providers</th>
                        <th className="pb-3 font-medium">Reward</th>
                        <th className="pb-3 font-medium">Last Update</th>
                        <th className="pb-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequests.map((request) => (
                        <tr key={request.id} className="border-b last:border-0">
                          <td className="py-4 font-medium">{request.symbol}</td>
                          <td className="py-4 font-mono">
                            $
                            {request.price.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 8,
                            })}
                          </td>
                          <td className="py-4">{request.finality}s</td>
                          <td className="py-4">{request.providers}</td>
                          <td className="py-4">{request.reward}</td>
                          <td className="py-4 text-sm text-gray-500">
                            {formatTimeAgo(request.timestamp)}
                          </td>
                          <td className="py-4">{getStatusBadge(request.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="providers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Data Providers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {providers.map((provider) => (
                    <Card key={provider.id} className="border-0 bg-gray-50">
                      <CardContent className="p-4">
                        <div className="mb-3 flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{provider.name}</h4>
                            <Badge variant={provider.status === 'active' ? 'default' : 'secondary'}>
                              {provider.status}
                            </Badge>
                          </div>
                          <Users className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Stake</span>
                            <span className="font-medium">{provider.stake}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Accuracy</span>
                            <span className="font-medium">{provider.accuracy}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Total Requests</span>
                            <span className="font-medium">
                              {provider.totalRequests.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Last Update</span>
                            <span className="font-medium">
                              {formatTimeAgo(provider.lastUpdate)}
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
                      <span>Request Coverage</span>
                      <span>
                        {(
                          ((stats?.activeRequests || 0) / (stats?.totalRequests || 1)) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                    <Progress
                      value={((stats?.activeRequests || 0) / (stats?.totalRequests || 1)) * 100}
                    />
                  </div>
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span>Provider Participation</span>
                      <span>96%</span>
                    </div>
                    <Progress value={96} />
                  </div>
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span>Finality Achievement</span>
                      <span>99.5%</span>
                    </div>
                    <Progress value={99.5} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>About Flux</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-600">
                  <p>
                    Flux is a decentralized oracle aggregator built on the NEAR Protocol that
                    provides secure and reliable data feeds for decentralized applications.
                  </p>
                  <ul className="list-inside list-disc space-y-1">
                    <li>Built on NEAR Protocol for low costs</li>
                    <li>Decentralized data provider network</li>
                    <li>Configurable finality thresholds</li>
                    <li>Economic security through staking</li>
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
