'use client';

import { useState, useCallback, useMemo } from 'react';

import { useRouter } from 'next/navigation';

import {
  Server,
  TrendingUp,
  Database,
  Shield,
  LayoutDashboard,
  GitCompare,
  Activity,
} from 'lucide-react';

import { ContentSection, ContentGrid } from '@/components/common';
import { useProtocolData } from '@/components/oracle/hooks/useProtocolData';
import {
  ProtocolPageLayout,
  TabPanelWrapper,
  type TabItem,
  type KpiCardData,
} from '@/components/oracle/layouts/ProtocolPageLayout';
import { Badge } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import {
  PriceUpdateMonitor,
  DapiList,
  SignatureVerifyPanel,
  GasCostAnalysis,
  CrossProtocolComparison,
  AlertConfigPanel,
} from '@/features/oracle/api3';
import { useI18n } from '@/i18n';
import { formatTime } from '@/shared/utils/format/date';
import { cn } from '@/shared/utils/ui';
import type { NetworkHealthStatus } from '@/types/common';

import type { Route } from 'next';

interface Airnode {
  address: string;
  chain: string;
  online: boolean;
  lastHeartbeat: string | null;
  responseTime: number;
  dataFeeds: string[];
}

interface AirnodesResponse {
  airnodes: Airnode[];
  metadata: {
    total: number;
    online: number;
    offline: number;
    supportedChains: string[];
    filter: string;
  };
}

interface OevResponse {
  events: Array<{
    id: string;
    dapiName: string;
    chain: string;
    feedId: string;
    value: string;
    timestamp: string;
    blockNumber?: number;
  }>;
  metadata: {
    total: number;
    timeRange: string;
    cutoffTime: string;
    queriedChains: string[];
    queriedDapis: string[];
    supportedChains: string[];
  };
}

interface DapisResponse {
  dapis: Array<{
    symbol: string;
    feedId: string;
    chain: string;
    contractAddress: string;
    dataFeedAddress: string | null;
    decimals: number;
    status: 'active' | 'inactive' | 'unknown';
  }>;
  metadata: {
    total: number;
    active: number;
    inactive: number;
    unknown: number;
    supportedChains: string[];
    availableSymbols: string[];
  };
}

interface Api3DashboardData {
  overviewStats: {
    totalAirnodes: number;
    onlineAirnodes: number;
    priceUpdateEvents: number;
    totalDapis: number;
  } | null;
  airnodesData: AirnodesResponse | null;
  oevData: OevResponse | null;
  dapisData: DapisResponse | null;
}

const getTabs = (t: (key: string) => string): TabItem[] => [
  { id: 'overview', label: t('api3.tabs.overview'), icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'airnodes', label: t('api3.tabs.airnodes'), icon: <Server className="h-4 w-4" /> },
  { id: 'data', label: t('api3.tabs.data'), icon: <Database className="h-4 w-4" /> },
  { id: 'analysis', label: t('api3.tabs.analysis'), icon: <GitCompare className="h-4 w-4" /> },
  { id: 'tools', label: t('api3.tabs.tools'), icon: <Shield className="h-4 w-4" /> },
];

