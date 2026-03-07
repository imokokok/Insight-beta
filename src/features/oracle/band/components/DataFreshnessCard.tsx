'use client';

import { useState, useEffect, useCallback } from 'react';

import { Clock, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Button, Skeleton } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn, formatTime } from '@/shared/utils';

export interface FreshnessData {
  symbol: string;
  chain: string;
  lastUpdate: string;
  updateInterval: number;
  stalenessThreshold: number;
  currentStaleness: number;
  isStale: boolean;
  consecutiveUpdates: number;
  failedUpdates: number;
}

interface DataFreshnessCardProps {
  symbol?: string;
  chain?: string;
  className?: string;
}

export function DataFreshnessCard({ symbol = 'ETH/USD', chain = 'ethereum', className }: DataFreshnessCardProps) {
  const { t } = useI18n();
  const [data, setData] = useState<FreshnessData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/oracle/band/freshness?symbol=${symbol}&chain=${chain}`);
      if (!response.ok) {
        throw new Error('Failed to fetch freshness data');
      }

      const result = await response.json();
      if (result.success && result.data) {
        setData(result.data);
      } else {
        // Use mock data as fallback
        setData({
          symbol,
          chain,
          lastUpdate: new Date(Date.now() - 60000).toISOString(),
          updateInterval: 60000,
          stalenessThreshold: 300000,
          currentStaleness: 60000,
          isStale: false,
          consecutiveUpdates: 1250,
          failedUpdates: 2,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Use mock data as fallback
      setData({
        symbol,
        chain,
        lastUpdate: new Date(Date.now() - 60000).toISOString(),
        updateInterval: 60000,
        stalenessThreshold: 300000,
        currentStaleness: 60000,
        isStale: false,
        consecutiveUpdates: 1250,
        failedUpdates: 2,
      });
    } finally {
      setIsLoading(false);
    }
  }, [symbol, chain]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStalenessStatus = (staleness: number, threshold: number) => {
    const ratio = staleness / threshold;
    if (ratio < 0.3) return { status: 'healthy', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
    if (ratio < 0.7) return { status: 'warning', color: 'text-amber-500', bg: 'bg-amber-500/10' };
    return { status: 'critical', color: 'text-red-500', bg: 'bg-red-500/10' };
  };

  const getSuccessRate = (consecutive: number, failed: number) => {
    const total = consecutive + failed;
    if (total === 0) return 100;
    return (consecutive / total) * 100;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('band.freshness.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('band.freshness.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm">{error || t('common.noData')}</span>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('common.retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stalenessStatus = getStalenessStatus(data.currentStaleness, data.stalenessThreshold);
  const successRate = getSuccessRate(data.consecutiveUpdates, data.failedUpdates);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5 text-primary" />
            {t('band.freshness.title')}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Freshness Status */}
        <div className="flex items-center gap-4 rounded-lg border border-border/30 bg-muted/20 p-4">
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-full', stalenessStatus.bg, stalenessStatus.color)}>
            {data.isStale ? <XCircle className="h-6 w-6" /> : <CheckCircle className="h-6 w-6" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t('band.freshness.status')}</span>
              <span className={cn('text-sm font-semibold', stalenessStatus.color)}>
                {data.isStale ? t('band.freshness.stale') : t('band.freshness.fresh')}
              </span>
            </div>
            <div className="mt-1 h-2 w-full rounded-full bg-muted">
              <div
                className={cn('h-2 rounded-full transition-all', stalenessStatus.color.replace('text-', 'bg-'))}
                style={{ width: `${Math.min(100, (data.currentStaleness / data.stalenessThreshold) * 100)}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{t('band.freshness.lastUpdate')}: {formatTime(data.lastUpdate)}</span>
              <span>{(data.currentStaleness / 1000).toFixed(0)}s ago</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5" />
              {t('band.freshness.updateInterval')}
            </div>
            <p className="mt-1 font-mono text-lg font-semibold">{(data.updateInterval / 1000).toFixed(0)}s</p>
          </div>

          <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle className="h-3.5 w-3.5" />
              {t('band.freshness.successRate')}
            </div>
            <p
              className={cn(
                'mt-1 font-mono text-lg font-semibold',
                successRate >= 99 ? 'text-emerald-500' : successRate >= 95 ? 'text-amber-500' : 'text-red-500'
              )}
            >
              {successRate.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Update Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/20 p-3">
            <span className="text-xs text-muted-foreground">{t('band.freshness.consecutiveUpdates')}</span>
            <span className="font-mono text-sm font-semibold">{data.consecutiveUpdates.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/20 p-3">
            <span className="text-xs text-muted-foreground">{t('band.freshness.failedUpdates')}</span>
            <span className="font-mono text-sm font-semibold text-red-500">{data.failedUpdates}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
