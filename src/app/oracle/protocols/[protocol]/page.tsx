'use client';

import { useEffect, useState, useCallback } from 'react';

import {
  Globe,
  RefreshCw,
  TrendingUp,
  Activity,
  ExternalLink,
  Globe2,
  Zap,
  Link2,
  Server,
  AlertTriangle,
} from 'lucide-react';

import { StatCard } from '@/components/common';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { SUPPORTED_CHAINS } from '@/config/constants';
import { logger } from '@/shared/logger';
import { cn, fetchApiData } from '@/shared/utils';

interface ProtocolFeed {
  id: string;
  name: string;
  symbol: string;
  price: number;
  decimals: number;
  updatedAt: string;
  chain: string;
  contractAddress?: string;
  status: 'active' | 'stale' | 'inactive';
  heartbeat?: number;
  deviationThreshold?: number;
}

interface ProtocolNode {
  id: string;
  name: string;
  address: string;
  status: 'active' | 'inactive';
  lastUpdate: string;
  totalSubmissions: number;
  accuracy: number;
}

interface ProtocolStats {
  totalFeeds: number;
  activeFeeds: number;
  staleFeeds: number;
  totalNodes?: number;
  avgUpdateLatency: number;
  networkUptime: number;
  totalSubmissions?: number;
}

interface ProtocolDetail {
  id: string;
  name: string;
  description: string;
  website: string;
  supportedChains: string[];
  features: string[];
  category: string;
  feeds: ProtocolFeed[];
  nodes: ProtocolNode[];
  stats: ProtocolStats;
  tvl: number;
  tvlChange24h: number;
  avgLatency: number;
  uptime: number;
  priceFeeds: number;
  lastUpdate: string;
  usageCount: number;
  status: 'active' | 'inactive' | 'maintenance';
}

export default function ProtocolDetailPage({ params }: { params: Promise<{ protocol: string }> }) {
  const [protocol, setProtocol] = useState<ProtocolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [protocolName, setProtocolName] = useState('');

  useEffect(() => {
    params.then((resolved) => setProtocolName(resolved.protocol));
  }, [params]);

  const fetchProtocol = useCallback(async () => {
    if (!protocolName) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApiData<ProtocolDetail>(`/api/oracle/protocols/${protocolName}`);
      setProtocol(response);
    } catch (err) {
      logger.error('Failed to load protocol', { error: err });
      setError(err instanceof Error ? err.message : 'Failed to load protocol');
    } finally {
      setLoading(false);
    }
  }, [protocolName]);

  useEffect(() => {
    fetchProtocol();
  }, [fetchProtocol]);

  const getChainInfo = (chainId: string) => SUPPORTED_CHAINS.find((c) => c.id === chainId);

  const statusColors: Record<string, string> = {
    active: 'bg-green-500',
    inactive: 'bg-gray-500',
    maintenance: 'bg-yellow-500',
  };

  const feedStatusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    stale: 'bg-yellow-100 text-yellow-800',
    inactive: 'bg-red-100 text-red-800',
  };

  if (error) {
    return (
      <ErrorBoundary>
        <div className="container mx-auto p-6">
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="text-destructive mx-auto mb-4 h-12 w-12" />
              <h2 className="text-destructive mb-2 text-xl font-bold">Failed to Load Protocol</h2>
              <p className="mb-4 text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={fetchProtocol}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl lg:text-3xl">
              <Globe className="h-6 w-6 text-blue-600" />
              <span className="capitalize">{protocol?.name || protocolName}</span>
              {protocol && (
                <Badge className={statusColors[protocol.status]}>{protocol.status}</Badge>
              )}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {protocol?.description || 'Loading protocol details...'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {protocol?.website && (
              <a
                href={protocol.website}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent-foreground inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium ring-offset-background transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Official Site
              </a>
            )}
            <Button variant="outline" size="sm" onClick={fetchProtocol} disabled={loading}>
              <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        {loading && !protocol ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : protocol ? (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
              <StatCard
                title="Price Feeds"
                value={protocol.priceFeeds}
                icon={<Link2 className="h-5 w-5" />}
                color="blue"
              />
              <StatCard
                title="Active Feeds"
                value={protocol.stats.activeFeeds}
                icon={<Activity className="h-5 w-5" />}
                color="green"
              />
              <StatCard
                title="Avg Latency"
                value={`${protocol.avgLatency}ms`}
                icon={<Zap className="h-5 w-5" />}
                color="amber"
              />
              <StatCard
                title="Uptime"
                value={`${protocol.uptime}%`}
                icon={<TrendingUp className="h-5 w-5" />}
                color="green"
              />
              <StatCard
                title="TVL"
                value={`$${(protocol.tvl / 1e9).toFixed(2)}B`}
                icon={<Zap className="h-5 w-5" />}
                color="purple"
                trend={{
                  value: protocol.tvlChange24h,
                  isPositive: protocol.tvlChange24h >= 0,
                }}
              />
              <StatCard
                title="Supported Chains"
                value={protocol.supportedChains.length}
                icon={<Globe2 className="h-5 w-5" />}
                color="blue"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    Price Feeds
                  </CardTitle>
                  <CardDescription>
                    {protocol.stats.activeFeeds} active / {protocol.stats.totalFeeds} total
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {protocol.feeds.slice(0, 10).map((feed) => (
                      <div
                        key={feed.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <Badge className={feedStatusColors[feed.status]}>{feed.status}</Badge>
                          <div>
                            <div className="font-medium">{feed.symbol}</div>
                            <div className="text-xs text-muted-foreground">{feed.chain}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">${feed.price.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(feed.updatedAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                    {protocol.feeds.length > 10 && (
                      <div className="text-center text-sm text-muted-foreground">
                        +{protocol.feeds.length - 10} more feeds
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {protocol.nodes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5" />
                      Nodes
                    </CardTitle>
                    <CardDescription>
                      {protocol.nodes.filter((n) => n.status === 'active').length} active /{' '}
                      {protocol.nodes.length} total
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {protocol.nodes.map((node) => (
                        <div
                          key={node.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-3">
                            <Badge
                              className={
                                node.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }
                            >
                              {node.status}
                            </Badge>
                            <div>
                              <div className="font-medium">{node.name}</div>
                              <div className="font-mono text-xs text-muted-foreground">
                                {node.address.slice(0, 10)}...{node.address.slice(-8)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{node.accuracy.toFixed(1)}%</div>
                            <div className="text-xs text-muted-foreground">accuracy</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe2 className="h-5 w-5" />
                  Supported Chains
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {protocol.supportedChains.map((chainId) => {
                    const chainInfo = getChainInfo(chainId);
                    return (
                      <Badge key={chainId} variant="outline" className="gap-1">
                        {chainInfo?.name || chainId}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {protocol.features.map((feature) => (
                    <Badge key={feature} variant="secondary">
                      {feature.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </ErrorBoundary>
  );
}
