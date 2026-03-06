'use client';

import { useState, useCallback, useMemo, lazy, Suspense } from 'react';

import {
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
  Info,
} from 'lucide-react';

import {
  ContentSection,
  ContentGrid,
  type SortState,
  SortableTableHeader,
} from '@/components/common';
import { useProtocolData } from '@/components/oracle/hooks/useProtocolData';
import {
  ProtocolPageLayout,
  TabPanelWrapper,
  type TabItem,
} from '@/components/oracle/layouts/ProtocolPageLayout';
import { Badge, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatLatency } from '@/shared/utils/format';
import { cn } from '@/shared/utils/ui';
import type { NetworkHealthStatus } from '@/types/common';
import type { KpiCardData } from '@/types/shared/kpi';

// Pyth SSE 相关组件和 Hook
import { usePythStream } from '@/features/oracle/pyth/hooks/usePythStream';
import { PythStreamStatus } from '@/features/oracle/pyth/components/PythStreamStatus';
import { RefreshRateSelector } from '@/features/oracle/pyth/components/RefreshRateSelector';
import { PublisherSourceTypeLegend } from '@/features/oracle/pyth/components/PublisherSourceTypeLegend';

const ConfidenceComparisonChart = lazy(() =>
  import('@/features/oracle/pyth/components').then((mod) => ({
    default: mod.ConfidenceComparisonChart,
  })),
);

