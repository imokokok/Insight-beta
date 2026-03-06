'use client';

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';

import {
  Database,
  Activity,
  Shield,
  Users,
  Fuel,
  LayoutDashboard,
  Coins,
  Server,
  LineChart,
  Link2,
} from 'lucide-react';

import { ContentSection, ContentGrid } from '@/components/common';
import {
  ProtocolPageLayout,
  TabPanelWrapper,
  type TabItem,
  type KpiCardData,
} from '@/components/oracle/layouts/ProtocolPageLayout';
import { Badge } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { OracleAlertPanel } from '@/features/alerts/components';
import type { ChainlinkFeed, Operator, OcrRound } from '@/features/oracle/chainlink/types';
import { useI18n } from '@/i18n';
import { fetchApiData } from '@/shared/utils';
import type { NetworkHealthStatus } from '@/types/common';

const ChainlinkPriceHistory = lazy(() =>
  import('@/features/oracle/chainlink/components/ChainlinkPriceHistory').then((mod) => ({
    default: mod.ChainlinkPriceHistory,
  })),
);
const HistoricalTrendsDashboard = lazy(() =>
  import('@/features/oracle/chainlink/components/historical/HistoricalTrendsDashboard').then((mod) => ({
    default: mod.HistoricalTrendsDashboard,
  })),
);
const FeedQualityAnalysis = lazy(() =>
  import('@/features/oracle/chainlink/components/FeedQualityAnalysis').then((mod) => ({
    default: mod.FeedQualityAnalysis,
  })),
);
const ChainlinkGasCostAnalysis = lazy(() =>
  import('@/features/oracle/chainlink/components/ChainlinkGasCostAnalysis').then((mod) => ({
    default: mod.ChainlinkGasCostAnalysis,
  })),
);
const HeartbeatMonitor = lazy(() =>
  import('@/features/oracle/chainlink/components/HeartbeatMonitor').then((mod) => ({
    default: mod.HeartbeatMonitor,
  })),
);
const DeviationTriggerStats = lazy(() =>
  import('@/features/oracle/chainlink/components/DeviationTriggerStats').then((mod) => ({
    default: mod.DeviationTriggerStats,
  })),
);
const ChainlinkCrossChainComparison = lazy(() =>
  import('@/features/oracle/chainlink/components/CrossChainPriceComparison').then((mod) => ({
    default: mod.ChainlinkCrossChainComparison,
  })),
);
const FeedAggregation = lazy(() =>
  import('@/features/oracle/chainlink/components/FeedAggregation').then((mod) => ({
    default: mod.FeedAggregation,
  })),
);
const OcrRoundMonitor = lazy(() =>
  import('@/features/oracle/chainlink/components/OcrRoundMonitor').then((mod) => ({
    default: mod.OcrRoundMonitor,
  })),
);
const OperatorList = lazy(() =>
  import('@/features/oracle/chainlink/components/OperatorList').then((mod) => ({
    default: mod.OperatorList,
  })),
);

interface FeedsApiResponse {
  feeds: ChainlinkFeed[];
  metadata: {
    total: number;
    active: number;
    stale: number;
    chain: string;
    source: string;
    lastUpdated: string;
  };
}

interface OperatorsApiResponse {
  operators: Operator[];
  metadata: {
    total: number;
    online: number;
    offline: number;
    source: string;
    lastUpdated: string;
  };
}

interface ChainlinkOverviewResponse {
  feeds: Array<{
    pair: string;
    status: string;
    decimals: number;
    lastUpdate: string;
  }>;
  metadata: {
    totalFeeds: number;
    activeFeeds: number;
    supportedChains: string[];
  };
}

