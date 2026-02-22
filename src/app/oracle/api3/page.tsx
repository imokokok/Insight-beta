'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

import { useRouter } from 'next/navigation';

import {
  RefreshCw,
  Server,
  TrendingUp,
  Database,
  Shield,
  LayoutDashboard,
  GitCompare,
  Activity,
} from 'lucide-react';

import { ContentSection, ContentGrid } from '@/components/common';
import { AutoRefreshControl } from '@/components/common/AutoRefreshControl';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { ErrorBanner } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import {
  PriceUpdateMonitor,
  DapiList,
  SignatureVerifyPanel,
  Api3ExportButton,
  GasCostAnalysis,
  CrossProtocolComparison,
  AlertConfigPanel,
  Api3TopStatusBar,
  Api3KpiOverview,
  type NetworkHealthStatus,
} from '@/features/oracle/api3';
import {
  TabNavigation,
  TabContent,
  TabPanelWrapper,
  useTabNavigation,
  type TabItem,
} from '@/features/oracle/chainlink/components/dashboard';
import { useI18n } from '@/i18n';
import { fetchApiData } from '@/shared/utils';
import { formatTime } from '@/shared/utils/format/date';
import { cn } from '@/shared/utils/ui';

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

interface OverviewStats {
  totalAirnodes: number;
  onlineAirnodes: number;
  priceUpdateEvents: number;
  totalDapis: number;
}

interface Api3DashboardState {
  overviewStats: OverviewStats | null;
  airnodesData: AirnodesResponse | null;
  oevData: OevResponse | null;
  dapisData: DapisResponse | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  autoRefreshEnabled: boolean;
  refreshInterval: number;
  timeUntilRefresh: number;
}

const TABS: TabItem[] = [
  { id: 'overview', label: '概览', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'airnodes', label: 'Airnodes', icon: <Server className="h-4 w-4" /> },
  { id: 'data', label: '数据服务', icon: <Database className="h-4 w-4" /> },
  { id: 'analysis', label: '分析工具', icon: <GitCompare className="h-4 w-4" /> },
  { id: 'tools', label: '工具', icon: <Shield className="h-4 w-4" /> },
];

