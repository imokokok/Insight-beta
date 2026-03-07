'use client';

import { useMemo, useState } from 'react';
import { Shield, Star, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { cn, TrendIcon } from '@/shared/utils';

interface DataSourceReliability {
  sourceId: string;
  name: string;
  category: string;
  reliabilityScore: number;
  accuracyScore: number;
  availabilityScore: number;
  latencyScore: number;
  totalRequests: number;
  failedRequests: number;
  avgLatency: number;
  uptimePercent: number;
  lastUpdate: Date;
  trend: 'up' | 'down' | 'stable';
  historicalAccuracy: number[];
}

interface DataSourceReliabilityCardProps {
  sources?: DataSourceReliability[];
  loading?: boolean;
}

export function DataSourceReliabilityCard({ sources, loading = false }: DataSourceReliabilityCardProps) {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  const mockSources: DataSourceReliability[] = useMemo(() => {
    if (sources && sources.length > 0) return sources;

    return [
      {
        sourceId: 'binance',
        name: 'Binance API',
        category: 'CEX',
        reliabilityScore: 98.5,
        accuracyScore: 99.2,
        availabilityScore: 99.8,
        latencyScore: 96.5,
        totalRequests: 2500000,
        failedRequests: 1250,
        avgLatency: 120,
        uptimePercent: 99.95,
        lastUpdate: new Date(Date.now() - 60000),
        trend: 'up',
        historicalAccuracy: [98.8, 98.9, 99.0, 99.1, 99.2, 99.2, 99.2],
      },
      {
        sourceId: 'coinbase',
        name: 'Coinbase Pro',
        category: 'CEX',
        reliabilityScore: 97.8,
        accuracyScore: 98.9,
        availabilityScore: 99.5,
        latencyScore: 95.0,
        totalRequests: 1800000,
        failedRequests: 1800,
        avgLatency: 150,
        uptimePercent: 99.85,
        lastUpdate: new Date(Date.now() - 90000),
        trend: 'stable',
        historicalAccuracy: [98.7, 98.8, 98.8, 98.9, 98.9, 98.9, 98.9],
      },
      {
        sourceId: 'kraken',
        name: 'Kraken',
        category: 'CEX',
        reliabilityScore: 96.5,
        accuracyScore: 98.2,
        availabilityScore: 98.9,
        latencyScore: 92.4,
        totalRequests: 1200000,
        failedRequests: 2400,
        avgLatency: 180,
        uptimePercent: 99.70,
        lastUpdate: new Date(Date.now() - 120000),
        trend: 'down',
        historicalAccuracy: [98.5, 98.4, 98.3, 98.2, 98.2, 98.2, 98.2],
      },
      {
        sourceId: 'chainlink',
        name: 'Chainlink Feeds',
        category: 'Oracle',
        reliabilityScore: 99.2,
        accuracyScore: 99.5,
        availabilityScore: 99.9,
        latencyScore: 98.2,
        totalRequests: 3200000,
        failedRequests: 960,
        avgLatency: 95,
        uptimePercent: 99.98,
        lastUpdate: new Date(Date.now() - 30000),
        trend: 'up',
        historicalAccuracy: [99.2, 99.3, 99.3, 99.4, 99.4, 99.5, 99.5],
      },
      {
        sourceId: 'pyth',
        name: 'Pyth Network',
        category: 'Oracle',
        reliabilityScore: 98.9,
        accuracyScore: 99.3,
        availabilityScore: 99.7,
        latencyScore: 97.7,
        totalRequests: 2800000,
        failedRequests: 1120,
        avgLatency: 85,
        uptimePercent: 99.92,
        lastUpdate: new Date(Date.now() - 45000),
        trend: 'up',
        historicalAccuracy: [99.0, 99.1, 99.1, 99.2, 99.2, 99.3, 99.3],
      },
      {
        sourceId: 'coingecko',
        name: 'CoinGecko API',
        category: 'Aggregator',
        reliabilityScore: 95.2,
        accuracyScore: 97.5,
        availabilityScore: 97.8,
        latencyScore: 90.3,
        totalRequests: 950000,
        failedRequests: 4750,
        avgLatency: 250,
        uptimePercent: 99.50,
        lastUpdate: new Date(Date.now() - 180000),
        trend: 'stable',
        historicalAccuracy: [97.4, 97.5, 97.5, 97.5, 97.5, 97.5, 97.5],
      },
    ];
  }, [sources]);

  const getScoreColor = (score: number) => {
    if (score >= 98) return 'text-green-600 dark:text-green-400';
    if (score >= 95) return 'text-blue-600 dark:text-blue-400';
    if (score >= 90) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 98) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (score >= 95) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (score >= 90) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  };

  const getStarRating = (score: number) => {
    if (score >= 98) return 5;
    if (score >= 95) return 4;
    if (score >= 90) return 3;
    if (score >= 85) return 2;
    return 1;
  };

  const sortedByReliability = [...mockSources].sort((a, b) => b.reliabilityScore - a.reliabilityScore);
  const avgReliability = mockSources.reduce((acc, s) => acc + s.reliabilityScore, 0) / mockSources.length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-5 w-5" />
          Data Source Reliability Scores
        </CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Comprehensive reliability metrics for all data sources
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Avg Reliability</p>
            <p className={cn('text-2xl font-bold', getScoreColor(avgReliability))}>
              {avgReliability.toFixed(1)}
            </p>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    'h-3 w-3',
                    i < Math.round(avgReliability / 20)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground'
                  )}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Total Sources</p>
            <p className="text-2xl font-bold">{mockSources.length}</p>
            <p className="text-xs text-muted-foreground">
              {mockSources.filter(s => s.reliabilityScore >= 95).length} excellent
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Total Requests</p>
            <p className="text-2xl font-bold">
              {(mockSources.reduce((acc, s) => acc + s.totalRequests, 0) / 1000000).toFixed(1)}M
            </p>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Avg Uptime</p>
            <p className="text-2xl font-bold">
              {(mockSources.reduce((acc, s) => acc + s.uptimePercent, 0) / mockSources.length).toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground">Network availability</p>
          </div>
        </div>

        <div className="space-y-3">
          {sortedByReliability.map((source) => (
            <div
              key={source.sourceId}
              className={cn(
                'rounded-lg border p-4 transition-all',
                selectedSource === source.sourceId && 'border-primary bg-muted/50',
                'cursor-pointer'
              )}
              onClick={() => setSelectedSource(
                selectedSource === source.sourceId ? null : source.sourceId
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{source.name}</p>
                      <Badge variant="outline">{source.category}</Badge>
                      <div className="flex items-center gap-1">
                      <TrendIcon trend={source.trend} />
                      <span className={cn(
                        'text-xs font-medium',
                        source.trend === 'up' ? 'text-green-600' :
                        source.trend === 'down' ? 'text-red-600' : 'text-blue-600'
                      )}>
                        {source.trend}
                      </span>
                    </div>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{(source.totalRequests / 1000000).toFixed(1)}M requests</span>
                      <span>Latency: {source.avgLatency}ms</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-2xl font-bold', getScoreColor(source.reliabilityScore))}>
                      {source.reliabilityScore.toFixed(1)}
                    </span>
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'h-3 w-3',
                            i < getStarRating(source.reliabilityScore)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-muted-foreground'
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Reliability Score</p>
                </div>
              </div>

              {selectedSource === source.sourceId && (
                <div className="mt-4 border-t pt-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle className="h-3 w-3" />
                        Accuracy
                      </div>
                      <p className={cn('mt-1 text-lg font-bold', getScoreColor(source.accuracyScore))}>
                        {source.accuracyScore.toFixed(1)}
                      </p>
                      <Progress value={source.accuracyScore} className="mt-2 h-1.5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Shield className="h-3 w-3" />
                        Availability
                      </div>
                      <p className={cn('mt-1 text-lg font-bold', getScoreColor(source.availabilityScore))}>
                        {source.availabilityScore.toFixed(1)}
                      </p>
                      <Progress value={source.availabilityScore} className="mt-2 h-1.5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Latency
                      </div>
                      <p className={cn('mt-1 text-lg font-bold', getScoreColor(source.latencyScore))}>
                        {source.latencyScore.toFixed(1)}
                      </p>
                      <Progress value={source.latencyScore} className="mt-2 h-1.5" />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Uptime</p>
                      <p className="text-lg font-semibold">{source.uptimePercent.toFixed(2)}%</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Failed Requests</p>
                      <p className="text-lg font-semibold">{source.failedRequests.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {((source.failedRequests / source.totalRequests) * 100).toFixed(3)}% failure rate
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Last Update</p>
                      <p className="text-lg font-semibold">
                        {source.lastUpdate.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">
                      Historical Accuracy (7 Days)
                    </p>
                    <div className="flex items-end gap-1">
                      {source.historicalAccuracy.map((accuracy, i) => (
                        <div
                          key={i}
                          className="flex-1"
                          title={`Day ${i + 1}: ${accuracy.toFixed(1)}%`}
                        >
                          <div
                            className={cn(
                              'mx-auto h-16 w-full rounded-t',
                              getScoreBadgeColor(accuracy)
                            )}
                            style={{ height: `${accuracy - 90}%` }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                      <span>7 days ago</span>
                      <span>Today</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
