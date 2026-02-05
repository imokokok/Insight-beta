'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Activity,
  Shield,
  Globe,
  TrendingUp,
  ExternalLink,
  BarChart3,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { PriceFeedTable } from '@/components/features/protocol/PriceFeedTable';
import { EmptyState } from '@/components/features/common/EmptyState';
import { useProtocolStats } from '@/hooks/protocol/useProtocolData';
import { usePriceFeeds } from '@/hooks/protocol/usePriceFeeds';
import {
  ORACLE_PROTOCOLS,
  PROTOCOL_DISPLAY_NAMES,
  PROTOCOL_INFO,
  type OracleProtocol,
} from '@/lib/types';
import { getProtocolCapabilities } from '@/lib/blockchain/protocolFactory';
import { cn } from '@/lib/utils';

const PROTOCOL_ICONS: Record<OracleProtocol, string> = {
  uma: '⚖️',
  chainlink: '🔗',
  pyth: '🐍',
  band: '🎸',
  api3: '📡',
  redstone: '💎',
  switchboard: '🎛️',
  flux: '⚡',
  dia: '📊',
};

// 协议特定的监控页面映射
const PROTOCOL_MONITOR_PAGES: Partial<Record<OracleProtocol, string>> = {
  chainlink: '/oracle/protocols/chainlink',
  pyth: '/oracle/protocols/pyth',
  uma: '/oracle/protocols/uma',
  band: '/oracle/protocols/band',
  api3: '/oracle/protocols/api3',
};

