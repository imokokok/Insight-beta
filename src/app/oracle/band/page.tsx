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

import { ContentSection, ContentGrid } from '@/components/common';
import { AutoRefreshControl } from '@/components/common/AutoRefreshControl';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { ErrorBanner } from '@/components/ui';
import { Skeleton } from '@/components/ui';
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
import type {
  Bridge,
  DataSource,
  OracleScript,
  ValidatorHealthSummary,
} from '@/features/oracle/band';
import {
  BandKpiOverview,
  BandTopStatusBar,
  type BandKpiStats,
  type NetworkHealthStatus,
} from '@/features/oracle/band/components/dashboard';
import {
  TabNavigation,
  TabContent,
  TabPanelWrapper,
  useTabNavigation,
  type TabItem,
} from '@/features/oracle/chainlink/components/dashboard';
import { useI18n } from '@/i18n';
import { fetchApiData, cn } from '@/shared/utils';

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

const CHAIN_DISPLAY_NAMES: Record<string, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  arbitrum: 'Arbitrum',
  optimism: 'Optimism',
  avalanche: 'Avalanche',
  bsc: 'BSC',
  fantom: 'Fantom',
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

const TABS: TabItem[] = [
  { id: 'overview', label: '概览', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'bridges', label: '数据桥', icon: <GitBranch className="h-4 w-4" /> },
  { id: 'sources', label: '数据源', icon: <Database className="h-4 w-4" /> },
  { id: 'cosmos', label: 'Cosmos', icon: <Globe className="h-4 w-4" /> },
  { id: 'analysis', label: '数据分析', icon: <BarChart3 className="h-4 w-4" /> },
];

