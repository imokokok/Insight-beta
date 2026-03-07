'use client';

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';

import { Globe, Database, Shield, GitBranch, BarChart3, LayoutDashboard } from 'lucide-react';

import { ContentSection } from '@/components/common';
import {
  ProtocolPageLayout,
  TabPanelWrapper,
  type TabItem,
  type KpiCardData,
} from '@/components/oracle/layouts/ProtocolPageLayout';
import { Skeleton } from '@/components/ui';
import { CHAIN_DISPLAY_NAMES } from '@/config/chains';
import type {
  Bridge,
  DataSource,
  OracleScript,
  ValidatorHealthSummary,
} from '@/features/oracle/band/types';
import { useI18n } from '@/i18n';
import { fetchApiData, cn } from '@/shared/utils';

const BandBridgeStatusCard = lazy(() =>
  import('@/features/oracle/band/components/BridgeStatusCard').then((mod) => ({
    default: mod.BandBridgeStatusCard,
  })),
);
const DataSourceList = lazy(() =>
  import('@/features/oracle/band/components/DataSourceList').then((mod) => ({
    default: mod.DataSourceList,
  })),
);
const TransferHistory = lazy(() =>
  import('@/features/oracle/band/components/TransferHistory').then((mod) => ({
    default: mod.TransferHistory,
  })),
);
const CosmosChainSelector = lazy(() =>
  import('@/features/oracle/band/components/CosmosChainSelector').then((mod) => ({
    default: mod.CosmosChainSelector,
  })),
);
const BandPriceChart = lazy(() =>
  import('@/features/oracle/band/components/BandPriceChart').then((mod) => ({
    default: mod.BandPriceChart,
  })),
);
const AggregationValidationCard = lazy(() =>
  import('@/features/oracle/band/components/AggregationValidationCard').then((mod) => ({
    default: mod.AggregationValidationCard,
  })),
);
const DataFreshnessCard = lazy(() =>
  import('@/features/oracle/band/components/DataFreshnessCard').then((mod) => ({
    default: mod.DataFreshnessCard,
  })),
);
const OracleScriptList = lazy(() =>
  import('@/features/oracle/band/components/OracleScriptList').then((mod) => ({
    default: mod.OracleScriptList,
  })),
);
const ValidatorHealthCard = lazy(() =>
  import('@/features/oracle/band/components/ValidatorHealthCard').then((mod) => ({
    default: mod.ValidatorHealthCard,
  })),
);
const BridgeTrendChart = lazy(() =>
  import('@/features/oracle/band/components/BridgeTrendChart').then((mod) => ({
    default: mod.BridgeTrendChart,
  })),
);
const PriceTrendTab = lazy(() =>
  import('@/features/oracle/band/components/PriceTrendTab').then((mod) => ({
    default: mod.PriceTrendTab,
  })),
);
const QualityAnalysisTab = lazy(() =>
  import('@/features/oracle/band/components/QualityAnalysisTab').then((mod) => ({
    default: mod.QualityAnalysisTab,
  })),
);
const PriceComparisonTab = lazy(() =>
  import('@/features/oracle/band/components/PriceComparisonTab').then((mod) => ({
    default: mod.PriceComparisonTab,
  })),
);
const ValidatorList = lazy(() =>
  import('@/features/oracle/band/components/ValidatorList').then((mod) => ({
    default: mod.ValidatorList,
  })),
);
const OracleScriptAnalytics = lazy(() =>
  import('@/features/oracle/band/components/OracleScriptAnalytics').then((mod) => ({
    default: mod.OracleScriptAnalytics,
  })),
);
const DataSourceReliabilityCard = lazy(() =>
  import('@/features/oracle/band/components/DataSourceReliabilityCard').then((mod) => ({
    default: mod.DataSourceReliabilityCard,
  })),
);

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

interface BandDashboardState {
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

  const [state, setState] = useState<BandDashboardState>({
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
  }, [updateState, t]);

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

