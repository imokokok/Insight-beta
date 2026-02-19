'use client';

import { useState, useEffect, useCallback } from 'react';

import { RefreshCw, GitBranch, Activity } from 'lucide-react';

import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { RefreshIndicator } from '@/components/ui/RefreshIndicator';
import { Skeleton } from '@/components/ui/skeleton';
import { BridgeStatusCard } from '@/features/oracle/band';
import type { Bridge } from '@/features/oracle/band';
import { useI18n } from '@/i18n';
import { fetchApiData } from '@/shared/utils';

interface BridgesResponse {
  bridges: Bridge[];
  summary: {
    total: number;
    active: number;
    inactive: number;
    degraded: number;
    totalTransfers: number;
    avgLatency: number;
  };
}

export default function BandBridgesPage() {
  const { t } = useI18n();
  const [data, setData] = useState<BridgesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      const response = await fetchApiData<BridgesResponse>(
        `/api/oracle/band/bridges?${params.toString()}`,
      );
      setData(response);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bridges');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const breadcrumbItems = [
    { label: t('nav.oracle'), href: '/oracle' },
    { label: 'Band Protocol', href: '/oracle/band' },
    { label: t('band.bridges.pageTitle') },
  ];

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6">
      <Breadcrumb items={breadcrumbItems} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl lg:text-3xl">
            <GitBranch className="h-6 w-6 text-orange-600" />
            <span>{t('band.bridges.pageTitle')}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('band.bridges.pageDescription')}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {['all', 'active', 'inactive', 'degraded'].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(status)}
              >
                {t(`band.bridges.status.${status}`)}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
          <RefreshIndicator
            lastUpdated={lastUpdated}
            isRefreshing={loading}
            onRefresh={fetchData}
          />
        </div>
      </div>

      {error && (
        <ErrorBanner
          error={new Error(error)}
          onRetry={fetchData}
          title={t('band.bridges.failedToLoad')}
          isRetrying={loading}
        />
      )}

      {loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="mt-2 h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {t('band.bridges.total')}
                  </span>
                  <GitBranch className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-2 text-2xl font-bold">{data.summary.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {t('band.bridges.active')}
                  </span>
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                </div>
                <div className="mt-2 text-2xl font-bold text-green-600">{data.summary.active}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {t('band.bridges.totalTransfers')}
                  </span>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-2 text-2xl font-bold">
                  {data.summary.totalTransfers.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {t('band.bridges.avgLatency')}
                  </span>
                </div>
                <div className="mt-2 text-2xl font-bold">{data.summary.avgLatency}ms</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('band.bridges.bridgeList')}</CardTitle>
              <CardDescription>
                {t('band.bridges.showingBridges', { count: data.bridges.length })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.bridges.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <GitBranch className="mx-auto h-12 w-12 opacity-50" />
                  <p className="mt-2">{t('band.bridges.noBridges')}</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.bridges.map((bridge) => (
                    <BridgeStatusCard key={bridge.bridgeId} bridge={bridge} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('band.bridges.chainConnectivity')}</CardTitle>
              <CardDescription>{t('band.bridges.chainConnectivityDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {[
                  'ethereum',
                  'polygon',
                  'arbitrum',
                  'optimism',
                  'avalanche',
                  'bsc',
                  'fantom',
                  'cosmos',
                  'osmosis',
                  'juno',
                ].map((chain) => {
                  const isActive = data.bridges.some(
                    (b) =>
                      (b.sourceChain === chain || b.destinationChain === chain) &&
                      b.status === 'active',
                  );
                  return (
                    <Badge
                      key={chain}
                      variant="secondary"
                      className={`capitalize ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {chain}
                      {isActive && <span className="ml-1 text-xs">●</span>}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