const PythCrossChainComparison = lazy(() =>
  import('@/features/oracle/pyth/components').then((mod) => ({
    default: mod.PythCrossChainComparison,
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

interface PythDashboardData {
  publisherStats: PublisherStats;
  priceFeedStats: PriceFeedStats;
  hermesStatus: HermesStatus | null;
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

function transformPythData(raw: unknown): PythDashboardData {
  const data = raw as {
    publisherStats?: PublisherStats;
    priceFeedStats?: PriceFeedStats;
    hermesStatus?: HermesStatus;
  };

  return {
    publisherStats: data.publisherStats ?? { total: 8, active: 6, inactive: 2 },
    priceFeedStats: data.priceFeedStats ?? {
      total: 150,
      active: 142,
      avgUpdateFrequency: 2.5,
      avgLatency: 120,
    },
    hermesStatus: data.hermesStatus ?? null,
  };
}

export default function PythPage() {
  const { t } = useI18n();

  const [publisherSort, setPublisherSort] = useState<SortState | null>(null);
  const [priceFeedSort, setPriceFeedSort] = useState<SortState | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PriceFeedCategory | 'All'>('All');
  
  // SSE 实时价格推送
  const [refreshRate, setRefreshRate] = useState<number>(30000); // 默认 30 秒
  const { 
    isConnected, 
    isConnecting, 
    prices: streamPrices, 
    lastUpdate: streamLastUpdate, 
    error: streamError, 
    stats 
  } = usePythStream({
    symbols: ['BTC', 'ETH', 'SOL', 'AVAX', 'LINK'],
    autoReconnect: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 3,
  });

  const {
    data: dashboardData,
    isLoading,
    isRefreshing,
    isError,
    error,
    lastUpdated,
    refresh,
  } = useProtocolData<PythDashboardData>({
    protocol: 'pyth',
    endpoint: '/api/oracle/pyth/dashboard',
    transformData: transformPythData,
    refreshInterval: 30000,
    cacheKey: 'pyth_dashboard',
    cacheTTL: 5 * 60 * 1000,
  });

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

  const healthStatus: NetworkHealthStatus = useMemo(() => {
    if (dashboardData?.hermesStatus?.status === 'down') return 'critical';
    if (dashboardData?.hermesStatus?.status === 'degraded') return 'warning';
    if (dashboardData?.publisherStats) {
      const activeRatio = dashboardData.publisherStats.active / dashboardData.publisherStats.total;
      if (activeRatio >= 0.8) return 'healthy';
      if (activeRatio >= 0.5) return 'warning';
      return 'critical';
    }
    return 'healthy';
  }, [dashboardData]);

  const kpiCards: KpiCardData[] = useMemo(() => {
    if (!dashboardData) {
      return [
        { value: '-', label: t('pyth.publisher.totalPublishers'), trend: 'neutral' },
        { value: '-', label: t('pyth.publisher.activePublishers'), trend: 'neutral' },
        { value: '-', label: t('pyth.priceStatus.activeFeeds'), trend: 'neutral' },
        { value: '-', label: t('pyth.priceStatus.avgLatency'), trend: 'neutral' },
      ];
    }

    const { publisherStats, priceFeedStats } = dashboardData;
    const latencyStatus =
      priceFeedStats.avgLatency < 200
        ? 'success'
        : priceFeedStats.avgLatency < 500
          ? 'warning'
          : 'error';

    return [
      {
        value: publisherStats.total,
        label: t('pyth.publisher.totalPublishers'),
        trend: 'neutral',
      },
      {
        value: publisherStats.active,
        label: t('pyth.publisher.activePublishers'),
        trend: 'up',
        status: publisherStats.active > 0 ? 'success' : 'warning',
      },
      {
        value: priceFeedStats.active,
        label: t('pyth.priceStatus.activeFeeds'),
        trend: 'up',
        status: 'success',
      },
      {
        value: formatLatency(priceFeedStats.avgLatency),
        label: t('pyth.priceStatus.avgLatency'),
        trend: 'down',
        status: latencyStatus,
      },
    ];
  }, [dashboardData, t]);

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

  const exportData = useMemo(() => {
    if (!dashboardData) return null;
    return {
      publisherStats: dashboardData.publisherStats,
      priceFeedStats: dashboardData.priceFeedStats,
      hermesStatus: dashboardData.hermesStatus,
      generatedAt: lastUpdated?.toISOString() || new Date().toISOString(),
    };
  }, [dashboardData, lastUpdated]);

  return (
    <ProtocolPageLayout
      protocol="pyth"
      title="Pyth Network"
      icon={<Zap className="h-5 w-5 text-purple-500" />}
      description={t('pyth.pageDescription')}
      healthStatus={healthStatus}
      kpiCards={kpiCards}
      tabs={TABS}
      loading={isLoading || isRefreshing}
      error={isError ? error?.message : null}
      lastUpdated={lastUpdated}
      onRefresh={refresh}
      exportData={exportData}
      exportFilename={`pyth-dashboard-${new Date().toISOString().split('T')[0]}.json`}
    >
      <TabPanelWrapper tabId="overview">
        <div className="space-y-3">
          {/* Pull Oracle 机制说明 */}
          <ContentSection
            title={t('pyth.tabs.overview')}
            description={
              <div className="flex items-center gap-2">
                <span>{t('pyth.overview.description')}</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-md">
                      <div className="space-y-2 text-sm">
                        <p className="font-semibold">Pull Oracle（按需拉取）模型</p>
                        <p>
                          Pyth 采用创新的 Pull Oracle 机制，智能合约在需要时才主动请求价格数据，
                          而非传统的定时推送模式。
                        </p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li>✅ <strong>低成本</strong>：只为实际使用的数据付费，节省 90% Gas 费用</li>
                          <li>✅ <strong>低延迟</strong>：亚秒级更新，最快 400ms</li>
                          <li>✅ <strong>高效率</strong>：避免链上不必要的数据更新</li>
                        </ul>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            }
          >
            <p className="text-sm text-muted-foreground">{t('pyth.overview.introduction')}</p>
            
            {/* SSE 实时推送状态 */}
            <div className="mt-4 flex items-center justify-between border-t border-border/30 pt-3">
              <PythStreamStatus
                isConnected={isConnected}
                isConnecting={isConnecting}
                lastUpdate={streamLastUpdate}
                updateCount={stats.updateCount}
                reconnectCount={stats.reconnectCount}
              />
              <RefreshRateSelector
                currentRate={refreshRate}
                onChange={setRefreshRate}
              />
            </div>
            
            {streamError && (
              <div className="mt-2 text-xs text-red-500">
                ⚠️ SSE 连接错误：{streamError.message}
              </div>
            )}
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
                <PriceHistoryChart isLoading={isLoading} />
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
                      {dashboardData?.publisherStats?.total ?? mockPublisherDetails.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t('pyth.publisher.activePublishers')}
                    </span>
                    <Badge variant="success" size="sm">
                      {dashboardData?.publisherStats?.active ??
                        mockPublisherDetails.filter((p) => p.status === 'active').length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t('pyth.publisher.inactivePublishers')}
                    </span>
                    <Badge variant="warning" size="sm">
                      {dashboardData?.publisherStats?.inactive ??
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
                      {dashboardData?.priceFeedStats?.total ?? mockPriceFeedDetails.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t('pyth.priceStatus.activeFeeds')}
                    </span>
                    <Badge variant="success" size="sm">
                      {dashboardData?.priceFeedStats?.active ??
                        mockPriceFeedDetails.filter((f) => f.status === 'active').length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t('pyth.priceStatus.avgUpdateFrequency')}
                    </span>
                    <span className="font-mono font-semibold">
                      {dashboardData?.priceFeedStats?.avgUpdateFrequency ?? 2.5}s
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t('pyth.priceStatus.avgLatency')}
                    </span>
                    <span
                      className={cn(
                        'font-mono font-semibold',
                        getLatencyColor(dashboardData?.priceFeedStats?.avgLatency ?? 120),
                      )}
                    >
                      {formatLatency(dashboardData?.priceFeedStats?.avgLatency ?? 120)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TabPanelWrapper>

      <TabPanelWrapper tabId="publishers">
        <div className="border-b border-border/30">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">{t('pyth.publisher.detailedList')}</h3>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            {t('pyth.publisher.detailedListDesc')}
          </p>
          
          {/* 数据源类型图例 */}
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">数据源类型:</span>
            <PublisherSourceTypeLegend />
          </div>
          
          <div className="overflow-x-auto">
            {isLoading ? (
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
                    <TableHead className="text-center">{t('pyth.publisher.status')}</TableHead>
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
                      <TableCell className="text-right">{publisher.publishFrequency}s</TableCell>
                      <TableCell className="text-right">{publisher.supportedFeeds}</TableCell>
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
                          {publisher.status === 'active' && <CheckCircle className="h-3 w-3" />}
                          {publisher.status === 'degraded' && <AlertTriangle className="h-3 w-3" />}
                          {publisher.status === 'inactive' && <XCircle className="h-3 w-3" />}
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
      </TabPanelWrapper>

      <TabPanelWrapper tabId="price-feeds">
        <div className="border-b border-border/30">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">{t('pyth.priceStatus.detailedStats')}</h3>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            {t('pyth.priceStatus.detailedStatsDesc')}
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            {(['All', 'Crypto', 'Equities', 'FX', 'Commodities'] as const).map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  selectedCategory === category
                    ? 'text-primary-foreground bg-primary'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {category === 'All' ? t('common.all') : category}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
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
                    <TableHead className="text-center">{t('pyth.publisher.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPriceFeedDetails.map((feed) => (
                    <TableRow
                      key={feed.id}
                      className={cn(hasAnomaly(feed) && 'bg-red-50/50 dark:bg-red-950/20')}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {hasAnomaly(feed) && <AlertTriangle className="h-4 w-4 text-red-500" />}
                          <div className="flex flex-col">
                            <span className="font-medium">{feed.name}</span>
                            <span className="text-xs text-muted-foreground">{feed.symbol}</span>
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
                      <TableCell className="text-right">{feed.updateFrequency}s</TableCell>
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
                          {feed.status === 'active' && <CheckCircle className="h-3 w-3" />}
                          {feed.status === 'stale' && <AlertTriangle className="h-3 w-3" />}
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
      </TabPanelWrapper>

      <TabPanelWrapper tabId="analysis">
        <div className="space-y-4">
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <PythCrossChainComparison isLoading={isLoading} />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <ConfidenceComparisonChart isLoading={isLoading} />
          </Suspense>
        </div>
      </TabPanelWrapper>

      <TabPanelWrapper tabId="hermes">
        <div className="border-b border-border/30">
          <div className="mb-3 flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">{t('pyth.hermes.title')}</h3>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">{t('pyth.hermes.description')}</p>
          {isLoading && !dashboardData?.hermesStatus ? (
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
          ) : dashboardData?.hermesStatus ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge
                  variant={
                    dashboardData.hermesStatus.status === 'healthy'
                      ? 'success'
                      : dashboardData.hermesStatus.status === 'degraded'
                        ? 'warning'
                        : 'destructive'
                  }
                >
                  {dashboardData.hermesStatus.status === 'healthy'
                    ? t('pyth.hermes.status.running')
                    : dashboardData.hermesStatus.status === 'degraded'
                      ? t('pyth.hermes.status.degraded')
                      : t('pyth.hermes.status.error')}
                </Badge>
              </div>
              <div className="space-y-3">
                {dashboardData.hermesStatus.endpoints.map((endpoint, index) => (
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
                        className={cn('text-sm font-medium', getLatencyColor(endpoint.latency))}
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
      </TabPanelWrapper>
    </ProtocolPageLayout>
  );
}