export default function Api3Page() {
  const { t } = useI18n();
  const router = useRouter();
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30000);

  const TABS = useMemo(() => getTabs(t), [t]);

  const { data, isLoading, isRefreshing, isError, error, lastUpdated, refresh } =
    useProtocolData<Api3DashboardData>({
      protocol: 'api3',
      endpoint: '/api/oracle/api3/dashboard',
      refreshInterval: autoRefreshEnabled ? refreshInterval : 0,
      enabled: true,
      transformData: (raw: unknown): Api3DashboardData => {
        const response = raw as {
          airnodes?: AirnodesResponse;
          oev?: OevResponse;
          dapis?: DapisResponse;
        };

        const airnodesData = response.airnodes ?? null;
        const oevData = response.oev ?? null;
        const dapisData = response.dapis ?? null;

        const overviewStats =
          airnodesData || oevData || dapisData
            ? {
                totalAirnodes: airnodesData?.metadata?.total ?? 0,
                onlineAirnodes: airnodesData?.metadata?.online ?? 0,
                priceUpdateEvents: oevData?.metadata?.total ?? 0,
                totalDapis: dapisData?.metadata?.total ?? 0,
              }
            : null;

        return {
          overviewStats,
          airnodesData,
          oevData,
          dapisData,
        };
      },
    });

  const healthStatus: NetworkHealthStatus = useMemo(() => {
    if (!data?.overviewStats) return 'healthy';
    const onlineRatio =
      data.overviewStats.totalAirnodes > 0
        ? data.overviewStats.onlineAirnodes / data.overviewStats.totalAirnodes
        : 0;
    if (onlineRatio >= 0.9) return 'healthy';
    if (onlineRatio >= 0.7) return 'warning';
    return 'critical';
  }, [data?.overviewStats]);

  const kpiCards: KpiCardData[] = useMemo(() => {
    if (!data?.overviewStats) {
      return [
        { value: '-', label: t('api3.kpi.totalAirnodes'), trend: 'neutral', status: 'neutral' },
        { value: '-', label: t('api3.kpi.onlineAirnodes'), trend: 'neutral', status: 'neutral' },
        { value: '-', label: t('api3.kpi.priceUpdates'), trend: 'neutral', status: 'neutral' },
        { value: '-', label: t('api3.kpi.totalDapis'), trend: 'neutral', status: 'neutral' },
      ];
    }

    return [
      {
        value: data.overviewStats.totalAirnodes,
        label: t('api3.kpi.totalAirnodes'),
        trend: 'neutral',
        status: 'neutral',
      },
      {
        value: data.overviewStats.onlineAirnodes,
        label: t('api3.kpi.onlineAirnodes'),
        trend: 'up',
        status: data.overviewStats.onlineAirnodes > 0 ? 'success' : 'warning',
      },
      {
        value: data.overviewStats.priceUpdateEvents,
        label: t('api3.kpi.priceUpdates'),
        trend: 'up',
        status: 'success',
      },
      {
        value: data.overviewStats.totalDapis,
        label: t('api3.kpi.totalDapis'),
        trend: 'neutral',
        status: 'neutral',
      },
    ];
  }, [data?.overviewStats, t]);

  const breadcrumbItems = useMemo(
    () => [{ label: t('nav.protocols'), href: '/protocols' }, { label: 'API3' }],
    [t],
  );

  const handleToggleAutoRefresh = useCallback(() => {
    setAutoRefreshEnabled((prev) => !prev);
  }, []);

  const handleRefreshIntervalChange = useCallback((interval: number) => {
    setRefreshInterval(interval);
  }, []);

  const handleExport = useCallback(() => {
    if (!data) return;

    const exportData = {
      overviewStats: data.overviewStats,
      airnodesData: data.airnodesData,
      oevData: data.oevData,
      dapisData: data.dapisData,
      generatedAt: lastUpdated?.toISOString() || new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api3-dashboard-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [data, lastUpdated]);

  const getResponseTimeColor = (ms: number) => {
    if (ms < 100) return 'text-green-500';
    if (ms < 300) return 'text-yellow-500';
    return 'text-red-500';
  };

  const loading = isLoading || isRefreshing;

  return (
    <ProtocolPageLayout
      protocol="api3"
      title="API3"
      icon={<Server className="h-5 w-5" />}
      description={t('api3.pageDescription')}
      healthStatus={healthStatus}
      kpiCards={kpiCards}
      tabs={TABS}
      breadcrumbItems={breadcrumbItems}
      loading={isLoading}
      error={isError ? (error?.message ?? 'Failed to load data') : null}
      lastUpdated={lastUpdated}
      autoRefreshEnabled={autoRefreshEnabled}
      onToggleAutoRefresh={handleToggleAutoRefresh}
      refreshInterval={refreshInterval}
      onRefreshIntervalChange={handleRefreshIntervalChange}
      onRefresh={refresh}
      onExport={handleExport}
    >
      <TabPanelWrapper tabId="overview">
        <div className="space-y-3">
          <ContentSection
            title={t('api3.overview.title')}
            description={t('api3.overview.description')}
          >
            <p className="text-sm text-muted-foreground">{t('api3.overview.content')}</p>
          </ContentSection>

          <ContentSection title={t('api3.features.title')}>
            <ContentGrid columns={3} gap="sm">
              <div className="flex items-center gap-2.5 border-b border-border/30 pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-3">
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <Server className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {t('api3.features.airnode.label')}
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {t('api3.features.airnode.value')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 border-b border-border/30 pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-3">
                <div className="rounded-lg bg-green-500/10 p-2">
                  <Shield className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {t('api3.features.signature.label')}
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {t('api3.features.signature.value')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-purple-500/10 p-2">
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {t('api3.features.priceMonitor.label')}
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {t('api3.features.priceMonitor.value')}
                  </p>
                </div>
              </div>
            </ContentGrid>
          </ContentSection>

          <ContentSection
            title={t('api3.supportedChains.title')}
            description={t('api3.supportedChains.description')}
          >
            <div className="flex flex-wrap gap-1.5">
              {data?.airnodesData?.metadata?.supportedChains?.map((chain) => (
                <Badge key={chain} variant="secondary" className="text-xs capitalize">
                  {chain}
                </Badge>
              )) || (
                <>
                  <Badge variant="secondary" className="text-xs">
                    Ethereum
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Polygon
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Arbitrum
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Optimism
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Avalanche
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    BSC
                  </Badge>
                </>
              )}
            </div>
          </ContentSection>

          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            <div className="lg:col-span-1 xl:col-span-2">
              <div className="border-b border-border/30 pb-3">
                <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                  {t('api3.priceUpdate.totalUpdates')}
                </h4>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t('api3.priceUpdate.totalEvents')}
                    </span>
                    <span className="font-mono font-semibold">
                      {data?.oevData?.metadata?.total ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t('api3.priceUpdate.involvedDapis')}
                    </span>
                    <Badge variant="secondary" size="sm">
                      {data?.oevData?.metadata?.queriedDapis?.length ?? 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t('api3.priceUpdate.involvedChains')}
                    </span>
                    <Badge variant="secondary" size="sm">
                      {data?.oevData?.metadata?.queriedChains?.length ?? 0}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3 lg:col-span-1 xl:col-span-1">
              <div className="border-b border-border/30 pb-3">
                <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold">
                  <Server className="h-3.5 w-3.5 text-primary" />
                  {t('api3.airnode.statusOverview')}
                </h4>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t('api3.airnode.totalAirnodes')}</span>
                    <span className="font-mono font-semibold">
                      {data?.airnodesData?.metadata?.total ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t('api3.airnode.onlineAirnodes')}
                    </span>
                    <Badge variant="success" size="sm">
                      {data?.airnodesData?.metadata?.online ?? 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t('api3.airnode.offlineAirnodes')}
                    </span>
                    <Badge variant="destructive" size="sm">
                      {data?.airnodesData?.metadata?.offline ?? 0}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="border-b border-border/30 pb-3">
                <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold">
                  <Database className="h-3.5 w-3.5 text-primary" />
                  {t('api3.dapiStatus.title')}
                </h4>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t('api3.dapiStatus.totalDapis')}</span>
                    <span className="font-mono font-semibold">
                      {data?.dapisData?.metadata?.total ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t('api3.dapiStatus.activeDapis')}
                    </span>
                    <Badge variant="success" size="sm">
                      {data?.dapisData?.metadata?.active ?? 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t('api3.dapiStatus.inactiveDapis')}
                    </span>
                    <Badge variant="warning" size="sm">
                      {data?.dapisData?.metadata?.inactive ?? 0}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TabPanelWrapper>

      <TabPanelWrapper tabId="airnodes">
        <div className="space-y-4">
          {loading && !data?.airnodesData ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : data?.airnodesData ? (
            <>
              {data.airnodesData.airnodes.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Server className="mx-auto h-12 w-12 opacity-50" />
                  <p className="mt-2">{t('api3.dapi.noData')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.airnodesData.airnodes.map((airnode, index) => (
                    <div
                      key={index}
                      className="flex cursor-pointer items-center justify-between border-b border-border/30 pb-3 pt-1 transition-colors hover:bg-muted/20"
                      onClick={() =>
                        router.push(`/protocols/api3/airnode/${airnode.address}` as Route)
                      }
                    >
                      <div className="flex items-center gap-4">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <Server className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{t('api3.airnode.title')}</span>
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                                airnode.online
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                              )}
                            >
                              {airnode.online ? t('common.online') : t('common.offline')}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {t('api3.airnode.lastHeartbeat')}:{' '}
                            {airnode.lastHeartbeat ? formatTime(airnode.lastHeartbeat) : '-'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{t('api3.airnode.chain')}</p>
                          <Badge variant="secondary" className="text-xs">
                            {airnode.chain}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {t('api3.airnode.responseTime')}
                          </p>
                          <p
                            className={cn(
                              'font-medium',
                              getResponseTimeColor(airnode.responseTime),
                            )}
                          >
                            {airnode.responseTime}ms
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>
      </TabPanelWrapper>

      <TabPanelWrapper tabId="data">
        <div className="space-y-4">
          <PriceUpdateMonitor loading={loading} />
          <DapiList />
        </div>
      </TabPanelWrapper>

      <TabPanelWrapper tabId="analysis">
        <div className="space-y-4">
          <GasCostAnalysis />
          <CrossProtocolComparison />
        </div>
      </TabPanelWrapper>

      <TabPanelWrapper tabId="tools">
        <div className="space-y-4">
          <SignatureVerifyPanel />
          <AlertConfigPanel />
        </div>
      </TabPanelWrapper>
    </ProtocolPageLayout>
  );
}
