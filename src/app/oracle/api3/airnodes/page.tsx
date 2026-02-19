'use client';

import { useState, useEffect, useCallback } from 'react';

import { RefreshCw, Server, AlertCircle } from 'lucide-react';

import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { RefreshIndicator } from '@/components/ui/RefreshIndicator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AirnodeStatusCard } from '@/features/oracle/api3';
import type { Airnode } from '@/features/oracle/api3';
import { useI18n } from '@/i18n';
import { fetchApiData } from '@/shared/utils';

interface AirnodesResponse {
  airnodes: Airnode[];
  summary: {
    total: number;
    online: number;
    offline: number;
    avgResponseTime: number;
  };
}

export default function Api3AirnodesPage() {
  const { t } = useI18n();
  const [data, setData] = useState<AirnodesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [chainFilter, setChainFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (chainFilter !== 'all') {
        params.append('chain', chainFilter);
      }
      const response = await fetchApiData<AirnodesResponse>(
        `/api/oracle/api3/airnodes?${params.toString()}`,
      );
      setData(response);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch airnodes');
    } finally {
      setLoading(false);
    }
  }, [chainFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const breadcrumbItems = [
    { label: t('nav.oracle'), href: '/oracle' },
    { label: 'API3', href: '/oracle/api3' },
    { label: t('api3.airnodes.pageTitle') },
  ];

  const supportedChains = [
    'ethereum',
    'polygon',
    'arbitrum',
    'optimism',
    'avalanche',
    'bsc',
    'base',
  ];

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6">
      <Breadcrumb items={breadcrumbItems} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl lg:text-3xl">
            <Server className="h-6 w-6 text-blue-600" />
            <span>{t('api3.airnodes.pageTitle')}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('api3.airnodes.pageDescription')}</p>
        </div>
        <div className="flex items-center gap-2">
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
          title={t('api3.airnodes.failedToLoad')}
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
                    {t('api3.airnodes.total')}
                  </span>
                  <Server className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-2 text-2xl font-bold">{data.summary.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {t('api3.airnodes.online')}
                  </span>
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                </div>
                <div className="mt-2 text-2xl font-bold text-green-600">{data.summary.online}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {t('api3.airnodes.offline')}
                  </span>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </div>
                <div className="mt-2 text-2xl font-bold text-red-600">{data.summary.offline}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {t('api3.airnodes.avgResponseTime')}
                  </span>
                </div>
                <div className="mt-2 text-2xl font-bold">{data.summary.avgResponseTime}ms</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('api3.airnodes.filterByChain')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={chainFilter} onValueChange={setChainFilter}>
                <TabsList>
                  <TabsTrigger value="all">{t('common.all')}</TabsTrigger>
                  {supportedChains.map((chain) => (
                    <TabsTrigger key={chain} value={chain} className="capitalize">
                      {chain}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('api3.airnodes.airnodeList')}</CardTitle>
              <CardDescription>
                {t('api3.airnodes.showingAirnodes', { count: data.airnodes.length })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.airnodes.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Server className="mx-auto h-12 w-12 opacity-50" />
                  <p className="mt-2">{t('api3.airnodes.noAirnodes')}</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.airnodes.map((airnode, index) => (
                    <AirnodeStatusCard
                      key={`${airnode.airnodeAddress}-${index}`}
                      airnode={airnode}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
