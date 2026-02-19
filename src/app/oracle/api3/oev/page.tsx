'use client';

import { useState, useEffect, useCallback } from 'react';

import { RefreshCw, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';

import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { RefreshIndicator } from '@/components/ui/RefreshIndicator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OevOverview } from '@/features/oracle/api3';
import type { OevEvent, OevOverviewData } from '@/features/oracle/api3';
import { useI18n } from '@/i18n';
import { fetchApiData } from '@/shared/utils';

interface OevResponse {
  events: OevEvent[];
  overview: OevOverviewData;
}

export default function Api3OevPage() {
  const { t } = useI18n();
  const [data, setData] = useState<OevResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [timeRange, setTimeRange] = useState<string>('24h');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApiData<OevResponse>(
        `/api/oracle/api3/oev?timeRange=${timeRange}`,
      );
      setData(response);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch OEV data');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const breadcrumbItems = [
    { label: t('nav.oracle'), href: '/oracle' },
    { label: 'API3', href: '/oracle/api3' },
    { label: t('api3.oev.pageTitle') },
  ];

  const timeRangeOptions = [
    { value: '1h', label: '1H' },
    { value: '24h', label: '24H' },
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
  ];

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6">
      <Breadcrumb items={breadcrumbItems} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl lg:text-3xl">
            <TrendingUp className="h-6 w-6 text-purple-600" />
            <span>{t('api3.oev.pageTitle')}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('api3.oev.pageDescription')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={timeRange} onValueChange={setTimeRange}>
            <TabsList>
              {timeRangeOptions.map((option) => (
                <TabsTrigger key={option.value} value={option.value}>
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
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
          title={t('api3.oev.failedToLoad')}
          isRetrying={loading}
        />
      )}

      {loading && !data ? (
        <div className="space-y-6">
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
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {t('api3.oev.totalOev')}
                  </span>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-2 text-2xl font-bold text-purple-600">
                  ${data.overview.totalOev.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {t('api3.oev.totalEvents')}
                  </span>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-2 text-2xl font-bold">{data.overview.totalEvents}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {t('api3.oev.avgOevPerEvent')}
                  </span>
                </div>
                <div className="mt-2 text-2xl font-bold">
                  $
                  {data.overview.avgOevPerEvent?.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  }) || '0'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {t('api3.oev.affectedDapis')}
                  </span>
                </div>
                <div className="mt-2 text-2xl font-bold">{data.overview.affectedDapis || 0}</div>
              </CardContent>
            </Card>
          </div>

          <OevOverview overview={data.overview} events={data.events} loading={loading} />

          <Card>
            <CardHeader>
              <CardTitle>{t('api3.oev.recentEvents')}</CardTitle>
              <CardDescription>
                {t('api3.oev.showingEvents', { count: data.events.length })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.events.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <AlertCircle className="mx-auto h-12 w-12 opacity-50" />
                  <p className="mt-2">{t('api3.oev.noEvents')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.events.slice(0, 10).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <div className="font-medium">{event.dapiName}</div>
                        <div className="text-sm text-muted-foreground">
                          {event.chain} • Block {event.blockNumber.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-purple-600">
                          ${event.oevValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(event.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
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
