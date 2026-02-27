'use client';

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';

import {
  RefreshCw,
  Zap,
  Users,
  Activity,
  Server,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  LayoutDashboard,
  BarChart3,
} from 'lucide-react';

import {
  ContentSection,
  ContentGrid,
  ExportButton,
  AutoRefreshControl,
  Breadcrumb,
  type SortState,
  SortableTableHeader,
} from '@/components/common';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { ErrorBanner } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import {
  TabNavigation,
  TabContent,
  TabPanelWrapper,
  useTabNavigation,
  type TabItem,
} from '@/features/oracle/chainlink/components';
import { pythExportConfig } from '@/features/oracle/pyth';
import { PythKpiOverview, PythTopStatusBar } from '@/features/oracle/pyth/components';
import { useI18n } from '@/i18n';
import { fetchApiData } from '@/shared/utils';
import { formatLatency } from '@/shared/utils/format';
import { cn } from '@/shared/utils/ui';
import type { PythOverviewStats, NetworkHealthStatus } from '@/types/common';

const ConfidenceComparisonChart = lazy(() =>
  import('@/features/oracle/pyth/components').then((mod) => ({
    default: mod.ConfidenceComparisonChart,
  })),
);

const CrossChainPriceComparison = lazy(() =>
  import('@/features/oracle/pyth/components').then((mod) => ({
    default: mod.CrossChainPriceComparison,
  })),
);

const PriceHistoryChart = lazy(() =>
  import('@/features/oracle/pyth/components').then((mod) => ({
    default: mod.PriceHistoryChart,
  })),
);

interface PublisherStats {
  total: number;
  active: number;
  inactive: number;
}

interface PriceFeedStats {
  total: number;
  active: number;
  avgUpdateFrequency: number;
  avgLatency: number;
}

interface HermesStatus {
  status: 'healthy' | 'degraded' | 'down';
  endpoints: Array<{
    name: string;
    url: string;
    status: 'online' | 'offline';
    latency: number;
  }>;
}

interface PublisherDetail {
  id: string;
  name: string;
  credibilityScore: number;
  publishFrequency: number;
  supportedFeeds: number;
  status: 'active' | 'inactive' | 'degraded';
}

type PriceFeedCategory = 'Crypto' | 'Equities' | 'FX' | 'Commodities';

interface PriceFeedDetail {
  id: string;
  name: string;
  symbol: string;
  latestPrice: number;
  priceChange: number;
  updateFrequency: number;
  avgLatency: number;
  status: 'active' | 'stale' | 'error';
  category: PriceFeedCategory;
  confidenceInterval: number;
  anomalies: {
    priceVolatility: boolean;
    highConfidenceInterval: boolean;
  };
}

const mockPublisherDetails: PublisherDetail[] = [
  {
    id: '1',
    name: 'Binance',
    credibilityScore: 98,
    publishFrequency: 2.3,
    supportedFeeds: 156,
    status: 'active',
  },
  {
    id: '2',
    name: 'OKX',
    credibilityScore: 95,
    publishFrequency: 2.5,
    supportedFeeds: 142,
    status: 'active',
  },
  {
    id: '3',
    name: 'Coinbase',
    credibilityScore: 97,
    publishFrequency: 3.1,
    supportedFeeds: 98,
    status: 'active',
  },
  {
    id: '4',
    name: 'Kraken',
    credibilityScore: 94,
    publishFrequency: 2.8,
    supportedFeeds: 87,
    status: 'active',
  },
  {
    id: '5',
    name: 'Bybit',
    credibilityScore: 92,
    publishFrequency: 2.4,
    supportedFeeds: 134,
    status: 'active',
  },
  {
    id: '6',
    name: 'Gate.io',
    credibilityScore: 88,
    publishFrequency: 3.5,
    supportedFeeds: 76,
    status: 'degraded',
  },
  {
    id: '7',
    name: 'KuCoin',
    credibilityScore: 85,
    publishFrequency: 4.2,
    supportedFeeds: 65,
    status: 'inactive',
  },
  {
    id: '8',
    name: 'Bitget',
    credibilityScore: 90,
    publishFrequency: 2.9,
    supportedFeeds: 89,
    status: 'active',
  },
];

