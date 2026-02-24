'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

import {
  RefreshCw,
  Globe,
  Activity,
  Database,
  Shield,
  GitBranch,
  BarChart3,
  LayoutDashboard,
} from 'lucide-react';

import { ContentSection, ContentGrid, AutoRefreshControl, Breadcrumb } from '@/components/common';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { ErrorBanner } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { CHAIN_DISPLAY_NAMES } from '@/config/chains';
import {
  BridgeStatusCard,
  DataSourceList,
  TransferHistory,
  CosmosChainSelector,
  BandExportButton,
  AggregationValidationCard,
  BandPriceChart,
  DataFreshnessCard,
  OracleScriptList,
  ValidatorHealthCard,
  BridgeTrendChart,
  PriceTrendTab,
  QualityAnalysisTab,
  PriceComparisonTab,
} from '@/features/oracle/band';
import {
  BandKpiOverview,
  BandTopStatusBar,
  type BandKpiStats,
} from '@/features/oracle/band/components/dashboard';
import type {
  Bridge,
  DataSource,
  OracleScript,
  ValidatorHealthSummary,
} from '@/features/oracle/band/types';
import {
  TabNavigation,
  TabContent,
  TabPanelWrapper,
  useTabNavigation,
  type TabItem,
} from '@/features/oracle/chainlink/components/dashboard';
import { useI18n } from '@/i18n';
import { fetchApiData, cn } from '@/shared/utils';
import type { NetworkHealthStatus } from '@/types/common';

const EXTENDED_CHAIN_DISPLAY_NAMES: Record<string, string> = {
  ...CHAIN_DISPLAY_NAMES,
  cosmos: 'Cosmos Hub',
  osmosis: 'Osmosis',
  juno: 'Juno',
};

const SUPPORTED_CHAINS = [
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
];

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

interface IBCStatusData {
  chainId: string;
  network: 'mainnet' | 'testnet';
  connections: {
    total: number;
    open: number;
    init: number;
    tryopen: number;
  };
  channels: {
    total: number;
    open: number;
    closed: number;
  };
  summary: {
    totalConnections: number;
    activeConnections: number;
    totalChannels: number;
    activeChannels: number;
    estimatedTransfers: number;
  };
  lastUpdated: number;
}

interface IBCResponse {
  data: IBCStatusData;
}

interface BandDashboardState {
  overviewStats: BandKpiStats | null;
  bridgesData: BridgesResponse | null;
  sourcesData: SourcesResponse | null;
  ibcData: IBCStatusData | null;
  oracleScripts: OracleScript[] | null;
  validatorSummary: ValidatorHealthSummary | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  autoRefreshEnabled: boolean;
  refreshInterval: number;
  timeUntilRefresh: number;
}

