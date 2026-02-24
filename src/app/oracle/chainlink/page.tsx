'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

import {
  RefreshCw,
  Database,
  Activity,
  Shield,
  Link2,
  Users,
  Fuel,
  LayoutDashboard,
  Coins,
  Server,
  LineChart,
} from 'lucide-react';

import { ContentSection, ContentGrid, ExportButton } from '@/components/common';
import { AutoRefreshControl } from '@/components/common/AutoRefreshControl';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { ErrorBanner } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { chainlinkExportConfig } from '@/features/oracle/chainlink';
import {
  TopStatusBar,
  KpiOverview,
  type NetworkHealthStatus,
  type TrendDirection,
  TabNavigation,
  TabContent,
  TabPanelWrapper,
  useTabNavigation,
  type TabItem,
} from '@/features/oracle/chainlink/components';
import {
  ChainlinkPriceHistory,
  FeedQualityAnalysis,
  ChainlinkGasCostAnalysis,
  HeartbeatMonitor,
  DeviationTriggerStats,
  CrossChainPriceComparison,
} from '@/features/oracle/chainlink/components';
import { FeedAggregation } from '@/features/oracle/chainlink/components/FeedAggregation';
import { OcrRoundMonitor } from '@/features/oracle/chainlink/components/OcrRoundMonitor';
import { OperatorList } from '@/features/oracle/chainlink/components/OperatorList';
import type { ChainlinkFeed, Operator, OcrRound } from '@/features/oracle/chainlink/types';
import { useI18n } from '@/i18n';
import { fetchApiData } from '@/shared/utils';