const mockPriceFeedDetails: PriceFeedDetail[] = [
  {
    id: '1',
    name: 'Bitcoin',
    symbol: 'BTC/USD',
    latestPrice: 67234.56,
    priceChange: 2.34,
    updateFrequency: 1.2,
    avgLatency: 85,
    status: 'active',
    category: 'Crypto',
    confidenceInterval: 0.8,
    anomalies: { priceVolatility: false, highConfidenceInterval: false },
  },
  {
    id: '2',
    name: 'Ethereum',
    symbol: 'ETH/USD',
    latestPrice: 3456.78,
    priceChange: -1.23,
    updateFrequency: 1.5,
    avgLatency: 92,
    status: 'active',
    category: 'Crypto',
    confidenceInterval: 1.0,
    anomalies: { priceVolatility: false, highConfidenceInterval: false },
  },
  {
    id: '3',
    name: 'Solana',
    symbol: 'SOL/USD',
    latestPrice: 178.45,
    priceChange: 5.67,
    updateFrequency: 1.8,
    avgLatency: 78,
    status: 'active',
    category: 'Crypto',
    confidenceInterval: 1.5,
    anomalies: { priceVolatility: true, highConfidenceInterval: false },
  },
  {
    id: '4',
    name: 'BNB',
    symbol: 'BNB/USD',
    latestPrice: 598.23,
    priceChange: 0.89,
    updateFrequency: 2.1,
    avgLatency: 105,
    status: 'active',
    category: 'Crypto',
    confidenceInterval: 1.2,
    anomalies: { priceVolatility: false, highConfidenceInterval: false },
  },
  {
    id: '5',
    name: 'XRP',
    symbol: 'XRP/USD',
    latestPrice: 0.5234,
    priceChange: -0.45,
    updateFrequency: 2.3,
    avgLatency: 112,
    status: 'active',
    category: 'Crypto',
    confidenceInterval: 2.5,
    anomalies: { priceVolatility: false, highConfidenceInterval: true },
  },
  {
    id: '6',
    name: 'Cardano',
    symbol: 'ADA/USD',
    latestPrice: 0.4567,
    priceChange: 1.23,
    updateFrequency: 3.2,
    avgLatency: 156,
    status: 'stale',
    category: 'Crypto',
    confidenceInterval: 1.8,
    anomalies: { priceVolatility: false, highConfidenceInterval: false },
  },
  {
    id: '7',
    name: 'Avalanche',
    symbol: 'AVAX/USD',
    latestPrice: 35.67,
    priceChange: 3.45,
    updateFrequency: 1.9,
    avgLatency: 88,
    status: 'active',
    category: 'Crypto',
    confidenceInterval: 1.0,
    anomalies: { priceVolatility: false, highConfidenceInterval: false },
  },
  {
    id: '8',
    name: 'Dogecoin',
    symbol: 'DOGE/USD',
    latestPrice: 0.1234,
    priceChange: -7.89,
    updateFrequency: 4.5,
    avgLatency: 234,
    status: 'error',
    category: 'Crypto',
    confidenceInterval: 3.2,
    anomalies: { priceVolatility: true, highConfidenceInterval: true },
  },
];

interface PythDashboardState {
  overviewStats: PythOverviewStats | null;
  publisherStats: PublisherStats | null;
  priceFeedStats: PriceFeedStats | null;
  hermesStatus: HermesStatus | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  autoRefreshEnabled: boolean;
  refreshInterval: number;
  timeUntilRefresh: number;
}

