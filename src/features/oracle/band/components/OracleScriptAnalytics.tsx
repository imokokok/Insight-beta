'use client';

import { useMemo, useState } from 'react';
import { BarChart3, TrendingUp, Clock, Target, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/shared/utils';

interface ScriptPerformance {
  scriptId: string;
  name: string;
  totalRequests: number;
  successRate: number;
  avgResponseTime: number;
  requests24h: number;
  requestsChange: number;
  reliability: number;
  popularity: number;
  category: string;
}

interface OracleScriptAnalyticsProps {
  scripts?: ScriptPerformance[];
  loading?: boolean;
}

export function OracleScriptAnalytics({ scripts, loading = false }: OracleScriptAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  const mockScripts: ScriptPerformance[] = useMemo(() => {
    if (scripts && scripts.length > 0) return scripts;

    return [
      {
        scriptId: 'price_feed',
        name: 'Price Feed',
        totalRequests: 1250000,
        successRate: 99.8,
        avgResponseTime: 450,
        requests24h: 52000,
        requestsChange: 12.5,
        reliability: 99.9,
        popularity: 95,
        category: 'Price Data',
      },
      {
        scriptId: 'crypto_prices',
        name: 'Crypto Prices',
        totalRequests: 890000,
        successRate: 99.5,
        avgResponseTime: 380,
        requests24h: 38000,
        requestsChange: 8.3,
        reliability: 99.7,
        popularity: 88,
        category: 'Price Data',
      },
      {
        scriptId: 'weather_data',
        name: 'Weather Data',
        totalRequests: 345000,
        successRate: 98.9,
        avgResponseTime: 820,
        requests24h: 15000,
        requestsChange: -3.2,
        reliability: 98.5,
        popularity: 65,
        category: 'Real World',
      },
      {
        scriptId: 'sports_results',
        name: 'Sports Results',
        totalRequests: 123000,
        successRate: 97.8,
        avgResponseTime: 580,
        requests24h: 5200,
        requestsChange: 5.1,
        reliability: 97.2,
        popularity: 45,
        category: 'Sports',
      },
      {
        scriptId: 'stock_prices',
        name: 'Stock Prices',
        totalRequests: 892000,
        successRate: 99.6,
        avgResponseTime: 420,
        requests24h: 42000,
        requestsChange: 15.7,
        reliability: 99.8,
        popularity: 92,
        category: 'Price Data',
      },
      {
        scriptId: 'randomness',
        name: 'Randomness Generator',
        totalRequests: 567000,
        successRate: 99.9,
        avgResponseTime: 250,
        requests24h: 25000,
        requestsChange: 22.4,
        reliability: 99.95,
        popularity: 78,
        category: 'Utility',
      },
    ];
  }, [scripts]);

  const sortedByPopularity = [...mockScripts].sort((a, b) => b.popularity - a.popularity);
  const sortedByPerformance = [...mockScripts].sort((a, b) => b.reliability - a.reliability);

  const avgSuccessRate = mockScripts.reduce((acc, s) => acc + s.successRate, 0) / mockScripts.length;
  const avgResponseTime = mockScripts.reduce((acc, s) => acc + s.avgResponseTime, 0) / mockScripts.length;
  const totalRequests24h = mockScripts.reduce((acc, s) => acc + s.requests24h, 0);

  const getPerformanceColor = (reliability: number) => {
    if (reliability >= 99.5) return 'text-green-600 dark:text-green-400';
    if (reliability >= 98) return 'text-blue-600 dark:text-blue-400';
    if (reliability >= 95) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-muted-foreground';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="h-5 w-40 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
            </div>
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 w-16 animate-pulse rounded bg-muted" />
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5" />
              Oracle Script Analytics
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Performance metrics and usage statistics for all Oracle scripts
            </p>
          </div>
          <div className="flex gap-2">
            {(['24h', '7d', '30d'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range)}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Target className="h-3.5 w-3.5" />
              Avg Success Rate
            </div>
            <p className={cn('text-2xl font-bold', getPerformanceColor(avgSuccessRate))}>
              {avgSuccessRate.toFixed(2)}%
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Avg Response Time
            </div>
            <p className="text-2xl font-bold">{avgResponseTime.toFixed(0)}ms</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Zap className="h-3.5 w-3.5" />
              Total Requests (24h)
            </div>
            <p className="text-2xl font-bold">{(totalRequests24h / 1000).toFixed(1)}K</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              Active Scripts
            </div>
            <p className="text-2xl font-bold">{mockScripts.length}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="mb-3 text-sm font-semibold">Top Scripts by Popularity</h4>
            <div className="space-y-2">
              {sortedByPopularity.slice(0, 5).map((script, index) => (
                <div
                  key={script.scriptId}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{script.name}</p>
                      <p className="text-xs text-muted-foreground">{script.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-semibold">{script.requests24h.toLocaleString()}</p>
                      <p className={cn('text-xs', getTrendColor(script.requestsChange))}>
                        {script.requestsChange > 0 ? '+' : ''}{script.requestsChange.toFixed(1)}%
                      </p>
                    </div>
                    <Badge variant="outline" className={cn('font-semibold', getPerformanceColor(script.reliability))}>
                      {script.reliability.toFixed(2)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="mb-3 text-sm font-semibold">Best Performance</h4>
              <div className="rounded-lg border p-4">
                {sortedByPerformance.slice(0, 3).map((script, index) => (
                  <div key={script.scriptId} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <TrophyIcon rank={index + 1} />
                      <span className="text-sm font-medium">{script.name}</span>
                    </div>
                    <span className={cn('text-sm font-bold', getPerformanceColor(script.reliability))}>
                      {script.reliability.toFixed(3)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-semibold">Fastest Response</h4>
              <div className="rounded-lg border p-4">
                {[...mockScripts].sort((a, b) => a.avgResponseTime - b.avgResponseTime).slice(0, 3).map((script, index) => (
                  <div key={script.scriptId} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <TrophyIcon rank={index + 1} />
                      <span className="text-sm font-medium">{script.name}</span>
                    </div>
                    <span className="text-sm font-bold">{script.avgResponseTime}ms</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TrophyIcon({ rank }: { rank: number }) {
  const colors = {
    1: 'text-yellow-500',
    2: 'text-gray-400',
    3: 'text-amber-600',
  };
  
  return <TrendingUp className={cn('h-4 w-4', colors[rank as keyof typeof colors])} />;
}
