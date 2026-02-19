'use client';

import { useState, useEffect, useCallback } from 'react';

import { RefreshCw, Database, Activity, Shield } from 'lucide-react';

import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { RefreshIndicator } from '@/components/ui/RefreshIndicator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataSourceList } from '@/features/oracle/band';
import type { DataSource } from '@/features/oracle/band';
import { useI18n } from '@/i18n';
import { fetchApiData } from '@/shared/utils';

interface SourcesResponse {
  sources: DataSource[];
  summary: {
    total: number;
    active: number;
    inactive: number;
    evmCount: number;
    cosmosCount: number;
    avgReliability: number;
  };
}

export default function BandSourcesPage() {
  const { t } = useI18n();
  const [data, setData] = useState<SourcesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [chainFilter, setChainFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (typeFilter !== 'all') {
        params.append('type', typeFilter);
      }
      if (chainFilter !== 'all') {
        params.append('chain', chainFilter);
      }
      const response = await fetchApiData<SourcesResponse>(
        `/api/oracle/band/sources?${params.toString()}`,
      );
      setData(response);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data sources');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, chainFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const breadcrumbItems = [
    { label: t('nav.oracle'), href: '/oracle' },
    { label: 'Band Protocol', href: '/oracle/band' },
    { label: t('band.sources.pageTitle') },
  ];

  const supportedChains = [
    'ethereum',
    'polygon',
    'arbitrum',
    'optimism',
    'avalanche',
    'bsc',
    'cosmos',
    'osmosis',
  ];

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6">
      <Breadcrumb items={breadcrumbItems} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl lg:text-3xl">
            <Database className="h-6 w-6 text-orange-600" />
            <span>{t('band.sources.pageTitle')}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('band.sources.pageDescription')}</p>
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
          title={t('band.sources.failedToLoad')}
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
                    {t('band.sources.total')}
                  </span>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-2 text-2xl font-bold">{data.summary.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {t('band.sources.active')}
                  </span>
                  <Activity className="h-4 w-4 text-green-500" />
                </div>
                <div className="mt-2 text-2xl font-bold text-green-600">{data.summary.active}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {t('band.sources.avgReliability')}
                  </span>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-2 text-2xl font-bold">
                  {data.summary.avgReliability.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {t('band.sources.evmVsCosmos')}
                  </span>
                </div>
                <div className="mt-2 text-2xl font-bold">
                  {data.summary.evmCount} / {data.summary.cosmosCount}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('band.sources.filterByType')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={typeFilter} onValueChange={setTypeFilter}>
                  <TabsList>
                    <TabsTrigger value="all">{t('common.all')}</TabsTrigger>
                    <TabsTrigger value="evm">EVM</TabsTrigger>
                    <TabsTrigger value="cosmos">Cosmos</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('band.sources.filterByChain')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={chainFilter} onValueChange={setChainFilter}>
                  <TabsList className="flex-wrap">
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
          </div>

          <DataSourceList
            sources={data.sources}
            loading={loading}
            chain={chainFilter !== 'all' ? chainFilter : undefined}
            symbol={undefined}
          />

          <Card>
            <CardHeader>
              <CardTitle>{t('band.sources.sourceHealth')}</CardTitle>
              <CardDescription>{t('band.sources.sourceHealthDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {t('band.sources.reliabilityDistribution')}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    {
                      range: '90-100%',
                      count: data.sources.filter((s) => s.reliabilityScore >= 90).length,
                      color: 'bg-green-500',
                    },
                    {
                      range: '70-89%',
                      count: data.sources.filter(
                        (s) => s.reliabilityScore >= 70 && s.reliabilityScore < 90,
                      ).length,
                      color: 'bg-yellow-500',
                    },
                    {
                      range: '50-69%',
                      count: data.sources.filter(
                        (s) => s.reliabilityScore >= 50 && s.reliabilityScore < 70,
                      ).length,
                      color: 'bg-orange-500',
                    },
                    {
                      range: '30-49%',
                      count: data.sources.filter(
                        (s) => s.reliabilityScore >= 30 && s.reliabilityScore < 50,
                      ).length,
                      color: 'bg-red-400',
                    },
                    {
                      range: '0-29%',
                      count: data.sources.filter((s) => s.reliabilityScore < 30).length,
                      color: 'bg-red-600',
                    },
                  ].map((item) => (
                    <div key={item.range} className="text-center">
                      <div
                        className={`mx-auto h-16 w-8 rounded ${item.color}`}
                        style={{ opacity: item.count > 0 ? 1 : 0.2 }}
                      />
                      <div className="mt-1 text-xs text-muted-foreground">{item.range}</div>
                      <div className="text-sm font-medium">{item.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