interface ChainlinkDashboardState {
  overviewData: ChainlinkOverviewResponse | null;
  feeds: ChainlinkFeed[];
  operators: Operator[];
  ocrRounds: OcrRound[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  autoRefreshEnabled: boolean;
  refreshInterval: number;
  timeUntilRefresh: number;
}

export default function ChainlinkPage() {
  const { t } = useI18n();

  const [state, setState] = useState<ChainlinkDashboardState>({
    overviewData: null,
    feeds: [],
    operators: [],
    ocrRounds: [],
    loading: true,
    error: null,
    lastUpdated: null,
    autoRefreshEnabled: false,
    refreshInterval: 30000,
    timeUntilRefresh: 0,
  });

  const updateState = useCallback((partial: Partial<ChainlinkDashboardState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const fetchInitialData = useCallback(async () => {
    try {
      updateState({ loading: true, error: null });

      const [overviewRes, feedsRes, operatorsRes] = await Promise.all([
        fetchApiData<ChainlinkOverviewResponse>('/api/oracle/chainlink/overview'),
        fetchApiData<FeedsApiResponse>('/api/oracle/chainlink/feeds'),
        fetchApiData<OperatorsApiResponse>('/api/oracle/chainlink/operators'),
      ]);

      updateState({
        overviewData: overviewRes,
        feeds: feedsRes?.feeds ?? [],
        operators: operatorsRes?.operators ?? [],
        lastUpdated: new Date(),
      });
    } catch (err) {
      updateState({ error: err instanceof Error ? err.message : 'Failed to fetch data' });
    } finally {
      updateState({ loading: false });
    }
  }, [updateState]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (!state.autoRefreshEnabled) {
      updateState({ timeUntilRefresh: 0 });
      return;
    }

    updateState({ timeUntilRefresh: state.refreshInterval });
    const interval = setInterval(() => {
      setState((prev) => {
        if (prev.timeUntilRefresh <= 1000) {
          fetchInitialData();
          return { ...prev, timeUntilRefresh: prev.refreshInterval };
        }
        return { ...prev, timeUntilRefresh: prev.timeUntilRefresh - 1000 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.autoRefreshEnabled, state.refreshInterval, fetchInitialData, updateState]);

  const feeds = state.feeds;
  const operators = state.operators;
  const overviewData = state.overviewData;

  const totalFeeds = overviewData?.metadata?.totalFeeds ?? feeds.length;
  const activeNodes = operators.filter((op) => op.online).length;
  const avgLatency =
    operators.length > 0
      ? Math.round(operators.reduce((sum, op) => sum + op.responseTime, 0) / operators.length)
      : 0;

  const healthStatus: NetworkHealthStatus = useMemo(() => {
    if (!overviewData) return 'healthy';
    const activeRatio = totalFeeds > 0 ? activeNodes / totalFeeds : 0;
    if (activeRatio > 0.8 && avgLatency < 500) return 'healthy';
    if (activeRatio > 0.5 || avgLatency < 1000) return 'warning';
    return 'critical';
  }, [overviewData, totalFeeds, activeNodes, avgLatency]);

  const kpiCards: KpiCardData[] = useMemo(() => {
    if (!overviewData) {
      return [
        { value: '-', label: t('chainlink.kpi.totalFeeds'), trend: 'neutral' },
        { value: '-', label: t('chainlink.kpi.activeNodes'), trend: 'neutral' },
        { value: '-', label: t('chainlink.kpi.avgLatency'), trend: 'neutral' },
        { value: '-', label: t('chainlink.kpi.ocrRounds'), trend: 'neutral' },
      ];
    }

    return [
      {
        value: totalFeeds,
        label: t('chainlink.kpi.totalFeeds'),
        trend: 'neutral',
        status: 'success',
      },
      {
        value: activeNodes,
        label: t('chainlink.kpi.activeNodes'),
        trend: 'up',
        status: activeNodes > 0 ? 'success' : 'warning',
      },
      {
        value: `${avgLatency}ms`,
        label: t('chainlink.kpi.avgLatency'),
        trend: 'down',
        status: avgLatency < 200 ? 'success' : avgLatency < 500 ? 'warning' : 'error',
      },
      {
        value: 0,
        label: t('chainlink.kpi.ocrRounds'),
        trend: 'neutral',
      },
    ];
  }, [overviewData, totalFeeds, activeNodes, avgLatency, t]);

  const tabs: TabItem[] = useMemo(
    () => [
      {
        id: 'overview',
        label: t('chainlink.tabs.overview'),
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
      { id: 'feeds', label: t('chainlink.tabs.feeds'), icon: <Coins className="h-4 w-4" /> },
      { id: 'nodes', label: t('chainlink.tabs.nodes'), icon: <Server className="h-4 w-4" /> },
      { id: 'costs', label: t('chainlink.tabs.costs'), icon: <Fuel className="h-4 w-4" /> },
      {
        id: 'advanced',
        label: t('chainlink.tabs.advanced'),
        icon: <LineChart className="h-4 w-4" />,
      },
    ],
    [t],
  );

  const activeFeedsCount = useMemo(() => {
    return feeds.filter((feed) => {
      const lastUpdateTime = new Date(feed.lastUpdate).getTime();
      const heartbeatMs = feed.heartbeat * 1000;
      const thresholdMs = heartbeatMs * 2;
      return Date.now() - lastUpdateTime < thresholdMs;
    }).length;
  }, [feeds]);

  const onlineOperatorsCount = useMemo(() => {
    return operators.filter((op) => op.online).length;
  }, [operators]);

  const handleExport = useCallback(() => {
    const exportData = {
      overview: overviewData,
      feeds,
      operators,
      generatedAt: state.lastUpdated?.toISOString() || new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chainlink-dashboard-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [overviewData, feeds, operators, state.lastUpdated]);

  return (
    <>
      <ProtocolPageLayout
        protocol="chainlink"
        title="Chainlink"
        icon={<Link2 className="h-5 w-5 text-blue-600" />}
        description={t('chainlink.pageDescription')}
        healthStatus={healthStatus}
        kpiCards={kpiCards}
        tabs={tabs}
        loading={state.loading}
        error={state.error}
        lastUpdated={state.lastUpdated}
        autoRefreshEnabled={state.autoRefreshEnabled}
        onToggleAutoRefresh={() => updateState({ autoRefreshEnabled: !state.autoRefreshEnabled })}
        refreshInterval={state.refreshInterval}
        onRefreshIntervalChange={(interval) => updateState({ refreshInterval: interval })}
        timeUntilRefresh={state.timeUntilRefresh}
        onRefresh={fetchInitialData}
        onExport={handleExport}
      >
      <TabPanelWrapper tabId="overview">
        <div className="space-y-3">
          <ContentSection
            title={t('chainlink.overview.title')}
            description={t('chainlink.overview.description')}
          >
            <p className="text-sm text-muted-foreground">{t('chainlink.overview.introduction')}</p>
          </ContentSection>

          <ContentSection title={t('chainlink.features.title')}>
            <ContentGrid columns={3} gap="sm">
              <div className="flex items-center gap-2.5 border-b border-border/30 pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-3">
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {t('chainlink.features.ocr.label')}
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {t('chainlink.features.ocr.value')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 border-b border-border/30 pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-3">
                <div className="rounded-lg bg-green-500/10 p-2">
                  <Users className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {t('chainlink.features.operators.label')}
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {t('chainlink.features.operators.value')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-purple-500/10 p-2">
                  <Shield className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {t('chainlink.features.security.label')}
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {t('chainlink.features.security.value')}
                  </p>
                </div>
              </div>
            </ContentGrid>
          </ContentSection>

          <ContentSection
            title={t('chainlink.supportedChains.title')}
            description={t('chainlink.supportedChains.description')}
          >
            <div className="flex flex-wrap gap-1.5">
              {overviewData?.metadata?.supportedChains?.map((chain) => (
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
              <Suspense fallback={<Skeleton className="h-80 w-full" />}>
                <ChainlinkPriceHistory />
              </Suspense>
            </div>
            <div className="space-y-3 lg:col-span-1 xl:col-span-1">
              <div className="border-b border-border/30 pb-3">
                <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold">
                  <Database className="h-3.5 w-3.5 text-primary" />
                  {t('chainlink.feedStatus.title')}
                </h4>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t('chainlink.feedStatus.total')}</span>
                    <span className="font-mono font-semibold">{feeds.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t('chainlink.feedStatus.active')}
                    </span>
                    <Badge variant="success" size="sm">
                      {activeFeedsCount}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t('chainlink.feedStatus.inactive')}
                    </span>
                    <Badge variant="warning" size="sm">
                      {feeds.length - activeFeedsCount}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="border-b border-border/30 pb-3">
                <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  {t('chainlink.nodeStatus.title')}
                </h4>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t('chainlink.nodeStatus.total')}</span>
                    <span className="font-mono font-semibold">{operators.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t('chainlink.nodeStatus.online')}
                    </span>
                    <Badge variant="success" size="sm">
                      {onlineOperatorsCount}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t('chainlink.nodeStatus.offline')}
                    </span>
                    <Badge variant="destructive" size="sm">
                      {operators.length - onlineOperatorsCount}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TabPanelWrapper>

      <TabPanelWrapper tabId="feeds">
        <div className="space-y-4">
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <FeedAggregation />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <OcrRoundMonitor />
          </Suspense>
        </div>
      </TabPanelWrapper>

      <TabPanelWrapper tabId="nodes">
        <div className="space-y-4">
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <OperatorList collapsible />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <HeartbeatMonitor collapsible />
          </Suspense>
        </div>
      </TabPanelWrapper>

      <TabPanelWrapper tabId="costs">
        <div className="space-y-4">
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <ChainlinkGasCostAnalysis collapsible />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <DeviationTriggerStats collapsible />
          </Suspense>
        </div>
      </TabPanelWrapper>

      <TabPanelWrapper tabId="advanced">
        <div className="space-y-4">
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <HistoricalTrendsDashboard defaultTimeRange="24h" />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <FeedQualityAnalysis collapsible />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <ChainlinkCrossChainComparison collapsible />
          </Suspense>
        </div>
      </TabPanelWrapper>
    </ProtocolPageLayout>
    
    <OracleAlertPanel
      protocol="chainlink"
      defaultExpanded={false}
      position="floating"
    />
    </>
  );
}