export default function Api3Page() {
  const { t } = useI18n();
  const router = useRouter();

  const [state, setState] = useState<Api3DashboardState>({
    overviewStats: null,
    airnodesData: null,
    oevData: null,
    dapisData: null,
    loading: true,
    error: null,
    lastUpdated: null,
    autoRefreshEnabled: false,
    refreshInterval: 30000,
    timeUntilRefresh: 0,
  });

  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['overview']));

  const updateState = useCallback((partial: Partial<Api3DashboardState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const fetchInitialData = useCallback(async () => {
    try {
      updateState({ loading: true, error: null });

      const [airnodesRes, oevRes, dapisRes] = await Promise.all([
        fetchApiData<AirnodesResponse>('/api/oracle/api3/airnodes'),
        fetchApiData<OevResponse>('/api/oracle/api3/oev'),
        fetchApiData<DapisResponse>('/api/oracle/api3/dapis'),
      ]);

      const overviewStats: OverviewStats = {
        totalAirnodes: airnodesRes.metadata?.total ?? 0,
        onlineAirnodes: airnodesRes.metadata?.online ?? 0,
        priceUpdateEvents: oevRes.metadata?.total ?? 0,
        totalDapis: dapisRes.metadata?.total ?? 0,
      };

      updateState({
        overviewStats,
        airnodesData: airnodesRes,
        oevData: oevRes,
        dapisData: dapisRes,
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
      airnodesData: state.airnodesData,
      oevData: state.oevData,
      dapisData: state.dapisData,
      generatedAt: state.lastUpdated?.toISOString() || new Date().toISOString(),
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
  }, [state.overviewStats, state.airnodesData, state.oevData, state.dapisData, state.lastUpdated]);

  const healthStatus: NetworkHealthStatus = useMemo(() => {
    if (!state.overviewStats) return 'healthy';
    const onlineRatio =
      state.overviewStats.totalAirnodes > 0
        ? state.overviewStats.onlineAirnodes / state.overviewStats.totalAirnodes
        : 0;
    if (onlineRatio >= 0.9) return 'healthy';
    if (onlineRatio >= 0.7) return 'warning';
    return 'critical';
  }, [state.overviewStats]);

  const breadcrumbItems = [{ label: t('nav.oracle'), href: '/oracle' }, { label: 'API3' }];

  const getResponseTimeColor = (ms: number) => {
    if (ms < 100) return 'text-green-500';
    if (ms < 300) return 'text-yellow-500';
    return 'text-red-500';
  };

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
      <Api3TopStatusBar
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
              <Server className="h-5 w-5 text-blue-600" />
              <span>API3</span>
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
              第一方预言机 - Airnode 技术与签名数据验证
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
            <Api3ExportButton
              data={
                state.overviewStats || state.airnodesData || state.oevData || state.dapisData
                  ? {
                      overviewStats: state.overviewStats,
                      airnodesData: state.airnodesData,
                      oevData: state.oevData,
                      dapisData: state.dapisData,
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
            <Api3KpiOverview
              stats={state.overviewStats}
              loading={state.loading && !state.overviewStats}
            />

            <TabNavigation tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

            <TabContent activeTab={activeTab}>
              <TabPanelWrapper tabId="overview">
                <div className="space-y-3">
                  <ContentSection title="API3 协议概览" description="第一方预言机网络状态摘要">
                    <p className="text-sm text-muted-foreground">
                      API3 是一个第一方预言机解决方案，通过 Airnode 技术实现去中心化数据馈送。 API3
                      协议提供安全、透明且可验证的链上数据，支持多种区块链网络。
                    </p>
                  </ContentSection>

                  <ContentSection title="核心特性">
                    <ContentGrid columns={3} gap="sm">
                      <div className="flex items-center gap-2.5 rounded-lg border border-border/30 bg-muted/30 p-3">
                        <div className="rounded-lg bg-blue-500/10 p-2">
                          <Server className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Airnode 技术</p>
                          <p className="text-sm font-semibold text-foreground">第一方预言机节点</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 rounded-lg border border-border/30 bg-muted/30 p-3">
                        <div className="rounded-lg bg-green-500/10 p-2">
                          <Shield className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">签名验证</p>
                          <p className="text-sm font-semibold text-foreground">可验证的数据源</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 rounded-lg border border-border/30 bg-muted/30 p-3">
                        <div className="rounded-lg bg-purple-500/10 p-2">
                          <TrendingUp className="h-5 w-5 text-purple-500" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">价格更新监控</p>
                          <p className="text-sm font-semibold text-foreground">追踪价格更新事件</p>
                        </div>
                      </div>
                    </ContentGrid>
                  </ContentSection>

                  <ContentSection title="支持的链" description="API3 支持的区块链网络">
                    <div className="flex flex-wrap gap-1.5">
                      {state.airnodesData?.metadata?.supportedChains?.map((chain) => (
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
                      <div className="rounded border border-border/20 bg-[rgba(15,23,42,0.8)] p-3">
                        <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold">
                          <Activity className="h-3.5 w-3.5 text-primary" />
                          价格更新事件
                        </h4>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">总更新事件</span>
                            <span className="font-mono font-semibold">
                              {state.oevData?.metadata?.total ?? 0}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">涉及 dAPIs</span>
                            <Badge variant="secondary" size="sm">
                              {state.oevData?.metadata?.queriedDapis?.length ?? 0}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">涉及链</span>
                            <Badge variant="secondary" size="sm">
                              {state.oevData?.metadata?.queriedChains?.length ?? 0}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3 lg:col-span-1 xl:col-span-1">
                      <div className="rounded border border-border/20 bg-[rgba(15,23,42,0.8)] p-3">
                        <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold">
                          <Server className="h-3.5 w-3.5 text-primary" />
                          Airnode 状态概览
                        </h4>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">总 Airnodes</span>
                            <span className="font-mono font-semibold">
                              {state.airnodesData?.metadata?.total ?? 0}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">在线 Airnodes</span>
                            <Badge variant="success" size="sm">
                              {state.airnodesData?.metadata?.online ?? 0}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">离线 Airnodes</span>
                            <Badge variant="destructive" size="sm">
                              {state.airnodesData?.metadata?.offline ?? 0}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="rounded border border-border/20 bg-[rgba(15,23,42,0.8)] p-3">
                        <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold">
                          <Database className="h-3.5 w-3.5 text-primary" />
                          dAPIs 状态概览
                        </h4>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">总 dAPIs</span>
                            <span className="font-mono font-semibold">
                              {state.dapisData?.metadata?.total ?? 0}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">活跃 dAPIs</span>
                            <Badge variant="success" size="sm">
                              {state.dapisData?.metadata?.active ?? 0}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">非活跃 dAPIs</span>
                            <Badge variant="warning" size="sm">
                              {state.dapisData?.metadata?.inactive ?? 0}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabPanelWrapper>

              <TabPanelWrapper tabId="airnodes">
                {loadedTabs.has('airnodes') ? (
                  <div className="space-y-4">
                    {state.loading && !state.airnodesData ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : state.airnodesData ? (
                      <>
                        {state.airnodesData.airnodes.length === 0 ? (
                          <div className="rounded-xl border border-border/30 bg-card/30 py-12 text-center text-muted-foreground">
                            <Server className="mx-auto h-12 w-12 opacity-50" />
                            <p className="mt-2">暂无 Airnode 数据</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {state.airnodesData.airnodes.map((airnode, index) => (
                              <div
                                key={index}
                                className="flex cursor-pointer items-center justify-between rounded-xl border border-border/30 bg-card/30 p-4 transition-colors hover:bg-muted/30"
                                onClick={() =>
                                  router.push(`/oracle/api3/airnode/${airnode.address}`)
                                }
                              >
                                <div className="flex items-center gap-4">
                                  <div className="rounded-lg bg-primary/10 p-2">
                                    <Server className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">Airnode</span>
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
                                      最后心跳:{' '}
                                      {airnode.lastHeartbeat
                                        ? formatTime(airnode.lastHeartbeat)
                                        : '-'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-6">
                                  <div className="text-right">
                                    <p className="text-xs text-muted-foreground">链</p>
                                    <Badge variant="secondary" className="text-xs">
                                      {airnode.chain}
                                    </Badge>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-muted-foreground">响应时间</p>
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
                ) : (
                  <div className="space-y-4">
                    <Skeleton className="h-64 w-full" />
                  </div>
                )}
              </TabPanelWrapper>

              <TabPanelWrapper tabId="data">
                {loadedTabs.has('data') ? (
                  <div className="space-y-4">
                    <PriceUpdateMonitor loading={state.loading} />
                    <DapiList />
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
                    <GasCostAnalysis />
                    <CrossProtocolComparison />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                )}
              </TabPanelWrapper>

              <TabPanelWrapper tabId="tools">
                {loadedTabs.has('tools') ? (
                  <div className="space-y-4">
                    <SignatureVerifyPanel />
                    <AlertConfigPanel />
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
