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
  Database,
  Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface RedStoneDataPackage {
  id: string;
  symbol: string;
  price: number;
  timestamp: string;
  dataServiceId: string;
  dataFeedId: string;
  status: 'active' | 'stale' | 'error';
  updateCount: number;
}

interface RedStoneDataService {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  lastUpdate: string;
  totalPackages: number;
  avgLatency: number;
  reliability: number;
}

interface RedStoneStats {
  totalPackages: number;
  activePackages: number;
  stalePackages: number;
  totalServices: number;
  avgLatency: number;
  networkUptime: number;
}

const SUPPORTED_CHAINS = [
  { id: 'ethereum', name: 'Ethereum', icon: '⬡' },
  { id: 'arbitrum', name: 'Arbitrum', icon: '🔷' },
  { id: 'optimism', name: 'Optimism', icon: '🔴' },
  { id: 'base', name: 'Base', icon: '🔵' },
  { id: 'avalanche', name: 'Avalanche', icon: '❄️' },
  { id: 'polygon', name: 'Polygon', icon: '💜' },
  { id: 'starknet', name: 'StarkNet', icon: '⭐' },
];

export default function RedStoneMonitorPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<RedStoneDataPackage[]>([]);
  const [services, setServices] = useState<RedStoneDataService[]>([]);
  const [stats, setStats] = useState<RedStoneStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChain, setSelectedChain] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('packages');

  useEffect(() => {
    fetchRedStoneData();
    const interval = setInterval(fetchRedStoneData, 30000);
    return () => clearInterval(interval);
  }, [selectedChain]);

  async function fetchRedStoneData() {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockPackages: RedStoneDataPackage[] = [
        {
          id: 'rs-1',
          symbol: 'ETH/USD',
          price: 3254.78,
          timestamp: new Date(Date.now() - 5000).toISOString(),
          dataServiceId: 'redstone-primary',
          dataFeedId: '0x1234...5678',
          status: 'active',
          updateCount: 15420,
        },
        {
          id: 'rs-2',
          symbol: 'BTC/USD',
          price: 67432.15,
          timestamp: new Date(Date.now() - 8000).toISOString(),
          dataServiceId: 'redstone-primary',
          dataFeedId: '0x8765...4321',
          status: 'active',
          updateCount: 12850,
        },
        {
          id: 'rs-3',
          symbol: 'AVAX/USD',
          price: 35.45,
          timestamp: new Date(Date.now() - 120000).toISOString(),
          dataServiceId: 'redstone-avalanche',
          dataFeedId: '0xabcd...efgh',
          status: 'stale',
          updateCount: 8900,
        },
        {
          id: 'rs-4',
          symbol: 'STARK/USD',
          price: 1.85,
          timestamp: new Date(Date.now() - 10000).toISOString(),
          dataServiceId: 'redstone-starknet',
          dataFeedId: '0xijkl...mnop',
          status: 'active',
          updateCount: 5600,
        },
      ];

      const mockServices: RedStoneDataService[] = [
        {
          id: 'svc-1',
          name: 'RedStone Primary',
          status: 'active',
          lastUpdate: new Date(Date.now() - 5000).toISOString(),
          totalPackages: 2500000,
          avgLatency: 150,
          reliability: 99.9,
        },
        {
          id: 'svc-2',
          name: 'RedStone Avalanche',
          status: 'active',
          lastUpdate: new Date(Date.now() - 8000).toISOString(),
          totalPackages: 1800000,
          avgLatency: 200,
          reliability: 99.8,
        },
        {
          id: 'svc-3',
          name: 'RedStone StarkNet',
          status: 'active',
          lastUpdate: new Date(Date.now() - 10000).toISOString(),
          totalPackages: 1200000,
          avgLatency: 300,
          reliability: 99.7,
        },
      ];

      const mockStats: RedStoneStats = {
        totalPackages: 850,
        activePackages: 847,
        stalePackages: 3,
        totalServices: 12,
        avgLatency: 180,
        networkUptime: 99.95,
      };

      setPackages(mockPackages);
      setServices(mockServices);
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to fetch RedStone data:', error);
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

  const filteredPackages =
    selectedChain === 'all' ? packages : packages.filter((pkg) => pkg.status === 'active');

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
              <span className="text-4xl">💎</span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">RedStone</h1>
                <p className="text-sm text-gray-500">Modular Oracle with On-Demand Data</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={fetchRedStoneData}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Link href="https://redstone.finance" target="_blank" rel="noopener noreferrer">
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
              icon={<Activity className="h-5 w-5" />}
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
            <TabsTrigger value="packages" className="gap-2">
              <Database className="h-4 w-4" />
              Data Packages
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-2">
              <Cpu className="h-4 w-4" />
              Data Services
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="packages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Data Packages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-gray-500">
                        <th className="pb-3 font-medium">Symbol</th>
                        <th className="pb-3 font-medium">Price</th>
                        <th className="pb-3 font-medium">Data Service</th>
                        <th className="pb-3 font-medium">Updates</th>
                        <th className="pb-3 font-medium">Last Update</th>
                        <th className="pb-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPackages.map((pkg) => (
                        <tr key={pkg.id} className="border-b last:border-0">
                          <td className="py-4 font-medium">{pkg.symbol}</td>
                          <td className="py-4 font-mono">
                            $
                            {pkg.price.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 8,
                            })}
                          </td>
                          <td className="py-4">{pkg.dataServiceId}</td>
                          <td className="py-4">{pkg.updateCount.toLocaleString()}</td>
                          <td className="py-4 text-sm text-gray-500">
                            {formatTimeAgo(pkg.timestamp)}
                          </td>
                          <td className="py-4">{getStatusBadge(pkg.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Data Services</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {services.map((service) => (
                    <Card key={service.id} className="border-0 bg-gray-50">
                      <CardContent className="p-4">
                        <div className="mb-3 flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{service.name}</h4>
                            <Badge variant={service.status === 'active' ? 'default' : 'secondary'}>
                              {service.status}
                            </Badge>
                          </div>
                          <Cpu className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Reliability</span>
                            <span className="font-medium">{service.reliability}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Avg Latency</span>
                            <span className="font-medium">{service.avgLatency}ms</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Total Packages</span>
                            <span className="font-medium">
                              {service.totalPackages.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Last Update</span>
                            <span className="font-medium">{formatTimeAgo(service.lastUpdate)}</span>
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
                      <span>Package Coverage</span>
                      <span>
                        {(
                          ((stats?.activePackages || 0) / (stats?.totalPackages || 1)) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                    <Progress
                      value={((stats?.activePackages || 0) / (stats?.totalPackages || 1)) * 100}
                    />
                  </div>
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span>Service Availability</span>
                      <span>98%</span>
                    </div>
                    <Progress value={98} />
                  </div>
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span>Data Freshness</span>
                      <span>99.5%</span>
                    </div>
                    <Progress value={99.5} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>About RedStone</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-600">
                  <p>
                    RedStone is a modular oracle that delivers frequently updated, reliable, and
                    diverse data feeds for your dApp and smart contracts on all EVM L1s & L2s.
                  </p>
                  <ul className="list-inside list-disc space-y-1">
                    <li>On-demand data delivery model</li>
                    <li>Support for 1000+ assets</li>
                    <li>Low-latency updates (sub-second)</li>
                    <li>Custom data feeds for any asset</li>
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