export default function BandProtocolPage() {
  const { t } = useI18n();

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
          description: '获取加密货币价格数据',
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
          description: '获取全球天气数据',
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
          description: '获取体育比赛结果',
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
          description: '获取股票价格数据',
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
    if (!state.bridgesData || state.bridgesData.summary.total === 0) return 'critical';
    const activeRatio = state.bridgesData.summary.active / state.bridgesData.summary.total;
    if (activeRatio >= 0.8) return 'healthy';
    if (activeRatio >= 0.5) return 'warning';
    return 'critical';
  }, [state.bridgesData]);

  const getChainConnectivity = useMemo(() => {
    if (!state.bridgesData) return [];
    return SUPPORTED_CHAINS.map((chain) => {
      const isActive = state.bridgesData!.bridges.some(
        (b) => (b.sourceChain === chain || b.destinationChain === chain) && b.status === 'active',
      );
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
          title="加载数据失败"
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
                {healthStatus === 'healthy' ? '健康' : healthStatus === 'warning' ? '警告' : '异常'}
              </Badge>
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              跨链预言机 - Cosmos 生态与数据桥监控
            </p>
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
                        totalBridges: state.bridgesData?.summary.total ?? 0,
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
                  <ContentSection title="Band 协议概览" description="跨链预言机网络状态摘要">
                    <p className="text-sm text-muted-foreground">
                      Band Protocol 是基于 Cosmos
                      的跨链预言机协议，通过数据桥为多链提供可靠的外部数据，支持 EVM 和 Cosmos
                      生态系统。
                    </p>
                  </ContentSection>

                  <ContentSection title="核心特性">
                    <ContentGrid columns={3} gap="sm">
                      <div className="flex items-center gap-2.5 rounded-lg border border-border/30 bg-muted/30 p-3">
                        <div className="rounded-lg bg-orange-500/10 p-2">
                          <Globe className="h-5 w-5 text-orange-500" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">跨链数据桥</p>
                          <p className="text-sm font-semibold text-foreground">多链数据传输</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 rounded-lg border border-border/30 bg-muted/30 p-3">
                        <div className="rounded-lg bg-blue-500/10 p-2">
                          <Activity className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">IBC 协议</p>
                          <p className="text-sm font-semibold text-foreground">Cosmos 互操作</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 rounded-lg border border-border/30 bg-muted/30 p-3">
                        <div className="rounded-lg bg-green-500/10 p-2">
                          <Shield className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">数据验证</p>
                          <p className="text-sm font-semibold text-foreground">多源聚合验证</p>
                        </div>
                      </div>
                    </ContentGrid>
                  </ContentSection>

                  <ContentSection title="支持的链" description="Band Protocol 支持的区块链网络">
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
                          数据桥状态概览
                        </h4>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">总数据桥</span>
                            <span className="font-mono font-semibold">
                              {state.bridgesData?.summary.total ?? 0}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">活跃数据桥</span>
                            <Badge variant="success" size="sm">
                              {state.bridgesData?.summary.active ?? 0}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">非活跃数据桥</span>
                            <Badge variant="warning" size="sm">
                              {state.bridgesData?.summary.inactive ?? 0}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="rounded border border-border/20 bg-[rgba(15,23,42,0.8)] p-3">
                        <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold">
                          <Database className="h-3.5 w-3.5 text-primary" />
                          数据源分布
                        </h4>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">EVM 链数据源</span>
                            <span className="font-mono font-semibold">
                              {state.sourcesData?.summary.evmCount ?? 0}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted">
                            <div
                              className="h-1.5 rounded-full bg-blue-500"
                              style={{
                                width: `${
                                  state.sourcesData
                                    ? (state.sourcesData.summary.evmCount /
                                        (state.sourcesData.summary.evmCount +
                                          state.sourcesData.summary.cosmosCount)) *
                                      100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Cosmos 链数据源</span>
                            <span className="font-mono font-semibold">
                              {state.sourcesData?.summary.cosmosCount ?? 0}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted">
                            <div
                              className="h-1.5 rounded-full bg-purple-500"
                              style={{
                                width: `${
                                  state.sourcesData
                                    ? (state.sourcesData.summary.cosmosCount /
                                        (state.sourcesData.summary.evmCount +
                                          state.sourcesData.summary.cosmosCount)) *
                                      100
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
                      title="数据桥列表"
                      description={`显示 ${state.bridgesData?.bridges.length ?? 0} 个数据桥${
                        selectedBridge ? ' (点击数据桥查看趋势)' : ''
                      }`}
                    >
                      {state.bridgesData?.bridges.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                          <GitBranch className="mx-auto h-12 w-12 opacity-50" />
                          <p className="mt-2">暂无数据桥信息</p>
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
                        bridgeName={`${CHAIN_DISPLAY_NAMES[selectedBridge.sourceChain] ?? selectedBridge.sourceChain} → ${CHAIN_DISPLAY_NAMES[selectedBridge.destinationChain] ?? selectedBridge.destinationChain}`}
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
                      title="Cosmos 链选择器"
                      description="选择 Cosmos 生态链查看详细数据"
                    >
                      <CosmosChainSelector
                        selectedChain={selectedCosmosChain}
                        onChainChange={setSelectedCosmosChain}
                        showDetails={true}
                        showIBCStatus={true}
                        filterType="mainnet"
                      />
                    </ContentSection>

                    <ContentSection title="Band Chain 区块信息" description="最新区块状态">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-lg bg-muted/30 p-4">
                          <span className="text-sm text-muted-foreground">区块高度</span>
                          <div className="mt-1 font-mono text-lg">
                            {Math.floor(Math.random() * 10000000).toLocaleString()}
                          </div>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-4">
                          <span className="text-sm text-muted-foreground">区块哈希</span>
                          <div className="mt-1 truncate font-mono text-sm">
                            0x
                            {Array.from({ length: 64 }, () =>
                              Math.floor(Math.random() * 16).toString(16),
                            ).join('')}
                          </div>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-4">
                          <span className="text-sm text-muted-foreground">时间戳</span>
                          <div className="mt-1 text-sm">{new Date().toLocaleString()}</div>
                        </div>
                      </div>
                    </ContentSection>

                    <ContentSection title="IBC 状态" description="当前选中链的 IBC 连接状态">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-lg bg-muted/30 p-4">
                          <span className="text-sm text-muted-foreground">选中链 ID</span>
                          <div className="mt-1 font-mono text-lg">{selectedCosmosChain}</div>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-4">
                          <span className="text-sm text-muted-foreground">IBC 连接数</span>
                          <div className="mt-1 text-lg font-semibold">
                            {state.ibcData?.connections.total ?? 0}
                          </div>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-4">
                          <span className="text-sm text-muted-foreground">活跃通道</span>
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