export default function BandProtocolPage() {
  const { t } = useI18n();

  const TABS: TabItem[] = [
    {
      id: 'overview',
      label: t('band.tabs.overview'),
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    { id: 'bridges', label: t('band.tabs.bridges'), icon: <GitBranch className="h-4 w-4" /> },
    { id: 'sources', label: t('band.tabs.sources'), icon: <Database className="h-4 w-4" /> },
    { id: 'cosmos', label: 'Cosmos', icon: <Globe className="h-4 w-4" /> },
    { id: 'analysis', label: t('band.tabs.analysis'), icon: <BarChart3 className="h-4 w-4" /> },
  ];

  const [state, setState] = useState<BandDashboardState>({
    overviewStats: null,
    bridgesData: null,
    sourcesData: null,
    ibcData: null,
    oracleScripts: null,
    validatorSummary: null,
    loading: true,
    error: null,
    lastUpdated: null,
    autoRefreshEnabled: false,
    refreshInterval: 30000,
    timeUntilRefresh: 0,
  });

  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['overview']));
  const [selectedCosmosChain, setSelectedCosmosChain] = useState('cosmoshub-4');
  const [selectedBridge, setSelectedBridge] = useState<Bridge | null>(null);

  const updateState = useCallback((partial: Partial<BandDashboardState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const fetchInitialData = useCallback(async () => {
    try {
      updateState({ loading: true, error: null });

      const [bridgesRes, sourcesRes] = await Promise.all([
        fetchApiData<BridgesResponse>('/api/oracle/band/bridges'),
        fetchApiData<SourcesResponse>('/api/oracle/band/sources'),
      ]);

      setLoadedTabs((prev) => new Set([...prev, 'overview']));

      const overviewStats: BandKpiStats = {
        activeBridges: bridgesRes.summary?.active ?? 0,
        totalTransfers: bridgesRes.summary?.totalTransfers ?? 0,
        totalSources: sourcesRes.summary?.total ?? 0,
        avgLatency: bridgesRes.summary?.avgLatency ?? 0,
      };

      const mockOracleScripts: OracleScript[] = [
        {
          scriptId: 'price_feed',
          name: 'Price Feed',
          description: t('band.oracleScriptTypes.priceFeed.description'),
          owner: 'band1abc123def456',
          codeHash: '0x1234abcd5678efgh',
          schema: '{symbol:string,price:uint64}',
          status: 'active',
          totalRequests: 125000,
          lastRequestAt: new Date(Date.now() - 300000).toISOString(),
          avgResponseTimeMs: 450,
          successRate: 99.2,
        },
        {
          scriptId: 'weather_data',
          name: 'Weather Data',
          description: t('band.oracleScriptTypes.weather.description'),
          owner: 'band1def456ghi789',
          codeHash: '0x5678efgh90abijkl',
          schema: '{location:string,temp:uint64}',
          status: 'active',
          totalRequests: 34500,
          lastRequestAt: new Date(Date.now() - 600000).toISOString(),
          avgResponseTimeMs: 820,
          successRate: 97.8,
        },
        {
          scriptId: 'sports_results',
          name: 'Sports Results',
          description: t('band.oracleScriptTypes.sports.description'),
          owner: 'band1ghi789jkl012',
          codeHash: '0x90abijklcdefmnop',
          schema: '{gameId:string,score:string}',
          status: 'inactive',
          totalRequests: 12300,
          lastRequestAt: new Date(Date.now() - 86400000).toISOString(),
          avgResponseTimeMs: 580,
          successRate: 96.5,
        },
        {
          scriptId: 'stock_prices',
          name: 'Stock Prices',
          description: t('band.oracleScriptTypes.stocks.description'),
          owner: 'band1jkl012mno345',
          codeHash: '0xcdefmnopqrstuvwx',
          schema: '{ticker:string,price:uint64}',
          status: 'deprecated',
          totalRequests: 89200,
          lastRequestAt: new Date(Date.now() - 259200000).toISOString(),
          avgResponseTimeMs: 380,
          successRate: 99.5,
        },
      ];

      const mockValidatorSummary: ValidatorHealthSummary = {
        totalValidators: 100,
        activeValidators: 95,
        jailedValidators: 3,
        networkParticipationRate: 98.5,
        avgUptimePercent: 99.1,
        totalVotingPower: 1000000000,
      };

      updateState({
        overviewStats,
        bridgesData: bridgesRes,
        sourcesData: sourcesRes,
        oracleScripts: mockOracleScripts,
        validatorSummary: mockValidatorSummary,
        lastUpdated: new Date(),
      });
    } catch (err) {
      updateState({ error: err instanceof Error ? err.message : 'Failed to fetch data' });
    } finally {
      updateState({ loading: false });
    }
  }, [updateState]);

  const fetchIBCData = useCallback(async () => {
    try {
      const response = await fetchApiData<IBCResponse>('/api/oracle/band/ibc');
      updateState({ ibcData: response.data });
    } catch (err) {
      console.error('Failed to fetch IBC data:', err);
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

  const handleTabChange = useCallback(
    (tabId: string) => {
      setLoadedTabs((prev) => {
        if (!prev.has(tabId)) {
          return new Set([...prev, tabId]);
        }
        return prev;
      });

      if (tabId === 'cosmos') {
        fetchIBCData();
      }
    },
    [fetchIBCData],
  );

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
      bridgesData: state.bridgesData,
      sourcesData: state.sourcesData,
      oracleScripts: state.oracleScripts,
      validatorSummary: state.validatorSummary,
      ibcData: state.ibcData,
      generatedAt: state.lastUpdated?.toISOString() || new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `band-dashboard-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [
    state.overviewStats,
    state.bridgesData,
    state.sourcesData,
    state.oracleScripts,
    state.validatorSummary,
    state.ibcData,
    state.lastUpdated,
  ]);

  const healthStatus: NetworkHealthStatus = useMemo(() => {
    if (
      !state.bridgesData ||
      !state.bridgesData.summary ||
      !state.bridgesData.summary.total ||
      state.bridgesData.summary.total === 0
    )
      return 'critical';
    const activeRatio = (state.bridgesData.summary.active ?? 0) / state.bridgesData.summary.total;
    if (activeRatio >= 0.8) return 'healthy';
    if (activeRatio >= 0.5) return 'warning';
    return 'critical';
  }, [state.bridgesData]);

  const getChainConnectivity = useMemo(() => {
    if (!state.bridgesData || !state.bridgesData.bridges) return [];
    return SUPPORTED_CHAINS.map((chain) => {
      const isActive =
        state.bridgesData?.bridges.some(
          (b) => (b.sourceChain === chain || b.destinationChain === chain) && b.status === 'active',
        ) ?? false;
      return { chain, isActive };
    });
  }, [state.bridgesData]);

  const breadcrumbItems = [{ label: t('nav.oracle'), href: '/oracle' }, { label: 'Band Protocol' }];

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
      <BandTopStatusBar
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
              <Globe className="h-5 w-5 text-orange-600" />
              <span>Band Protocol</span>
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
            <p className="mt-0.5 text-xs text-muted-foreground">{t('band.pageDescription')}</p>
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
            <BandExportButton
              data={
                state.overviewStats
                  ? {
                      overviewStats: {
                        totalBridges: state.bridgesData?.summary?.total ?? 0,
                        activeBridges: state.overviewStats.activeBridges,
                        totalTransfers: state.overviewStats.totalTransfers,
                        totalSources: state.overviewStats.totalSources,
                      },
                      bridgesData: state.bridgesData,
                      sourcesData: state.sourcesData,
                      oracleScripts: state.oracleScripts,
                      validatorSummary: state.validatorSummary,
                      generatedAt: state.lastUpdated?.toISOString() || new Date().toISOString(),
                    }
                  : null
              }
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
            <BandKpiOverview stats={state.overviewStats} loading={state.loading} />

            <TabNavigation tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

            <TabContent activeTab={activeTab}>
              <TabPanelWrapper tabId="overview">
                <div className="space-y-3">
                  <ContentSection
                    title={t('band.overview.title')}
                    description={t('band.overview.description')}
                  >
                    <p className="text-sm text-muted-foreground">
                      {t('band.overview.introduction')}
                    </p>
                  </ContentSection>

                  <ContentSection title={t('band.features.title')}>
                    <ContentGrid columns={3} gap="sm">
                      <div className="flex items-center gap-2.5 rounded-lg border border-border/30 bg-muted/30 p-3">
                        <div className="rounded-lg bg-orange-500/10 p-2">
                          <Globe className="h-5 w-5 text-orange-500" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            {t('band.features.crossChain.label')}
                          </p>
                          <p className="text-sm font-semibold text-foreground">
                            {t('band.features.crossChain.value')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 rounded-lg border border-border/30 bg-muted/30 p-3">
                        <div className="rounded-lg bg-blue-500/10 p-2">
                          <Activity className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            {t('band.features.ibc.label')}
                          </p>
                          <p className="text-sm font-semibold text-foreground">
                            {t('band.features.ibc.value')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 rounded-lg border border-border/30 bg-muted/30 p-3">
                        <div className="rounded-lg bg-green-500/10 p-2">
                          <Shield className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            {t('band.features.validation.label')}
                          </p>
                          <p className="text-sm font-semibold text-foreground">
                            {t('band.features.validation.value')}
                          </p>
                        </div>
                      </div>
                    </ContentGrid>
                  </ContentSection>

                  <ContentSection
                    title={t('band.supportedChains.title')}
                    description={t('band.supportedChains.description')}
                  >
                    <div className="flex flex-wrap gap-1.5">
                      {getChainConnectivity.map(({ chain, isActive }) => (
                        <Badge
                          key={chain}
                          variant="secondary"
                          className={`text-xs capitalize ${
                            isActive
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {chain}
                          {isActive && <span className="ml-1 text-xs">●</span>}
                        </Badge>
                      ))}
                    </div>
                  </ContentSection>

                  <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                    <div className="lg:col-span-1 xl:col-span-2">
                      <BandPriceChart symbol="ATOM/USD" chain="cosmos" timeRange="24h" />
                    </div>
                    <div className="space-y-3 lg:col-span-1 xl:col-span-1">
                      <div className="rounded border border-border/20 bg-[rgba(15,23,42,0.8)] p-3">
                        <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold">
                          <GitBranch className="h-3.5 w-3.5 text-primary" />
                          {t('band.bridgeStatus.title')}
                        </h4>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {t('band.bridgeStatus.total')}
                            </span>
                            <span className="font-mono font-semibold">
                              {state.bridgesData?.summary?.total ?? 0}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {t('band.bridgeStatus.active')}
                            </span>
                            <Badge variant="success" size="sm">
                              {state.bridgesData?.summary?.active ?? 0}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {t('band.bridgeStatus.inactive')}
                            </span>
                            <Badge variant="warning" size="sm">
                              {state.bridgesData?.summary?.inactive ?? 0}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="rounded border border-border/20 bg-[rgba(15,23,42,0.8)] p-3">
                        <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold">
                          <Database className="h-3.5 w-3.5 text-primary" />
                          {t('band.sourceDistribution.title')}
                        </h4>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {t('band.sourceDistribution.evm')}
                            </span>
                            <span className="font-mono font-semibold">
                              {state.sourcesData?.summary?.evmCount ?? 0}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted">
                            <div
                              className="h-1.5 rounded-full bg-blue-500"
                              style={{
                                width: `${
                                  state.sourcesData?.summary
                                    ? (state.sourcesData.summary.evmCount ?? 0) /
                                        ((state.sourcesData.summary.evmCount ?? 0) +
                                          (state.sourcesData.summary.cosmosCount ?? 0)) >
                                      0
                                      ? ((state.sourcesData.summary.evmCount ?? 0) /
                                          ((state.sourcesData.summary.evmCount ?? 0) +
                                            (state.sourcesData.summary.cosmosCount ?? 0))) *
                                        100
                                      : 0
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {t('band.sourceDistribution.cosmos')}
                            </span>
                            <span className="font-mono font-semibold">
                              {state.sourcesData?.summary?.cosmosCount ?? 0}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted">
                            <div
                              className="h-1.5 rounded-full bg-purple-500"
                              style={{
                                width: `${
                                  state.sourcesData?.summary
                                    ? (state.sourcesData.summary.cosmosCount ?? 0) /
                                        ((state.sourcesData.summary.evmCount ?? 0) +
                                          (state.sourcesData.summary.cosmosCount ?? 0)) >
                                      0
                                      ? ((state.sourcesData.summary.cosmosCount ?? 0) /
                                          ((state.sourcesData.summary.evmCount ?? 0) +
                                            (state.sourcesData.summary.cosmosCount ?? 0))) *
                                        100
                                      : 0
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    <AggregationValidationCard symbol="ETH/USD" chain="ethereum" />
                    <DataFreshnessCard symbol="ETH/USD" chain="ethereum" />
                  </div>

                  <ValidatorHealthCard />
                </div>
              </TabPanelWrapper>

              <TabPanelWrapper tabId="bridges">
                {loadedTabs.has('bridges') ? (
                  <div className="space-y-4">
                    <ContentSection
                      title={t('band.bridgeList.title')}
                      description={
                        t('band.bridgeList.description', {
                          count: state.bridgesData?.bridges.length ?? 0,
                        }) + (selectedBridge ? ' (点击数据桥查看趋势)' : '')
                      }
                    >
                      {state.bridgesData?.bridges.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                          <GitBranch className="mx-auto h-12 w-12 opacity-50" />
                          <p className="mt-2">{t('band.bridgeList.empty')}</p>
                        </div>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {state.bridgesData?.bridges.map((bridge) => (
                            <BridgeStatusCard
                              key={bridge.bridgeId}
                              bridge={bridge}
                              onClick={(b) => setSelectedBridge(b)}
                              className={cn(
                                selectedBridge?.bridgeId === bridge.bridgeId && 'border-primary',
                              )}
                            />
                          ))}
                        </div>
                      )}
                    </ContentSection>

                    {selectedBridge && (
                      <BridgeTrendChart
                        bridgeId={selectedBridge.bridgeId}
                        bridgeName={`${EXTENDED_CHAIN_DISPLAY_NAMES[selectedBridge.sourceChain] ?? selectedBridge.sourceChain} → ${EXTENDED_CHAIN_DISPLAY_NAMES[selectedBridge.destinationChain] ?? selectedBridge.destinationChain}`}
                      />
                    )}

                    <TransferHistory limit={20} />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                )}
              </TabPanelWrapper>

              <TabPanelWrapper tabId="sources">
                {loadedTabs.has('sources') ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <BandPriceChart symbol="ETH/USD" chain="ethereum" timeRange="24h" />
                      <BandPriceChart symbol="BTC/USD" chain="ethereum" timeRange="24h" />
                    </div>
                    <DataSourceList
                      sources={state.sourcesData?.sources}
                      loading={state.loading}
                      chain={undefined}
                      symbol={undefined}
                    />
                    <OracleScriptList
                      scripts={state.oracleScripts ?? undefined}
                      loading={state.loading}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                )}
              </TabPanelWrapper>

              <TabPanelWrapper tabId="cosmos">
                {loadedTabs.has('cosmos') ? (
                  <div className="space-y-4">
                    <ContentSection
                      title={t('band.cosmosSelector.title')}
                      description={t('band.cosmosSelector.description')}
                    >
                      <CosmosChainSelector
                        selectedChain={selectedCosmosChain}
                        onChainChange={setSelectedCosmosChain}
                        showDetails={true}
                        showIBCStatus={true}
                        filterType="mainnet"
                      />
                    </ContentSection>

                    <ContentSection
                      title={t('band.blockInfo.title')}
                      description={t('band.blockInfo.description')}
                    >
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-lg bg-muted/30 p-4">
                          <span className="text-sm text-muted-foreground">
                            {t('band.blockInfo.height')}
                          </span>
                          <div className="mt-1 font-mono text-lg">
                            {Math.floor(Math.random() * 10000000).toLocaleString()}
                          </div>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-4">
                          <span className="text-sm text-muted-foreground">
                            {t('band.blockInfo.hash')}
                          </span>
                          <div className="mt-1 truncate font-mono text-sm">
                            0x
                            {Array.from({ length: 64 }, () =>
                              Math.floor(Math.random() * 16).toString(16),
                            ).join('')}
                          </div>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-4">
                          <span className="text-sm text-muted-foreground">
                            {t('band.blockInfo.timestamp')}
                          </span>
                          <div className="mt-1 text-sm">{new Date().toLocaleString()}</div>
                        </div>
                      </div>
                    </ContentSection>

                    <ContentSection
                      title={t('band.ibcStatus.title')}
                      description={t('band.ibcStatus.description')}
                    >
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-lg bg-muted/30 p-4">
                          <span className="text-sm text-muted-foreground">
                            {t('band.ibcStatus.chainId')}
                          </span>
                          <div className="mt-1 font-mono text-lg">{selectedCosmosChain}</div>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-4">
                          <span className="text-sm text-muted-foreground">
                            {t('band.ibcStatus.connections')}
                          </span>
                          <div className="mt-1 text-lg font-semibold">
                            {state.ibcData?.connections.total ?? 0}
                          </div>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-4">
                          <span className="text-sm text-muted-foreground">
                            {t('band.ibcStatus.activeChannels')}
                          </span>
                          <div className="mt-1 text-lg font-semibold">
                            {state.ibcData?.channels.open ?? 0}
                          </div>
                        </div>
                      </div>
                    </ContentSection>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                )}
              </TabPanelWrapper>

              <TabPanelWrapper tabId="analysis">
                {loadedTabs.has('analysis') ? (
                  <div className="space-y-4">
                    <PriceTrendTab />
                    <QualityAnalysisTab />
                    <PriceComparisonTab />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Skeleton className="h-64 w-full" />
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
