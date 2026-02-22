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
  AlertTriangle,
} from 'lucide-react';

import { StatsBar, ContentSection, ContentGrid } from '@/components/common';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
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
          <div className="border-destructive/50 bg-destructive/10 rounded-xl border p-6 text-center">
            <AlertTriangle className="text-destructive mx-auto mb-4 h-12 w-12" />
            <h2 className="text-destructive mb-2 text-xl font-bold">Failed to Load Protocol</h2>
            <p className="mb-4 text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={fetchProtocol}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
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
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
        ) : protocol ? (
          <>
            <StatsBar
              title="协议统计"
              items={[
                {
                  label: 'Price Feeds',
                  value: protocol.priceFeeds,
                  icon: <Link2 className="h-4 w-4" />,
                },
                {
                  label: 'Active Feeds',
                  value: protocol.stats.activeFeeds,
                  status: 'healthy',
                  icon: <Activity className="h-4 w-4" />,
                },
                {
                  label: 'Avg Latency',
                  value: `${protocol.avgLatency}ms`,
                  status:
                    protocol.avgLatency < 200
                      ? 'healthy'
                      : protocol.avgLatency < 500
                        ? 'warning'
                        : 'critical',
                  icon: <Zap className="h-4 w-4" />,
                },
                {
                  label: 'Uptime',
                  value: `${protocol.uptime}%`,
                  status:
                    protocol.uptime >= 99
                      ? 'healthy'
                      : protocol.uptime >= 95
                        ? 'warning'
                        : 'critical',
                  icon: <TrendingUp className="h-4 w-4" />,
                },
                {
                  label: 'TVL',
                  value: `$${(protocol.tvl / 1e9).toFixed(2)}B`,
                  trend: protocol.tvlChange24h >= 0 ? 'up' : 'down',
                  icon: <Zap className="h-4 w-4" />,
                },
                {
                  label: 'Supported Chains',
                  value: protocol.supportedChains.length,
                  icon: <Globe2 className="h-4 w-4" />,
                },
              ]}
            />

            <ContentGrid columns={2}>
              <ContentSection
                title="Price Feeds"
                description={`${protocol.stats.activeFeeds} active / ${protocol.stats.totalFeeds} total`}
              >
                <div className="space-y-2">
                  {protocol.feeds.slice(0, 10).map((feed) => (
                    <div
                      key={feed.id}
                      className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/20 p-3"
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
              </ContentSection>

              {protocol.nodes.length > 0 && (
                <ContentSection
                  title="Nodes"
                  description={`${protocol.nodes.filter((n) => n.status === 'active').length} active / ${protocol.nodes.length} total`}
                >
                  <div className="space-y-2">
                    {protocol.nodes.map((node) => (
                      <div
                        key={node.id}
                        className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/20 p-3"
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
                </ContentSection>
              )}
            </ContentGrid>

            <ContentSection title="Supported Chains">
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
            </ContentSection>

            <ContentSection title="Features">
              <div className="flex flex-wrap gap-2">
                {protocol.features.map((feature) => (
                  <Badge key={feature} variant="secondary">
                    {feature.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </ContentSection>
          </>
        ) : null}
      </div>
    </ErrorBoundary>
  );
}
