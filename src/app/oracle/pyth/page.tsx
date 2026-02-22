'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

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
  Globe,
  TrendingUp,
} from 'lucide-react';

import { StatsBar, FeatureTags, Gauge, ContentSection, ContentGrid } from '@/components/common';
import { AutoRefreshControl } from '@/components/common/AutoRefreshControl';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { ProtocolHealthBadge } from '@/components/common/ProtocolHealthBadge';
import type { SortState } from '@/components/common/SortableTableHeader';
import { SortableTableHeader } from '@/components/common/SortableTableHeader';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { ErrorBanner } from '@/components/ui';
import { RefreshIndicator } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import {
  PythExportButton,
  ConfidenceComparisonChart,
  CrossChainPriceComparison,
  PriceHistoryChart,
} from '@/features/oracle/pyth/components';
import { useI18n } from '@/i18n';
import { fetchApiData } from '@/shared/utils';
import { cn } from '@/shared/utils/ui';

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

interface OverviewStats {
  totalPublishers: number;
  activePublishers: number;
  activePriceFeeds: number;
  avgLatency: number;
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

export default function PythPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('overview');

  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [publisherStats, setPublisherStats] = useState<PublisherStats | null>(null);
  const [priceFeedStats, setPriceFeedStats] = useState<PriceFeedStats | null>(null);
  const [hermesStatus, setHermesStatus] = useState<HermesStatus | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(0);

  const [publisherSort, setPublisherSort] = useState<SortState | null>(null);
  const [priceFeedSort, setPriceFeedSort] = useState<SortState | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PriceFeedCategory | 'All'>('All');

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

  const protocolHealthStatus = useMemo(() => {
    if (hermesStatus?.status === 'down') return 'critical';
    if (hermesStatus?.status === 'degraded') return 'warning';
    if (overviewStats && overviewStats.totalPublishers > 0) {
      const activeRatio = overviewStats.activePublishers / overviewStats.totalPublishers;
      if (activeRatio >= 0.8) return 'healthy';
      if (activeRatio >= 0.5) return 'warning';
      return 'critical';
    }
    return 'healthy';
  }, [hermesStatus, overviewStats]);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [publishersRes, priceFeedsRes, hermesRes] = await Promise.all([
        fetchApiData<PublisherStats>('/api/oracle/pyth/publishers').catch(() => null),
        fetchApiData<PriceFeedStats>('/api/oracle/pyth/price-feeds').catch(() => null),
        fetchApiData<HermesStatus>('/api/oracle/pyth/hermes').catch(() => null),
      ]);

      if (publishersRes) setPublisherStats(publishersRes);
      if (priceFeedsRes) setPriceFeedStats(priceFeedsRes);
      if (hermesRes) setHermesStatus(hermesRes);

      setOverviewStats({
        totalPublishers: publishersRes?.total ?? 0,
        activePublishers: publishersRes?.active ?? 0,
        activePriceFeeds: priceFeedsRes?.active ?? 0,
        avgLatency: priceFeedsRes?.avgLatency ?? 0,
      });

      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    if (!autoRefreshEnabled) {
      setTimeUntilRefresh(0);
      return;
    }

