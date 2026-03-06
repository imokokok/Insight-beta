'use client';

import { useMemo, lazy, Suspense } from 'react';
import { Activity, TrendingUp, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/shared/utils';

const ValidatorPerformanceChart = lazy(() =>
  import('@/features/oracle/band/components/ValidatorPerformanceChart').then((mod) => ({
    default: mod.ValidatorPerformanceChart,
  }))
);

interface ValidatorStats {
  totalValidators: number;
  activeValidators: number;
  avgUptime: number;
  totalVotingPower: number;
  topValidatorShare: number;
  networkHealth: 'excellent' | 'good' | 'fair' | 'poor';
}

interface ValidatorHealthCardProps {
  stats?: ValidatorStats;
  loading?: boolean;
}

export function ValidatorHealthCard({ stats, loading = false }: ValidatorHealthCardProps) {
  const mockStats: ValidatorStats = useMemo(() => {
    if (stats) return stats;
    
    return {
      totalValidators: 100,
      activeValidators: 95,
      avgUptime: 99.2,
      totalVotingPower: 100000000,
      topValidatorShare: 15.5,
      networkHealth: 'excellent',
    };
  }, [stats]);

  const getHealthColor = (health: ValidatorStats['networkHealth']) => {
    switch (health) {
      case 'excellent':
        return 'text-green-600 dark:text-green-400';
      case 'good':
        return 'text-blue-600 dark:text-blue-400';
      case 'fair':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'poor':
        return 'text-red-600 dark:text-red-400';
    }
  };

  const getHealthIcon = (health: ValidatorStats['networkHealth']) => {
    switch (health) {
      case 'excellent':
        return <Award className="h-5 w-5 text-green-600" />;
      case 'good':
        return <TrendingUp className="h-5 w-5 text-blue-600" />;
      case 'fair':
        return <Activity className="h-5 w-5 text-yellow-600" />;
      case 'poor':
        return <Activity className="h-5 w-5 text-red-600" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-full" />
              </div>
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
          <Activity className="h-5 w-5" />
          Validator Network Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Total Validators</p>
            <p className="text-2xl font-bold">{mockStats.totalValidators}</p>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">{mockStats.activeValidators} active</span>
              {' '}({((mockStats.activeValidators / mockStats.totalValidators) * 100).toFixed(1)}%)
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Average Uptime</p>
            <p className="text-2xl font-bold">{mockStats.avgUptime.toFixed(2)}%</p>
            <p className="text-xs text-muted-foreground">
              Network reliability
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Total Voting Power</p>
            <p className="text-2xl font-bold">
              {(mockStats.totalVotingPower / 1000000).toFixed(1)}M
            </p>
            <p className="text-xs text-muted-foreground">
              BAND staked
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Network Health</p>
            <div className="flex items-center gap-2">
              {getHealthIcon(mockStats.networkHealth)}
              <p className={cn('text-2xl font-bold', getHealthColor(mockStats.networkHealth))}>
                {mockStats.networkHealth.toUpperCase()}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Top validator: {mockStats.topValidatorShare.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            <ValidatorPerformanceChart />
          </Suspense>
        </div>
      </CardContent>
    </Card>
  );
}