export default function PythPage() {
  const { t } = useI18n();

  const TABS: TabItem[] = useMemo(
    () => [
      {
        id: 'overview',
        label: t('pyth.tabs.overview'),
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
      {
        id: 'publishers',
        label: t('pyth.tabs.publishers'),
        icon: <Users className="h-4 w-4" />,
      },
      {
        id: 'price-feeds',
        label: t('pyth.tabs.priceFeeds'),
        icon: <Activity className="h-4 w-4" />,
      },
      {
        id: 'analysis',
        label: t('pyth.tabs.analysis'),
        icon: <BarChart3 className="h-4 w-4" />,
      },
      {
        id: 'hermes',
        label: t('pyth.tabs.hermes'),
        icon: <Server className="h-4 w-4" />,
      },
    ],
    [t],
  );

  const [state, setState] = useState<PythDashboardState>({
    overviewStats: null,
    publisherStats: null,
    priceFeedStats: null,
    hermesStatus: null,
    loading: true,
    error: null,
    lastUpdated: null,
    autoRefreshEnabled: false,
    refreshInterval: 30000,
    timeUntilRefresh: 0,
  });

  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['overview']));

  const [publisherSort, setPublisherSort] = useState<SortState | null>(null);
  const [priceFeedSort, setPriceFeedSort] = useState<SortState | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PriceFeedCategory | 'All'>('All');

  const updateState = useCallback((partial: Partial<PythDashboardState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const fetchInitialData = useCallback(async () => {
    try {
      updateState({ loading: true, error: null });

      const [publishersRes, priceFeedsRes, hermesRes] = await Promise.all([
        fetchApiData<PublisherStats>('/api/oracle/pyth/publishers').catch(() => null),
        fetchApiData<PriceFeedStats>('/api/oracle/pyth/price-feeds').catch(() => null),
        fetchApiData<HermesStatus>('/api/oracle/pyth/hermes').catch(() => null),
      ]);

      const publisherStats = publishersRes ?? { total: 8, active: 6, inactive: 2 };
      const priceFeedStats = priceFeedsRes ?? {
        total: 150,
        active: 142,
        avgUpdateFrequency: 2.5,
        avgLatency: 120,
      };

      const overviewStats: PythOverviewStats = {
        totalPublishers: publisherStats.total,
        activePublishers: publisherStats.active,
        activePriceFeeds: priceFeedStats.active,
        avgLatency: priceFeedStats.avgLatency,
      };

      updateState({
        overviewStats,
        publisherStats,
        priceFeedStats,
        hermesStatus: hermesRes,
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
      publisherStats: state.publisherStats,
      priceFeedStats: state.priceFeedStats,
      hermesStatus: state.hermesStatus,
      generatedAt: state.lastUpdated?.toISOString() || new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pyth-dashboard-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [
    state.overviewStats,
    state.publisherStats,
    state.priceFeedStats,
    state.hermesStatus,
    state.lastUpdated,
  ]);

  const healthStatus: NetworkHealthStatus = useMemo(() => {
    if (state.hermesStatus?.status === 'down') return 'critical';
    if (state.hermesStatus?.status === 'degraded') return 'warning';
    if (state.overviewStats && state.overviewStats.totalPublishers > 0) {
      const activeRatio =
        state.overviewStats.activePublishers / state.overviewStats.totalPublishers;
      if (activeRatio >= 0.8) return 'healthy';
      if (activeRatio >= 0.5) return 'warning';
      return 'critical';
    }
    return 'healthy';
  }, [state.hermesStatus, state.overviewStats]);

  const handlePublisherSort = useCallback((key: string) => {
    setPublisherSort((prev) => {
      if (prev?.key === key) {
        return prev.direction === 'asc' ? { key, direction: 'desc' } : null;
      }
      return { key, direction: 'asc' };
    });
  }, []);

  const handlePriceFeedSort = useCallback((key: string) => {
    setPriceFeedSort((prev) => {
      if (prev?.key === key) {
        return prev.direction === 'asc' ? { key, direction: 'desc' } : null;
      }
      return { key, direction: 'asc' };
    });
  }, []);

  const sortedPublisherDetails = useMemo(() => {
    if (!publisherSort) return mockPublisherDetails;
    const { key, direction } = publisherSort;
    const sorted = [...mockPublisherDetails].sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;
      switch (key) {
        case 'name':
          aVal = a.name;
          bVal = b.name;
          break;
        case 'credibilityScore':
          aVal = a.credibilityScore;
          bVal = b.credibilityScore;
          break;
        case 'publishFrequency':
          aVal = a.publishFrequency;
          bVal = b.publishFrequency;
          break;
        case 'supportedFeeds':
          aVal = a.supportedFeeds;
          bVal = b.supportedFeeds;
          break;
        default:
          return 0;
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return direction === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    return sorted;
  }, [publisherSort]);

  const sortedPriceFeedDetails = useMemo(() => {
    let filtered = [...mockPriceFeedDetails];
    if (selectedCategory !== 'All') {
      filtered = filtered.filter((feed) => feed.category === selectedCategory);
    }
    if (priceFeedSort) {
      const { key, direction } = priceFeedSort;
      filtered.sort((a, b) => {
        let aVal: number | string = 0;
        let bVal: number | string = 0;
        switch (key) {
          case 'name':
            aVal = a.name;
            bVal = b.name;
            break;
          case 'latestPrice':
            aVal = a.latestPrice;
            bVal = b.latestPrice;
            break;
          case 'updateFrequency':
            aVal = a.updateFrequency;
            bVal = b.updateFrequency;
            break;
          case 'avgLatency':
            aVal = a.avgLatency;
            bVal = b.avgLatency;
            break;
          default:
            return 0;
        }
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return direction === 'asc'
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      });
    }
    return filtered;
  }, [priceFeedSort, selectedCategory]);

  const getLatencyColor = (ms: number) => {
    if (ms < 200) return 'text-green-500';
    if (ms < 500) return 'text-yellow-500';
    return 'text-red-500';
  };

  const hasAnomaly = (feed: PriceFeedDetail) => {
    return feed.anomalies.priceVolatility || feed.anomalies.highConfidenceInterval;
  };

  const breadcrumbItems = [{ label: t('nav.oracle'), href: '/oracle' }, { label: 'Pyth' }];

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
    <div className="min-h-screen pb-16 md:pb-0">
      <PythTopStatusBar
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
              <Zap className="h-5 w-5 text-yellow-500" />
              <span>Pyth Network</span>
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
            <p className="mt-0.5 text-xs text-muted-foreground">{t('pyth.pageDescription')}</p>
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
                state.overviewStats ||
                state.publisherStats ||
                state.priceFeedStats ||
                state.hermesStatus
                  ? {
                      overviewStats: state.overviewStats,
                      publisherStats: state.publisherStats,
                      priceFeedStats: state.priceFeedStats,
                      hermesStatus: state.hermesStatus,
                      generatedAt: state.lastUpdated?.toISOString() || new Date().toISOString(),
                    }
                  : null
              }
              config={pythExportConfig}
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
            <PythKpiOverview stats={state.overviewStats} loading={state.loading} />

            <TabNavigation tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

            <TabContent activeTab={activeTab}>
              <TabPanelWrapper tabId="overview">
                <div className="space-y-3">
                  <ContentSection
                    title={t('pyth.overview.title')}
                    description={t('pyth.overview.description')}
                  >
                    <p className="text-sm text-muted-foreground">
                      {t('pyth.overview.introduction')}
                    </p>
                  </ContentSection>

                  <ContentSection title={t('pyth.features.title')}>
                    <ContentGrid columns={3} gap="sm">
                      <div className="flex items-center gap-2.5 border-b border-border/30 pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-3">
                        <div className="rounded-lg bg-yellow-500/10 p-2">
                          <Zap className="h-5 w-5 text-yellow-500" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            {t('pyth.features.highFrequency.label')}
                          </p>
                          <p className="text-sm font-semibold text-foreground">
                            {t('pyth.features.highFrequency.value')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 border-b border-border/30 pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-3">
                        <div className="rounded-lg bg-green-500/10 p-2">
                          <Users className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            {t('pyth.features.publishers.label')}
                          </p>
                          <p className="text-sm font-semibold text-foreground">
                            {t('pyth.features.publishers.value')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="rounded-lg bg-purple-500/10 p-2">
                          <Shield className="h-5 w-5 text-purple-500" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            {t('pyth.features.dataIntegrity.label')}
                          </p>
                          <p className="text-sm font-semibold text-foreground">
                            {t('pyth.features.dataIntegrity.value')}
                          </p>
                        </div>
                      </div>
                    </ContentGrid>
                  </ContentSection>

                  <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                    <div className="lg:col-span-1 xl:col-span-2">
                      <Suspense fallback={<Skeleton className="h-80 w-full" />}>
                        <PriceHistoryChart isLoading={state.loading} />
                      </Suspense>
                    </div>
                    <div className="space-y-3 lg:col-span-1 xl:col-span-1">
                      <div className="border-b border-border/30 pb-3">
                        <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold">
                          <Users className="h-3.5 w-3.5 text-primary" />
                          {t('pyth.publisher.statusOverview')}
                        </h4>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {t('pyth.publisher.totalPublishers')}
                            </span>
                            <span className="font-mono font-semibold">
                              {state.publisherStats?.total ?? mockPublisherDetails.length}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {t('pyth.publisher.activePublishers')}
                            </span>
                            <Badge variant="success" size="sm">
                              {state.publisherStats?.active ??
                                mockPublisherDetails.filter((p) => p.status === 'active').length}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {t('pyth.publisher.inactivePublishers')}
                            </span>
                            <Badge variant="warning" size="sm">
                              {state.publisherStats?.inactive ??
                                mockPublisherDetails.filter((p) => p.status !== 'active').length}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="border-b border-border/30 pb-3">
                        <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold">
                          <Activity className="h-3.5 w-3.5 text-primary" />
                          {t('pyth.priceStatus.statistics')}
                        </h4>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {t('pyth.priceStatus.totalFeeds')}
                            </span>
                            <span className="font-mono font-semibold">
                              {state.priceFeedStats?.total ?? mockPriceFeedDetails.length}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {t('pyth.priceStatus.activeFeeds')}
                            </span>
                            <Badge variant="success" size="sm">
                              {state.priceFeedStats?.active ??
                                mockPriceFeedDetails.filter((f) => f.status === 'active').length}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {t('pyth.priceStatus.avgUpdateFrequency')}
                            </span>
                            <span className="font-mono font-semibold">
                              {state.priceFeedStats?.avgUpdateFrequency ?? 2.5}s
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {t('pyth.priceStatus.avgLatency')}
                            </span>
                            <span
                              className={cn(
                                'font-mono font-semibold',
                                getLatencyColor(state.priceFeedStats?.avgLatency ?? 120),
                              )}
                            >
                              {formatLatency(state.priceFeedStats?.avgLatency ?? 120)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabPanelWrapper>

              <TabPanelWrapper tabId="publishers">
                {loadedTabs.has('publishers') ? (
                  <div className="border-b border-border/30">
                    <div className="mb-3 flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">{t('pyth.publisher.detailedList')}</h3>
                    </div>
                    <p className="mb-3 text-sm text-muted-foreground">
                      {t('pyth.publisher.detailedListDesc')}
                    </p>
                    <div className="overflow-x-auto">
                      {state.loading ? (
                        <div className="space-y-2 p-4">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-12 animate-pulse rounded bg-muted" />
                          ))}
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <SortableTableHeader
                                sortKey="name"
                                currentSort={publisherSort}
                                onSort={handlePublisherSort}
                              >
                                {t('pyth.publisher.name')}
                              </SortableTableHeader>
                              <SortableTableHeader
                                sortKey="credibilityScore"
                                currentSort={publisherSort}
                                onSort={handlePublisherSort}
                                className="text-right"
                              >
                                {t('pyth.publisher.credibilityScore')}
                              </SortableTableHeader>
                              <SortableTableHeader
                                sortKey="publishFrequency"
                                currentSort={publisherSort}
                                onSort={handlePublisherSort}
                                className="text-right"
                              >
                                {t('pyth.publisher.publishFrequency')} (s)
                              </SortableTableHeader>
                              <SortableTableHeader
                                sortKey="supportedFeeds"
                                currentSort={publisherSort}
                                onSort={handlePublisherSort}
                                className="text-right"
                              >
                                {t('pyth.publisher.supportedFeeds')}
                              </SortableTableHeader>
                              <TableHead className="text-center">
                                {t('pyth.publisher.status')}
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sortedPublisherDetails.map((publisher) => (
                              <TableRow key={publisher.id}>
                                <TableCell className="font-medium">{publisher.name}</TableCell>
                                <TableCell className="text-right">
                                  <span
                                    className={cn(
                                      'font-semibold',
                                      publisher.credibilityScore >= 95
                                        ? 'text-green-500'
                                        : publisher.credibilityScore >= 90
                                          ? 'text-blue-500'
                                          : publisher.credibilityScore >= 85
                                            ? 'text-yellow-500'
                                            : 'text-red-500',
                                    )}
                                  >
                                    {publisher.credibilityScore}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  {publisher.publishFrequency}s
                                </TableCell>
                                <TableCell className="text-right">
                                  {publisher.supportedFeeds}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge
                                    variant={
                                      publisher.status === 'active'
                                        ? 'success'
                                        : publisher.status === 'degraded'
                                          ? 'warning'
                                          : 'destructive'
                                    }
                                    className="flex items-center justify-center gap-1"
                                  >
                                    {publisher.status === 'active' && (
                                      <CheckCircle className="h-3 w-3" />
                                    )}
                                    {publisher.status === 'degraded' && (
                                      <AlertTriangle className="h-3 w-3" />
                                    )}
                                    {publisher.status === 'inactive' && (
                                      <XCircle className="h-3 w-3" />
                                    )}
                                    {publisher.status === 'active'
                                      ? t('pyth.status.active')
                                      : publisher.status === 'degraded'
                                        ? t('pyth.status.degraded')
                                        : t('pyth.status.offline')}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </div>
                ) : (
                  <Skeleton className="h-96 w-full" />
                )}
              </TabPanelWrapper>

              <TabPanelWrapper tabId="price-feeds">
                {loadedTabs.has('price-feeds') ? (
                  <div className="border-b border-border/30">
                    <div className="mb-3 flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">{t('pyth.priceStatus.detailedStats')}</h3>
                    </div>
                    <p className="mb-3 text-sm text-muted-foreground">
                      {t('pyth.priceStatus.detailedStatsDesc')}
                    </p>
                    <div className="mb-3 flex gap-2">
                      {(['All', 'Crypto', 'Equities', 'FX', 'Commodities'] as const).map(
                        (category) => (
                          <Button
                            key={category}
                            variant={selectedCategory === category ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedCategory(category)}
                          >
                            {category === 'All' ? t('common.all') : category}
                          </Button>
                        ),
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      {state.loading ? (
                        <div className="space-y-2 p-4">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-12 animate-pulse rounded bg-muted" />
                          ))}
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <SortableTableHeader
                                sortKey="name"
                                currentSort={priceFeedSort}
                                onSort={handlePriceFeedSort}
                              >
                                {t('pyth.priceStatus.feedName')}
                              </SortableTableHeader>
                              <TableHead>{t('pyth.priceStatus.categoryName')}</TableHead>
                              <SortableTableHeader
                                sortKey="latestPrice"
                                currentSort={priceFeedSort}
                                onSort={handlePriceFeedSort}
                                className="text-right"
                              >
                                {t('pyth.priceStatus.latestPrice')}
                              </SortableTableHeader>
                              <SortableTableHeader
                                sortKey="updateFrequency"
                                currentSort={priceFeedSort}
                                onSort={handlePriceFeedSort}
                                className="text-right"
                              >
                                {t('pyth.priceStatus.updateFrequency')} (s)
                              </SortableTableHeader>
                              <TableHead className="text-right">
                                {t('pyth.priceStatus.confidenceInterval')}
                              </TableHead>
                              <TableHead className="text-center">
                                {t('pyth.publisher.status')}
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sortedPriceFeedDetails.map((feed) => (
                              <TableRow
                                key={feed.id}
                                className={cn(
                                  hasAnomaly(feed) && 'bg-red-50/50 dark:bg-red-950/20',
                                )}
                              >
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {hasAnomaly(feed) && (
                                      <AlertTriangle className="h-4 w-4 text-red-500" />
                                    )}
                                    <div className="flex flex-col">
                                      <span className="font-medium">{feed.name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {feed.symbol}
                                      </span>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{feed.category}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex flex-col items-end">
                                    <span className="font-semibold">
                                      {feed.latestPrice >= 1
                                        ? feed.latestPrice.toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : feed.latestPrice.toFixed(4)}
                                    </span>
                                    <span
                                      className={cn(
                                        'text-xs',
                                        feed.priceChange >= 0 ? 'text-green-500' : 'text-red-500',
                                      )}
                                    >
                                      {feed.priceChange >= 0 ? '+' : ''}
                                      {feed.priceChange.toFixed(2)}%
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  {feed.updateFrequency}s
                                </TableCell>
                                <TableCell className="text-right">
                                  <span
                                    className={cn(
                                      'font-medium',
                                      feed.anomalies.highConfidenceInterval
                                        ? 'text-red-500'
                                        : 'text-muted-foreground',
                                    )}
                                  >
                                    {feed.confidenceInterval.toFixed(2)}%
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge
                                    variant={
                                      feed.status === 'active'
                                        ? 'success'
                                        : feed.status === 'stale'
                                          ? 'warning'
                                          : 'destructive'
                                    }
                                    className="flex items-center justify-center gap-1"
                                  >
                                    {feed.status === 'active' && (
                                      <CheckCircle className="h-3 w-3" />
                                    )}
                                    {feed.status === 'stale' && (
                                      <AlertTriangle className="h-3 w-3" />
                                    )}
                                    {feed.status === 'error' && <XCircle className="h-3 w-3" />}
                                    {feed.status === 'active'
                                      ? t('pyth.status.active')
                                      : feed.status === 'stale'
                                        ? t('pyth.status.delayed')
                                        : t('pyth.status.abnormal')}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </div>
                ) : (
                  <Skeleton className="h-96 w-full" />
                )}
              </TabPanelWrapper>

              <TabPanelWrapper tabId="analysis">
                {loadedTabs.has('analysis') ? (
                  <div className="space-y-4">
                    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                      <CrossChainPriceComparison isLoading={state.loading} />
                    </Suspense>
                    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                      <ConfidenceComparisonChart isLoading={state.loading} />
                    </Suspense>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                )}
              </TabPanelWrapper>

              <TabPanelWrapper tabId="hermes">
                {loadedTabs.has('hermes') ? (
                  <div className="border-b border-border/30">
                    <div className="mb-3 flex items-center gap-2">
                      <Server className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">{t('pyth.hermes.title')}</h3>
                    </div>
                    <p className="mb-3 text-sm text-muted-foreground">
                      {t('pyth.hermes.description')}
                    </p>
                    {state.loading && !state.hermesStatus ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between border-b border-border/20 pb-3"
                          >
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-16" />
                          </div>
                        ))}
                      </div>
                    ) : state.hermesStatus ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={
                              state.hermesStatus.status === 'healthy'
                                ? 'success'
                                : state.hermesStatus.status === 'degraded'
                                  ? 'warning'
                                  : 'destructive'
                            }
                          >
                            {state.hermesStatus.status === 'healthy'
                              ? t('pyth.hermes.status.running')
                              : state.hermesStatus.status === 'degraded'
                                ? t('pyth.hermes.status.degraded')
                                : t('pyth.hermes.status.error')}
                          </Badge>
                        </div>
                        <div className="space-y-3">
                          {state.hermesStatus.endpoints.map((endpoint, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between border-b border-border/20 pb-3"
                            >
                              <div>
                                <p className="font-medium">{endpoint.name}</p>
                                <p className="text-sm text-muted-foreground">{endpoint.url}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span
                                  className={cn(
                                    'text-sm font-medium',
                                    getLatencyColor(endpoint.latency),
                                  )}
                                >
                                  {formatLatency(endpoint.latency)}
                                </span>
                                <div
                                  className={`h-2 w-2 rounded-full ${endpoint.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-muted-foreground">
                        <Server className="mx-auto h-12 w-12 opacity-50" />
                        <p className="mt-2">{t('pyth.hermes.loading')}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <Skeleton className="h-96 w-full" />
                )}
              </TabPanelWrapper>
            </TabContent>
          </>
        )}
      </div>
    </div>
  );
}