    setTimeUntilRefresh(refreshInterval);
    const interval = setInterval(() => {
      setTimeUntilRefresh((prev) => {
        if (prev <= 1) {
          fetchAllData();
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, refreshInterval, fetchAllData]);

  const breadcrumbItems = [{ label: t('nav.oracle'), href: '/oracle' }, { label: 'Pyth' }];

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getLatencyColor = (ms: number) => {
    if (ms < 200) return 'text-green-500';
    if (ms < 500) return 'text-yellow-500';
    return 'text-red-500';
  };

  const hasAnomaly = (feed: PriceFeedDetail) => {
    return feed.anomalies.priceVolatility || feed.anomalies.highConfidenceInterval;
  };

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6">
      <Breadcrumb items={breadcrumbItems} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl lg:text-3xl">
            <Zap className="h-6 w-6 text-yellow-500" />
            <span>Pyth Network</span>
            <ProtocolHealthBadge status={protocolHealthStatus} />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            高频预言机 - 实时价格推送与 Publisher 监控
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchAllData()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
          <AutoRefreshControl
            isEnabled={autoRefreshEnabled}
            onToggle={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            interval={refreshInterval}
            onIntervalChange={setRefreshInterval}
            timeUntilRefresh={timeUntilRefresh}
          />
          <PythExportButton
            data={
              overviewStats || publisherStats || priceFeedStats || hermesStatus
                ? {
                    overviewStats,
                    publisherStats,
                    priceFeedStats,
                    hermesStatus,
                    generatedAt: lastUpdated?.toISOString() || new Date().toISOString(),
                  }
                : null
            }
            disabled={loading}
          />
          <RefreshIndicator
            lastUpdated={lastUpdated}
            isRefreshing={loading}
            onRefresh={fetchAllData}
          />
        </div>
      </div>

      {error && (
        <ErrorBanner
          error={new Error(error)}
          onRetry={fetchAllData}
          title="加载数据失败"
          isRetrying={loading}
        />
      )}

      {loading && !overviewStats ? (
        <div className="h-16 animate-pulse rounded-xl bg-muted" />
      ) : overviewStats ? (
        <StatsBar
          title="Pyth 网络状态"
          items={[
            { label: '总 Publisher', value: overviewStats.totalPublishers, trend: 'up' as const },
            {
              label: '活跃 Publisher',
              value: overviewStats.activePublishers,
              trend: 'up' as const,
              status: 'healthy' as const,
            },
            { label: '活跃价格源', value: overviewStats.activePriceFeeds, trend: 'up' as const },
            {
              label: '平均延迟',
              value: formatLatency(overviewStats.avgLatency),
              trend: 'down' as const,
              status:
                overviewStats.avgLatency < 200
                  ? ('healthy' as const)
                  : overviewStats.avgLatency < 500
                    ? ('warning' as const)
                    : ('critical' as const),
            },
          ]}
        />
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview" className="flex items-center gap-1.5">
            <LayoutDashboard className="h-4 w-4" />
            <span>概览</span>
          </TabsTrigger>
          <TabsTrigger value="publishers" className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>Publisher</span>
          </TabsTrigger>
          <TabsTrigger value="price-feeds" className="flex items-center gap-1.5">
            <Activity className="h-4 w-4" />
            <span>价格推送</span>
          </TabsTrigger>
          <TabsTrigger value="price-trend" className="flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4" />
            <span>价格趋势</span>
          </TabsTrigger>
          <TabsTrigger value="cross-chain" className="flex items-center gap-1.5">
            <Globe className="h-4 w-4" />
            <span>跨链对比</span>
          </TabsTrigger>
          <TabsTrigger value="confidence-comparison" className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" />
            <span>置信对比</span>
          </TabsTrigger>
          <TabsTrigger value="hermes" className="flex items-center gap-1.5">
            <Server className="h-4 w-4" />
            <span>服务状态</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <ContentSection title="Pyth Network 协议概览" description="高频预言机网络状态摘要">
            <p className="text-muted-foreground">
              Pyth Network 是一个专注于高频金融数据的第一方预言机网络，通过 Publisher
              直接在链上推送价格数据，实现低延迟、高精度的价格更新。
            </p>
          </ContentSection>

          <ContentSection title="核心特性">
            <FeatureTags
              features={[
                {
                  icon: <Zap className="h-5 w-5" />,
                  title: '高频更新',
                  description: '亚秒级价格推送',
                },
                {
                  icon: <Users className="h-5 w-5" />,
                  title: 'Publisher 网络',
                  description: '第一方数据源',
                },
                {
                  icon: <Shield className="h-5 w-5" />,
                  title: '数据完整性',
                  description: '可验证的价格证明',
                },
              ]}
            />
          </ContentSection>

          <ContentGrid columns={2}>
            <div className="rounded-xl border border-border/30 bg-card/30 p-4">
              <div className="mb-4 flex items-center gap-2 border-b border-border/30 pb-3">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Publisher 状态</h3>
              </div>
              {loading && !publisherStats ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : publisherStats ? (
                <div className="flex items-center justify-center gap-8">
                  <Gauge
                    value={
                      publisherStats.total > 0
                        ? Math.round((publisherStats.active / publisherStats.total) * 100)
                        : 0
                    }
                    label="活跃率"
                    subLabel={`${publisherStats.active} / ${publisherStats.total}`}
                    size="md"
                  />
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">活跃 Publisher</p>
                    <p className="text-2xl font-bold text-green-600">{publisherStats.active}</p>
                    <p className="text-sm text-muted-foreground">离线 Publisher</p>
                    <p className="text-xl font-semibold text-red-600">{publisherStats.inactive}</p>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">暂无 Publisher 数据</div>
              )}
            </div>

            <div className="rounded-xl border border-border/30 bg-card/30 p-4">
              <div className="mb-4 flex items-center gap-2 border-b border-border/30 pb-3">
                <Activity className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">价格推送统计</h3>
              </div>
              {loading && !priceFeedStats ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : priceFeedStats ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">总价格源</p>
                    <p className="mt-1 text-lg font-semibold">{priceFeedStats.total}</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">活跃价格源</p>
                    <p className="mt-1 text-lg font-semibold text-green-600">
                      {priceFeedStats.active}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">平均更新频率</p>
                    <p className="mt-1 text-lg font-semibold">
                      {priceFeedStats.avgUpdateFrequency}s
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">平均延迟</p>
                    <p
                      className={cn(
                        'mt-1 text-lg font-semibold',
                        getLatencyColor(priceFeedStats.avgLatency),
                      )}
                    >
                      {formatLatency(priceFeedStats.avgLatency)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">暂无价格推送数据</div>
              )}
            </div>
          </ContentGrid>
        </TabsContent>

        <TabsContent value="publishers" className="mt-6">
          <div className="rounded-xl border border-border/30 bg-card/30">
            <div className="border-b border-border/30 p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Publisher 详细列表</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Pyth 数据发布者状态与性能监控</p>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
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
                        Publisher 名称
                      </SortableTableHeader>
                      <SortableTableHeader
                        sortKey="credibilityScore"
                        currentSort={publisherSort}
                        onSort={handlePublisherSort}
                        className="text-right"
                      >
                        可信度评分
                      </SortableTableHeader>
                      <SortableTableHeader
                        sortKey="publishFrequency"
                        currentSort={publisherSort}
                        onSort={handlePublisherSort}
                        className="text-right"
                      >
                        发布频率 (s)
                      </SortableTableHeader>
                      <SortableTableHeader
                        sortKey="supportedFeeds"
                        currentSort={publisherSort}
                        onSort={handlePublisherSort}
                        className="text-right"
                      >
                        支持的价格源
                      </SortableTableHeader>
                      <TableHead className="text-center">状态</TableHead>
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
                            {publisher.status === 'degraded' && (
                              <AlertTriangle className="h-3 w-3" />
                            )}
                            {publisher.status === 'inactive' && <XCircle className="h-3 w-3" />}
                            {publisher.status === 'active'
                              ? '活跃'
                              : publisher.status === 'degraded'
                                ? '降级'
                                : '离线'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="price-feeds" className="mt-6">
          <div className="rounded-xl border border-border/30 bg-card/30">
            <div className="border-b border-border/30 p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">价格推送详细统计</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">实时价格更新频率与延迟分析</p>
              <div className="mt-4">
                <Tabs
                  value={selectedCategory}
                  onValueChange={(value) => setSelectedCategory(value as PriceFeedCategory | 'All')}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="All">全部</TabsTrigger>
                    <TabsTrigger value="Crypto">Crypto</TabsTrigger>
                    <TabsTrigger value="Equities">Equities</TabsTrigger>
                    <TabsTrigger value="FX">FX</TabsTrigger>
                    <TabsTrigger value="Commodities">Commodities</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
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
                        价格源名称
                      </SortableTableHeader>
                      <TableHead>分类</TableHead>
                      <SortableTableHeader
                        sortKey="latestPrice"
                        currentSort={priceFeedSort}
                        onSort={handlePriceFeedSort}
                        className="text-right"
                      >
                        最新价格
                      </SortableTableHeader>
                      <SortableTableHeader
                        sortKey="updateFrequency"
                        currentSort={priceFeedSort}
                        onSort={handlePriceFeedSort}
                        className="text-right"
                      >
                        更新频率 (s)
                      </SortableTableHeader>
                      <SortableTableHeader
                        sortKey="avgLatency"
                        currentSort={priceFeedSort}
                        onSort={handlePriceFeedSort}
                        className="text-right"
                      >
                        置信区间
                      </SortableTableHeader>
                      <TableHead className="text-center">状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPriceFeedDetails.map((feed) => (
                      <TableRow key={feed.id} className={cn(hasAnomaly(feed) && 'bg-red-50/50')}>
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
                              ? '活跃'
                              : feed.status === 'stale'
                                ? '延迟'
                                : '异常'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="price-trend" className="mt-6">
          <PriceHistoryChart isLoading={loading} />
        </TabsContent>

        <TabsContent value="cross-chain" className="mt-6">
          <CrossChainPriceComparison isLoading={loading} />
        </TabsContent>

        <TabsContent value="confidence-comparison" className="mt-6">
          <ConfidenceComparisonChart isLoading={loading} />
        </TabsContent>

        <TabsContent value="hermes" className="mt-6">
          <div className="rounded-xl border border-border/30 bg-card/30 p-4">
            <div className="mb-4 flex items-center gap-2 border-b border-border/30 pb-3">
              <Server className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Hermes 服务状态</h3>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">Pyth 数据传输服务节点监控</p>
            {loading && !hermesStatus ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border p-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : hermesStatus ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      hermesStatus.status === 'healthy'
                        ? 'success'
                        : hermesStatus.status === 'degraded'
                          ? 'warning'
                          : 'destructive'
                    }
                  >
                    {hermesStatus.status === 'healthy'
                      ? '运行正常'
                      : hermesStatus.status === 'degraded'
                        ? '性能降级'
                        : '服务异常'}
                  </Badge>
                </div>
                <div className="grid gap-3">
                  {hermesStatus.endpoints.map((endpoint, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border p-4"
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
                <p className="mt-2">Hermes 服务数据加载中...</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