  const healthStatus = useMemo(() => {
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

  const kpiCards: KpiCardData[] = useMemo(() => {
    if (!state.bridgesData || !state.sourcesData) {
      return [
        { value: '-', label: t('band.kpi.activeBridges'), trend: 'neutral', status: 'neutral' },
        { value: '-', label: t('band.kpi.totalTransfers'), trend: 'neutral', status: 'neutral' },
        { value: '-', label: t('band.kpi.totalSources'), trend: 'neutral', status: 'neutral' },
        { value: '-', label: t('band.kpi.avgLatency'), trend: 'neutral', status: 'neutral' },
      ];
    }

    const avgLatency = state.bridgesData.summary?.avgLatency ?? 0;

    return [
      {
        value: state.bridgesData.summary?.active ?? 0,
        label: t('band.kpi.activeBridges'),
        trend: 'up',
        status: (state.bridgesData.summary?.active ?? 0) > 0 ? 'success' : 'warning',
      },
      {
        value: (state.bridgesData.summary?.totalTransfers ?? 0).toLocaleString(),
        label: t('band.kpi.totalTransfers'),
        trend: 'up',
        status: 'success',
      },
      {
        value: state.sourcesData.summary?.total ?? 0,
        label: t('band.kpi.totalSources'),
        trend: 'neutral',
        status: (state.sourcesData.summary?.total ?? 0) > 0 ? 'success' : 'warning',
      },
      {
        value: `${avgLatency}ms`,
        label: t('band.kpi.avgLatency'),
        trend: 'down',
        status: avgLatency < 200 ? 'success' : avgLatency < 500 ? 'warning' : 'error',
      },
    ];
  }, [state.bridgesData, state.sourcesData, t]);

  const tabs: TabItem[] = useMemo(
    () => [
      {
        id: 'overview',
        label: t('band.tabs.overview'),
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
      { id: 'bridges', label: t('band.tabs.bridges'), icon: <GitBranch className="h-4 w-4" /> },
      { id: 'sources', label: t('band.tabs.sources'), icon: <Database className="h-4 w-4" /> },
      { id: 'validators', label: 'Validators', icon: <Shield className="h-4 w-4" /> },
      { id: 'cosmos', label: 'Cosmos', icon: <Globe className="h-4 w-4" /> },
      { id: 'analysis', label: t('band.tabs.analysis'), icon: <BarChart3 className="h-4 w-4" /> },
    ],
    [t],
  );

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

  const handleExport = useCallback(() => {
    const exportData = {
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
    state.bridgesData,
    state.sourcesData,
    state.oracleScripts,
    state.validatorSummary,
    state.ibcData,
    state.lastUpdated,
  ]);

  return (
    <ProtocolPageLayout
      protocol="band"
      title="Band Protocol"
      icon={<Globe className="h-5 w-5 text-orange-600" />}
      description={t('band.pageDescription')}
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
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            <div className="lg:col-span-1 xl:col-span-2">
              <Suspense fallback={<Skeleton className="h-80 w-full" />}>
                <BandPriceChart symbol="ATOM/USD" chain="cosmos" timeRange="24h" />
              </Suspense>
            </div>
            <div className="space-y-3 lg:col-span-1 xl:col-span-1">
              <div className="border-b border-border/30 pb-3">
                <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold">
                  <GitBranch className="h-3.5 w-3.5 text-primary" />
                  {t('band.bridgeStatus.title')}
                </h4>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t('band.bridgeStatus.total')}</span>
                    <span className="font-mono font-semibold">
                      {state.bridgesData?.summary?.total ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t('band.bridgeStatus.active')}</span>
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      {state.bridgesData?.summary?.active ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t('band.bridgeStatus.inactive')}</span>
                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                      {state.bridgesData?.summary?.inactive ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-b border-border/30 pb-3">
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

              <div className="flex flex-wrap gap-1.5">
                {getChainConnectivity.slice(0, 6).map(({ chain, isActive }) => (
                  <span
                    key={chain}
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                      isActive
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
                    )}
                  >
                    {chain}
                    {isActive && <span className="ml-1 text-xs">●</span>}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Suspense fallback={<Skeleton className="h-48 w-full" />}>
              <AggregationValidationCard symbol="ETH/USD" chain="ethereum" />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-48 w-full" />}>
              <DataFreshnessCard symbol="ETH/USD" chain="ethereum" />
            </Suspense>
          </div>

          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <ValidatorHealthCard />
          </Suspense>
        </div>
      </TabPanelWrapper>

      <TabPanelWrapper tabId="bridges">
        <div className="space-y-4">
          {state.bridgesData?.bridges.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <GitBranch className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-2">{t('band.bridgeList.empty')}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/30 text-xs text-muted-foreground">
                      <th className="pb-2 text-left font-medium">桥接</th>
                      <th className="pb-2 text-right font-medium">转账数</th>
                      <th className="pb-2 text-right font-medium">交易量</th>
                      <th className="pb-2 text-right font-medium">延迟</th>
                      <th className="pb-2 text-right font-medium">成功率</th>
                      <th className="pb-2 text-center font-medium">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.bridgesData?.bridges.map((bridge) => (
                      <tr
                        key={bridge.bridgeId}
                        onClick={() => setSelectedBridge(bridge)}
                        className={cn(
                          'cursor-pointer border-b border-border/20 transition-colors hover:bg-muted/50',
                          selectedBridge?.bridgeId === bridge.bridgeId && 'bg-muted',
                        )}
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <GitBranch className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono text-sm">
                              {EXTENDED_CHAIN_DISPLAY_NAMES[bridge.sourceChain] ||
                                bridge.sourceChain}{' '}
                              →{' '}
                              {EXTENDED_CHAIN_DISPLAY_NAMES[bridge.destinationChain] ||
                                bridge.destinationChain}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-right font-mono text-sm">
                          {bridge.totalTransfers?.toLocaleString() ?? '-'}
                        </td>
                        <td className="py-3 text-right font-mono text-sm">
                          {bridge.totalVolume
                            ? `$${(bridge.totalVolume / 1000000).toFixed(2)}M`
                            : '-'}
                        </td>
                        <td className="py-3 text-right font-mono text-sm">
                          {bridge.avgLatency ? `${bridge.avgLatency}ms` : '-'}
                        </td>
                        <td className="py-3 text-right font-mono text-sm">
                          {bridge.successRate ? `${bridge.successRate.toFixed(1)}%` : '-'}
                        </td>
                        <td className="py-3 text-center">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                              bridge.status === 'active' &&
                                'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                              bridge.status === 'inactive' &&
                                'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                              bridge.status === 'degraded' &&
                                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                            )}
                          >
                            {bridge.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {selectedBridge && (
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <BridgeTrendChart
                bridgeId={selectedBridge.bridgeId}
                bridgeName={`${EXTENDED_CHAIN_DISPLAY_NAMES[selectedBridge.sourceChain] ?? selectedBridge.sourceChain} → ${EXTENDED_CHAIN_DISPLAY_NAMES[selectedBridge.destinationChain] ?? selectedBridge.destinationChain}`}
              />
            </Suspense>
          )}

          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <TransferHistory limit={20} />
          </Suspense>
        </div>
      </TabPanelWrapper>

      <TabPanelWrapper tabId="sources">
        <div className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <Suspense fallback={<Skeleton className="h-72 w-full" />}>
                <BandPriceChart symbol="ETH/USD" chain="ethereum" timeRange="24h" />
              </Suspense>
            </div>
            <div className="lg:col-span-4">
              <Suspense fallback={<Skeleton className="h-72 w-full" />}>
                <BandPriceChart symbol="BTC/USD" chain="ethereum" timeRange="24h" />
              </Suspense>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                <DataSourceReliabilityCard />
              </Suspense>
            </div>
            <div className="lg:col-span-7">
              <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                <OracleScriptAnalytics loading={state.loading} />
              </Suspense>
            </div>
          </div>
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <DataSourceList
              sources={state.sourcesData?.sources}
              loading={state.loading}
              chain={undefined}
              symbol={undefined}
            />
          </Suspense>
        </div>
      </TabPanelWrapper>

      <TabPanelWrapper tabId="validators">
        <div className="space-y-6">
          <ContentSection>
            <Suspense fallback={<Skeleton className="h-48 w-full" />}>
              <ValidatorHealthCard />
            </Suspense>
          </ContentSection>
          <ContentSection>
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <ValidatorList />
            </Suspense>
          </ContentSection>
        </div>
      </TabPanelWrapper>

      <TabPanelWrapper tabId="cosmos">
        <div className="space-y-4">
          <ContentSection title="Cosmos 链数据">
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <div className="space-y-4">
                <CosmosChainSelector
                  selectedChain={selectedCosmosChain}
                  onChainChange={setSelectedCosmosChain}
                  showDetails={true}
                  showIBCStatus={false}
                  filterType="mainnet"
                />

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <span className="text-xs text-muted-foreground">
                      {t('band.blockInfo.height')}
                    </span>
                    <div className="mt-1 font-mono text-base">
                      {Math.floor(Math.random() * 10000000).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">
                      {t('band.blockInfo.timestamp')}
                    </span>
                    <div className="mt-1 text-sm">{new Date().toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">IBC 连接</span>
                    <div className="mt-1 text-base font-semibold">
                      {state.ibcData?.connections.total ?? 0}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">活跃通道</span>
                    <div className="mt-1 text-base font-semibold">
                      {state.ibcData?.channels.open ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            </Suspense>
          </ContentSection>
        </div>
      </TabPanelWrapper>

      <TabPanelWrapper tabId="analysis">
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Suspense fallback={<Skeleton className="h-80 w-full" />}>
                <PriceTrendTab />
              </Suspense>
            </div>
            <div className="space-y-4">
              <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                <QualityAnalysisTab />
              </Suspense>
            </div>
          </div>
          <Suspense fallback={<Skeleton className="h-80 w-full" />}>
            <PriceComparisonTab />
          </Suspense>
        </div>
      </TabPanelWrapper>
    </ProtocolPageLayout>
  );
}