export default function ProtocolPage() {
  const params = useParams();
  const router = useRouter();
  const protocol = params.protocol as OracleProtocol;
  const [activeTab, setActiveTab] = useState('overview');
  const [isValid, setIsValid] = useState(true);

  // Validate protocol
  useEffect(() => {
    setIsValid(ORACLE_PROTOCOLS.includes(protocol));
  }, [protocol]);

  const { stats, isLoading: statsLoading } = useProtocolStats(protocol);
  const { feeds, isLoading: feedsLoading } = usePriceFeeds({ protocol });
  const info = PROTOCOL_INFO[protocol];
  const capabilities = getProtocolCapabilities(protocol);

  // 如果有专用监控页面，显示提示
  const hasDedicatedPage = PROTOCOL_MONITOR_PAGES[protocol];

  if (!isValid) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">Invalid Protocol</h1>
          <p className="text-muted-foreground mb-4">
            The protocol &quot;{protocol}&quot; is not supported.
          </p>
          <Button onClick={() => router.push('/oracle/dashboard')}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/oracle/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{PROTOCOL_ICONS[protocol]}</span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {PROTOCOL_DISPLAY_NAMES[protocol]}
                </h1>
                <p className="text-sm text-gray-500">{info.description}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasDedicatedPage && (
              <Link href={hasDedicatedPage as any}>
                <Button variant="outline" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Advanced Monitor
                </Button>
              </Link>
            )}
            <a href={info.website} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Official Site
              </Button>
            </a>
          </div>
        </div>

        {/* Dedicated Page Alert */}
        {hasDedicatedPage && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="flex items-center gap-4 py-4">
              <Zap className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <p className="font-medium text-blue-900">
                  Enhanced monitoring available for {PROTOCOL_DISPLAY_NAMES[protocol]}
                </p>
                <p className="text-sm text-blue-700">
                  View detailed metrics, node operators, and protocol-specific analytics.
                </p>
              </div>
              <Link href={hasDedicatedPage as any}>
                <Button className="gap-2">
                  Open Monitor
                  <ArrowLeft className="h-4 w-4 rotate-180" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Capabilities */}
        <div className="flex flex-wrap gap-2">
          {capabilities.priceFeeds && (
            <Badge variant="secondary" className="gap-1">
              <Activity className="h-3 w-3" />
              Price Feeds
            </Badge>
          )}
          {capabilities.assertions && (
            <Badge variant="secondary" className="gap-1">
              <Shield className="h-3 w-3" />
              Assertions
            </Badge>
          )}
          {capabilities.disputes && (
            <Badge variant="secondary" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Disputes
            </Badge>
          )}
          {capabilities.vrf && (
            <Badge variant="secondary" className="gap-1">
              <Zap className="h-3 w-3" />
              VRF
            </Badge>
          )}
          <Badge variant="outline" className="gap-1">
            <Globe className="h-3 w-3" />
            {info.supportedChains.length} Chains
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Current Price"
            value={stats?.currentPrice ? `$${stats.currentPrice.toLocaleString()}` : 'N/A'}
            icon={<TrendingUp className="h-5 w-5" />}
            isLoading={statsLoading}
            color="blue"
          />
          <StatCard
            title="24h Updates"
            value={stats?.updates24h?.toString() || '0'}
            icon={<Activity className="h-5 w-5" />}
            isLoading={statsLoading}
            color="green"
          />
          <StatCard
            title="Active Feeds"
            value={feeds.length.toString()}
            icon={<Layers className="h-5 w-5" />}
            isLoading={feedsLoading}
            color="purple"
          />
          <StatCard
            title="Network Health"
            value="98.5%"
            icon={<Shield className="h-5 w-5" />}
            isLoading={statsLoading}
            color="orange"
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <Activity className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="feeds" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Price Feeds
            </TabsTrigger>
            <TabsTrigger value="info" className="gap-2">
              <Globe className="h-4 w-4" />
              Protocol Info
            </TabsTrigger>
            {capabilities.assertions && (
              <TabsTrigger value="assertions" className="gap-2">
                <Shield className="h-4 w-4" />
                Assertions
              </TabsTrigger>
            )}
            {capabilities.disputes && (
              <TabsTrigger value="disputes" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                Disputes
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Protocol Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span>Uptime</span>
                      <span className="font-medium">99.9%</span>
                    </div>
                    <Progress value={99.9} className="h-2" />
                  </div>
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span>Update Frequency</span>
                      <span className="font-medium">95%</span>
                    </div>
                    <Progress value={95} className="h-2" />
                  </div>
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span>Data Accuracy</span>
                      <span className="font-medium">99.8%</span>
                    </div>
                    <Progress value={99.8} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Supported Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {info.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="capitalize">{feature.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Link href={`/oracle/comparison?protocol=${protocol}`}>
                    <Button variant="outline" className="gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Compare Prices
                    </Button>
                  </Link>
                  {capabilities.assertions && (
                    <Link href="/my-assertions">
                      <Button variant="outline" className="gap-2">
                        <Shield className="h-4 w-4" />
                        My Assertions
                      </Button>
                    </Link>
                  )}
                  {capabilities.disputes && (
                    <Link href="/my-disputes">
                      <Button variant="outline" className="gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        My Disputes
                      </Button>
                    </Link>
                  )}
                  <Link href="/oracle/alerts">
                    <Button variant="outline" className="gap-2">
                      <Clock className="h-4 w-4" />
                      Set Alerts
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feeds" className="space-y-4">
            <PriceFeedTable
              feeds={feeds}
              isLoading={feedsLoading}
              showProtocol={false}
              showChain={true}
              title={`${PROTOCOL_DISPLAY_NAMES[protocol]} Price Feeds`}
            />
          </TabsContent>

          <TabsContent value="info" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Protocol Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Website</p>
                    <a
                      href={info.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      {info.website}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Supported Chains</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {info.supportedChains.map((chain) => (
                        <Badge key={chain} variant="outline" className="capitalize">
                          {chain}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>About {PROTOCOL_DISPLAY_NAMES[protocol]}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-gray-600">
                    {info.description} This protocol is part of the universal oracle monitoring
                    platform, providing real-time price data and analytics across multiple
                    blockchain networks.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {capabilities.assertions && (
            <TabsContent value="assertions">
              <Card>
                <CardContent className="py-8">
                  <EmptyState
                    variant="default"
                    title="Assertions"
                    description="View and manage assertions for this protocol."
                    action={{
                      label: 'View My Assertions',
                      onClick: () => router.push('/my-assertions'),
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {capabilities.disputes && (
            <TabsContent value="disputes">
              <Card>
                <CardContent className="py-8">
                  <EmptyState
                    variant="default"
                    title="Disputes"
                    description="View and manage disputes for this protocol."
                    action={{
                      label: 'View My Disputes',
                      onClick: () => router.push('/my-disputes'),
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  isLoading?: boolean;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function StatCard({ title, value, icon, isLoading, color }: StatCardProps) {
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
          <p className={cn('text-2xl font-bold', isLoading && 'animate-pulse')}>
            {isLoading ? '...' : value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