interface OverviewStats {
  totalFeeds: number;
  activeNodes: number;
  ocrRounds: number;
  avgLatency: number;
}

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
  overviewStats: OverviewStats | null;
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

  const TABS: TabItem[] = useMemo(
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

  const [state, setState] = useState<ChainlinkDashboardState>({
    overviewStats: null,
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

  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['overview']));

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

      const feeds = feedsRes.feeds ?? [];
      const operators = operatorsRes.operators ?? [];

      const overviewStats: OverviewStats = {
        totalFeeds: overviewRes.metadata?.totalFeeds ?? feeds.length,
        activeNodes: operators.filter((op) => op.online).length,
        ocrRounds: 0,
        avgLatency:
          operators.length > 0
            ? Math.round(operators.reduce((sum, op) => sum + op.responseTime, 0) / operators.length)
            : 0,
      };

      updateState({
        overviewStats,
        overviewData: overviewRes,
        feeds,
        operators,
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

  const handleTabChange = useCallback((tabId: string) => {
    setLoadedTabs((prev) => {
      if (!prev.has(tabId)) {
        return new Set([...prev, tabId]);
      }
      return prev;
    });
  }, []);

  const { activeTab, setActiveTab } = useTabNavigation({
    defaultTab: 'overview',
    tabs: TABS,
    onTabChange: handleTabChange,
    syncUrl: true,
    urlParamName: 'tab',
  });

  const handleExport = useCallback(() => {
    const exportData = {
      overviewStats: state.overviewStats,
      overviewData: state.overviewData,
      feeds: state.feeds,
      operators: state.operators,
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
  }, [state.overviewStats, state.overviewData, state.feeds, state.operators, state.lastUpdated]);

  const healthStatus: NetworkHealthStatus = useMemo(() => {
    if (!state.overviewStats) return 'healthy';
    const activeRatio =
      state.overviewStats.totalFeeds > 0
        ? state.overviewStats.activeNodes / state.overviewStats.totalFeeds
        : 0;
    if (activeRatio > 0.8 && state.overviewStats.avgLatency < 500) return 'healthy';
    if (activeRatio > 0.5 || state.overviewStats.avgLatency < 1000) return 'warning';
    return 'critical';
  }, [state.overviewStats]);

  const kpiData = useMemo(() => {
    if (!state.overviewStats) {
      return {
        totalFeeds: {
          value: '-',
          label: t('chainlink.kpi.totalFeeds'),
          trend: 'neutral' as TrendDirection,
        },
        activeNodes: {
          value: '-',
          label: t('chainlink.kpi.activeNodes'),
          trend: 'neutral' as TrendDirection,
        },
        avgLatency: {
          value: '-',
          label: t('chainlink.kpi.avgLatency'),
          trend: 'neutral' as TrendDirection,
        },
        ocrRounds: {
          value: '-',
          label: t('chainlink.kpi.ocrRounds'),
          trend: 'neutral' as TrendDirection,
        },
      };
    }

    return {
      totalFeeds: {
        value: state.overviewStats.totalFeeds,
        label: t('chainlink.kpi.totalFeeds'),
        trend: 'neutral' as TrendDirection,
        status: 'success' as const,
      },
      activeNodes: {
        value: state.overviewStats.activeNodes,
        label: t('chainlink.kpi.activeNodes'),
        trend: 'up' as TrendDirection,
        status: state.overviewStats.activeNodes > 0 ? ('success' as const) : ('warning' as const),
      },
      avgLatency: {
        value: `${state.overviewStats.avgLatency}ms`,
        label: t('chainlink.kpi.avgLatency'),
        trend: 'down' as TrendDirection,
        status:
          state.overviewStats.avgLatency < 200
            ? ('success' as const)
            : state.overviewStats.avgLatency < 500
              ? ('warning' as const)
              : ('error' as const),
      },
      ocrRounds: {
        value: state.overviewStats.ocrRounds,
        label: t('chainlink.kpi.ocrRounds'),
        trend: 'neutral' as TrendDirection,
      },
    };
  }, [state.overviewStats, t]);

  const activeFeedsCount = useMemo(() => {
    return state.feeds.filter((feed) => {
      const lastUpdateTime = new Date(feed.lastUpdate).getTime();
      const heartbeatMs = feed.heartbeat * 1000;
      const thresholdMs = heartbeatMs * 2;
      return Date.now() - lastUpdateTime < thresholdMs;
    }).length;
  }, [state.feeds]);

  const onlineOperatorsCount = useMemo(() => {
    return state.operators.filter((op) => op.online).length;
  }, [state.operators]);

  const breadcrumbItems = [{ label: t('nav.oracle'), href: '/oracle' }, { label: 'Chainlink' }];

  if (state.error && !state.overviewStats) {
    return (
      <div className="container mx-auto space-y-6 p-4 sm:p-6">
        <Breadcrumb items={breadcrumbItems} />
        <ErrorBanner
          error={new Error(state.error)}
          onRetry={fetchInitialData}
          title={t('common.errorLoadFailed')}
          isRetrying={state.loading}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C] pb-16 md:pb-0">
      <TopStatusBar
        healthStatus={healthStatus}
        isConnected={true}
        lastUpdateTime={state.lastUpdated ?? undefined}
        onRefresh={fetchInitialData}
        isAutoRefreshEnabled={state.autoRefreshEnabled}
        onToggleAutoRefresh={() => updateState({ autoRefreshEnabled: !state.autoRefreshEnabled })}
        onExport={handleExport}
      />

      <div className="container mx-auto space-y-3 p-4 sm:p-5">
        <Breadcrumb items={breadcrumbItems} />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold sm:text-xl lg:text-2xl">
              <Link2 className="h-5 w-5 text-blue-600" />
              <span>Chainlink</span>
              <Badge
                variant="outline"
                className={`border-0 ${
                  healthStatus === 'healthy'
                    ? 'bg-success/20 text-success'
                    : healthStatus === 'warning'
                      ? 'bg-warning/20 text-warning'
                      : 'bg-error/20 text-error'
                }`}
              >
                {healthStatus === 'healthy'
                  ? t('common.status.healthy')
                  : healthStatus === 'warning'
                    ? t('common.status.warning')
                    : t('common.status.critical')}
              </Badge>
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">{t('chainlink.pageDescription')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchInitialData} disabled={state.loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
            <AutoRefreshControl
              isEnabled={state.autoRefreshEnabled}
              onToggle={() => updateState({ autoRefreshEnabled: !state.autoRefreshEnabled })}
              interval={state.refreshInterval}
              onIntervalChange={(interval) => updateState({ refreshInterval: interval })}
              timeUntilRefresh={state.timeUntilRefresh}
            />
            <ExportButton
              data={
                state.overviewStats || state.overviewData
                  ? {
                      overviewStats: state.overviewStats,
                      overviewData: state.overviewData,
                      generatedAt: state.lastUpdated?.toISOString() || new Date().toISOString(),
                    }
                  : null
              }
              config={chainlinkExportConfig}
              disabled={state.loading}
            />
          </div>
        </div>

        {state.loading && !state.overviewStats ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        ) : (
          <>
            <KpiOverview
              totalFeeds={kpiData.totalFeeds}
              activeNodes={kpiData.activeNodes}
              avgLatency={kpiData.avgLatency}
              ocrRounds={kpiData.ocrRounds}
            />

            <TabNavigation tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

            <TabContent activeTab={activeTab}>
              <TabPanelWrapper tabId="overview">
                <div className="space-y-3">
                  <ContentSection
                    title={t('chainlink.overview.title')}
                    description={t('chainlink.overview.description')}
                  >
                    <p className="text-sm text-muted-foreground">
                      {t('chainlink.overview.introduction')}
                    </p>
                  </ContentSection>

                  <ContentSection title={t('chainlink.features.title')}>
                    <ContentGrid columns={3} gap="sm">
                      <div className="flex items-center gap-2.5 rounded-lg border border-border/30 bg-muted/30 p-3">
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
                      <div className="flex items-center gap-2.5 rounded-lg border border-border/30 bg-muted/30 p-3">
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
                      <div className="flex items-center gap-2.5 rounded-lg border border-border/30 bg-muted/30 p-3">
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
                      {state.overviewData?.metadata?.supportedChains?.map((chain) => (
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
                      <ChainlinkPriceHistory />
                    </div>
                    <div className="space-y-3 lg:col-span-1 xl:col-span-1">
                      <div className="rounded border border-border/20 bg-[rgba(15,23,42,0.8)] p-3">
                        <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold">
                          <Database className="h-3.5 w-3.5 text-primary" />
                          {t('chainlink.feedStatus.title')}
                        </h4>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {t('chainlink.feedStatus.total')}
                            </span>
                            <span className="font-mono font-semibold">{state.feeds.length}</span>
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
                              {state.feeds.length - activeFeedsCount}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="rounded border border-border/20 bg-[rgba(15,23,42,0.8)] p-3">
                        <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold">
                          <Users className="h-3.5 w-3.5 text-primary" />
                          {t('chainlink.nodeStatus.title')}
                        </h4>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {t('chainlink.nodeStatus.total')}
                            </span>
                            <span className="font-mono font-semibold">
                              {state.operators.length}
                            </span>
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
                              {state.operators.length - onlineOperatorsCount}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabPanelWrapper>

              <TabPanelWrapper tabId="feeds">
                {loadedTabs.has('feeds') ? (
                  <div className="space-y-4">
                    <FeedAggregation />
                    <OcrRoundMonitor />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                )}
              </TabPanelWrapper>

              <TabPanelWrapper tabId="nodes">
                {loadedTabs.has('nodes') ? (
                  <div className="space-y-4">
                    <OperatorList collapsible />
                    <HeartbeatMonitor collapsible />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                )}
              </TabPanelWrapper>

              <TabPanelWrapper tabId="costs">
                {loadedTabs.has('costs') ? (
                  <div className="space-y-4">
                    <ChainlinkGasCostAnalysis collapsible />
                    <DeviationTriggerStats collapsible />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                )}
              </TabPanelWrapper>

              <TabPanelWrapper tabId="advanced">
                {loadedTabs.has('advanced') ? (
                  <div className="space-y-4">
                    <FeedQualityAnalysis collapsible />
                    <CrossChainPriceComparison collapsible />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                )}
              </TabPanelWrapper>
            </TabContent>
          </>
        )}
      </div>
    </div>
  );
}
