'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowLeft, Settings, Activity, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PriceFeedTable } from '@/components/features/protocol/PriceFeedTable';
import { OracleBreadcrumb } from '@/components/features/common/Breadcrumb';
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
  insight: '🔮',
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

export default function ProtocolPage() {
  const params = useParams();
  const router = useRouter();
  const protocol = params.protocol as OracleProtocol;
  const [activeTab, setActiveTab] = useState('feeds');
  const [isValid, setIsValid] = useState(true);

  // Validate protocol
  useEffect(() => {
    setIsValid(ORACLE_PROTOCOLS.includes(protocol));
  }, [protocol]);

  const { stats, isLoading: statsLoading } = useProtocolStats(protocol);
  const { feeds, isLoading: feedsLoading } = usePriceFeeds({ protocol });
  const info = PROTOCOL_INFO[protocol];
  const capabilities = getProtocolCapabilities(protocol);

  if (!isValid) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">Invalid Protocol</h1>
          <p className="text-muted-foreground mb-4">
            The protocol &quot;{protocol}&quot; is not supported.
          </p>
          <Button onClick={() => (window.location.href = '/oracle/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 py-8">
      {/* Breadcrumb */}
      <OracleBreadcrumb protocol={protocol} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/oracle/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{PROTOCOL_ICONS[protocol]}</span>
            <div>
              <h1 className="text-3xl font-bold">{PROTOCOL_DISPLAY_NAMES[protocol]}</h1>
              <p className="text-muted-foreground">{info.description}</p>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => (window.location.href = `/oracle/protocols/${protocol}/config`)}
        >
          <Settings className="mr-2 h-4 w-4" />
          Configure
        </Button>
      </div>

      {/* Capabilities */}
      <div className="flex flex-wrap gap-2">
        {capabilities.priceFeeds && (
          <Badge variant="secondary">
            <Activity className="mr-1 h-3 w-3" />
            Price Feeds
          </Badge>
        )}
        {capabilities.assertions && (
          <Badge variant="secondary">
            <Activity className="mr-1 h-3 w-3" />
            Assertions
          </Badge>
        )}
        {capabilities.disputes && (
          <Badge variant="secondary">
            <Shield className="mr-1 h-3 w-3" />
            Disputes
          </Badge>
        )}
        {capabilities.vrf && <Badge variant="secondary">VRF</Badge>}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Current Price"
          value={stats?.currentPrice ? `$${stats.currentPrice.toLocaleString()}` : 'N/A'}
          isLoading={statsLoading}
        />
        <StatCard
          title="24h Updates"
          value={stats?.updates24h?.toString() || '0'}
          isLoading={statsLoading}
        />
        <StatCard title="Active Feeds" value={feeds.length.toString()} isLoading={feedsLoading} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="feeds">Price Feeds</TabsTrigger>
          <TabsTrigger value="info">Protocol Info</TabsTrigger>
          {capabilities.assertions && <TabsTrigger value="assertions">Assertions</TabsTrigger>}
          {capabilities.disputes && <TabsTrigger value="disputes">Disputes</TabsTrigger>}
        </TabsList>

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
          <Card>
            <CardHeader>
              <CardTitle>Protocol Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground text-sm">Website</p>
                  <a
                    href={info.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {info.website}
                  </a>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Supported Chains</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {info.supportedChains.map((chain) => (
                      <Badge key={chain} variant="outline" className="capitalize">
                        {chain}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Features</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {info.features.map((feature) => (
                    <Badge key={feature} variant="secondary">
                      {feature.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {capabilities.assertions && (
          <TabsContent value="assertions">
            <Card>
              <CardContent>
                <EmptyState
                  variant="default"
                  title="Assertions view coming soon"
                  description="This protocol supports assertions. You can view and manage your assertions."
                  action={{
                    label: 'View My Assertions',
                    onClick: () => (window.location.href = '/oracle/my-assertions'),
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {capabilities.disputes && (
          <TabsContent value="disputes">
            <Card>
              <CardContent>
                <EmptyState
                  variant="default"
                  title="Disputes view coming soon"
                  description="This protocol supports disputes. You can view and manage your disputes."
                  action={{
                    label: 'View My Disputes',
                    onClick: () => (window.location.href = '/oracle/my-disputes'),
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  isLoading?: boolean;
}

function StatCard({ title, value, isLoading }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-muted-foreground text-sm">{title}</p>
        <p className={cn('text-2xl font-bold', isLoading && 'animate-pulse')}>
          {isLoading ? '...' : value}
        </p>
      </CardContent>
    </Card>
  );
}
