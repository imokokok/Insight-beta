'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

import {
  RefreshCw,
  Zap,
  Users,
  Activity,
  Server,
  Clock,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  LayoutDashboard,
  BarChart3,
  Globe,
  TrendingUp,
} from 'lucide-react';

import { AutoRefreshControl } from '@/components/common/AutoRefreshControl';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { ProtocolHealthBadge } from '@/components/common/ProtocolHealthBadge';
import type { SortState } from '@/components/common/SortableTableHeader';
import { SortableTableHeader } from '@/components/common/SortableTableHeader';
import { TrendIndicator } from '@/components/common/TrendIndicator';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
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
  {
    id: '9',
    name: 'Polkadot',
    symbol: 'DOT/USD',
    latestPrice: 7.89,
    priceChange: 0.56,
    updateFrequency: 2.8,
    avgLatency: 134,
    status: 'active',
    category: 'Crypto',
    confidenceInterval: 1.1,
    anomalies: { priceVolatility: false, highConfidenceInterval: false },
  },
  {
    id: '10',
    name: 'Chainlink',
    symbol: 'LINK/USD',
    latestPrice: 14.56,
    priceChange: 1.89,
    updateFrequency: 2.0,
    avgLatency: 95,
    status: 'active',
    category: 'Crypto',
    confidenceInterval: 1.3,
    anomalies: { priceVolatility: false, highConfidenceInterval: false },
  },
  {
    id: '11',
    name: 'Apple Inc.',
    symbol: 'AAPL/USD',
    latestPrice: 178.45,
    priceChange: 1.23,
    updateFrequency: 2.5,
    avgLatency: 145,
    status: 'active',
    category: 'Equities',
    confidenceInterval: 1.5,
    anomalies: { priceVolatility: false, highConfidenceInterval: false },
  },
  {
    id: '12',
    name: 'Microsoft Corp.',
    symbol: 'MSFT/USD',
    latestPrice: 412.34,
    priceChange: -0.56,
    updateFrequency: 2.8,
    avgLatency: 152,
    status: 'active',
    category: 'Equities',
    confidenceInterval: 1.2,
    anomalies: { priceVolatility: false, highConfidenceInterval: false },
  },
  {
    id: '13',
    name: 'Amazon.com',
    symbol: 'AMZN/USD',
    latestPrice: 178.9,
    priceChange: 2.45,
    updateFrequency: 3.0,
    avgLatency: 168,
    status: 'active',
    category: 'Equities',
    confidenceInterval: 1.7,
    anomalies: { priceVolatility: false, highConfidenceInterval: false },
  },
  {
    id: '14',
    name: 'Tesla Inc.',
    symbol: 'TSLA/USD',
    latestPrice: 245.67,
    priceChange: -6.78,
    updateFrequency: 2.2,
    avgLatency: 123,
    status: 'active',
    category: 'Equities',
    confidenceInterval: 2.8,
    anomalies: { priceVolatility: true, highConfidenceInterval: true },
  },
  {
    id: '15',
    name: 'NVIDIA Corp.',
    symbol: 'NVDA/USD',
    latestPrice: 875.43,
    priceChange: 4.56,
    updateFrequency: 1.8,
    avgLatency: 98,
    status: 'active',
    category: 'Equities',
    confidenceInterval: 1.4,
    anomalies: { priceVolatility: false, highConfidenceInterval: false },
  },
  {
    id: '16',
    name: 'EUR/USD',
    symbol: 'EUR/USD',
    latestPrice: 1.0876,
    priceChange: 0.34,
    updateFrequency: 1.5,
    avgLatency: 87,
    status: 'active',
    category: 'FX',
    confidenceInterval: 0.5,
    anomalies: { priceVolatility: false, highConfidenceInterval: false },
  },
  {
    id: '17',
    name: 'GBP/USD',
    symbol: 'GBP/USD',
    latestPrice: 1.2678,
    priceChange: -0.12,
    updateFrequency: 1.7,
    avgLatency: 91,
    status: 'active',
    category: 'FX',
    confidenceInterval: 0.6,
    anomalies: { priceVolatility: false, highConfidenceInterval: false },
  },
  {
    id: '18',
    name: 'JPY/USD',
    symbol: 'JPY/USD',
    latestPrice: 0.0067,
    priceChange: 0.78,
    updateFrequency: 1.3,
    avgLatency: 82,
    status: 'active',
    category: 'FX',
    confidenceInterval: 0.8,
    anomalies: { priceVolatility: false, highConfidenceInterval: false },
  },
  {
    id: '19',
    name: 'AUD/USD',
    symbol: 'AUD/USD',
    latestPrice: 0.6543,
    priceChange: -0.45,
    updateFrequency: 1.9,
    avgLatency: 95,
    status: 'active',
    category: 'FX',
    confidenceInterval: 0.7,
    anomalies: { priceVolatility: false, highConfidenceInterval: false },
  },
  {
    id: '20',
    name: 'CHF/USD',
    symbol: 'CHF/USD',
    latestPrice: 1.1567,
    priceChange: 0.23,
    updateFrequency: 1.6,
    avgLatency: 89,
    status: 'active',
    category: 'FX',
    confidenceInterval: 0.9,
    anomalies: { priceVolatility: false, highConfidenceInterval: false },
  },
  {
    id: '21',
    name: 'Gold',
    symbol: 'XAU/USD',
    latestPrice: 2345.67,
    priceChange: 1.34,
    updateFrequency: 2.1,
    avgLatency: 112,
    status: 'active',
    category: 'Commodities',
    confidenceInterval: 1.6,
    anomalies: { priceVolatility: false, highConfidenceInterval: false },
  },
  {
    id: '22',
    name: 'Silver',
    symbol: 'XAG/USD',
    latestPrice: 27.89,
    priceChange: 2.56,
    updateFrequency: 2.4,
    avgLatency: 118,
    status: 'active',
    category: 'Commodities',
    confidenceInterval: 1.8,
    anomalies: { priceVolatility: false, highConfidenceInterval: false },
  },
  {
    id: '23',
    name: 'Crude Oil',
    symbol: 'WTI/USD',
    latestPrice: 78.45,
    priceChange: -5.89,
    updateFrequency: 1.8,
    avgLatency: 105,
    status: 'active',
    category: 'Commodities',
    confidenceInterval: 2.3,
    anomalies: { priceVolatility: true, highConfidenceInterval: true },
  },
  {
    id: '24',
    name: 'Natural Gas',
    symbol: 'NG/USD',
    latestPrice: 2.56,
    priceChange: -3.45,
    updateFrequency: 2.7,
    avgLatency: 125,
    status: 'stale',
    category: 'Commodities',
    confidenceInterval: 1.5,
    anomalies: { priceVolatility: false, highConfidenceInterval: false },
  },
  {
    id: '25',
    name: 'Copper',
    symbol: 'HG/USD',
    latestPrice: 3.89,
    priceChange: 0.78,
    updateFrequency: 2.2,
    avgLatency: 110,
    status: 'active',
    category: 'Commodities',
    confidenceInterval: 1.2,
    anomalies: { priceVolatility: false, highConfidenceInterval: false },
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

      if (publishersRes) {
        setPublisherStats(publishersRes);
      }
      if (priceFeedsRes) {
        setPriceFeedStats(priceFeedsRes);
      }
      if (hermesRes) {
        setHermesStatus(hermesRes);
      }

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="mt-2 h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : overviewStats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">总 Publisher 数</span>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-2xl font-bold">{overviewStats.totalPublishers}</span>
                <TrendIndicator trend="up" value={2.1} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">活跃 Publisher</span>
                <div className="h-2 w-2 rounded-full bg-green-500" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-2xl font-bold text-green-600">
                  {overviewStats.activePublishers}
                </span>
                <TrendIndicator trend="up" value={1.5} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">活跃价格源</span>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-2xl font-bold text-yellow-600">
                  {overviewStats.activePriceFeeds}
                </span>
                <TrendIndicator trend="up" value={4.3} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">平均延迟</span>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={cn('text-2xl font-bold', getLatencyColor(overviewStats.avgLatency))}
                >
                  {formatLatency(overviewStats.avgLatency)}
                </span>
                <TrendIndicator trend="down" value={12.3} />
              </div>
            </CardContent>
          </Card>
        </div>
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
          <Card>
            <CardHeader>
              <CardTitle>Pyth Network 协议概览</CardTitle>
              <CardDescription>高频预言机网络状态摘要</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Pyth Network 是一个专注于高频金融数据的第一方预言机网络，通过 Publisher
                直接在链上推送价格数据，实现低延迟、高精度的价格更新。
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Zap className="h-8 w-8 text-yellow-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">高频更新</p>
                        <p className="font-semibold">亚秒级价格推送</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Users className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Publisher 网络</p>
                        <p className="font-semibold">第一方数据源</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Shield className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">数据完整性</p>
                        <p className="font-semibold">可验证的价格证明</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Publisher 状态
                </CardTitle>
                <CardDescription>数据发布者运行状态</CardDescription>
              </CardHeader>
              <CardContent>
                {loading && !publisherStats ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : publisherStats ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">活跃率</span>
                      <span className="font-semibold">
                        {publisherStats.total > 0
                          ? ((publisherStats.active / publisherStats.total) * 100).toFixed(1)
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-green-500"
                        style={{
                          width: `${
                            publisherStats.total > 0
                              ? (publisherStats.active / publisherStats.total) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">活跃: {publisherStats.active}</span>
                      <span className="text-red-600">离线: {publisherStats.inactive}</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">暂无 Publisher 数据</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  价格推送统计
                </CardTitle>
                <CardDescription>价格更新频率与延迟</CardDescription>
              </CardHeader>
              <CardContent>
                {loading && !priceFeedStats ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : priceFeedStats ? (
                  <div className="space-y-4">
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
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">暂无价格推送数据</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="publishers" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Publisher 详细列表
              </CardTitle>
              <CardDescription>Pyth 数据发布者状态与性能监控</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
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
                          <TableCell className="text-right">
                            {publisher.publishFrequency}s
                          </TableCell>
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
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="price-feeds" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                价格推送详细统计
              </CardTitle>
              <CardDescription>实时价格更新频率与延迟分析</CardDescription>
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
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
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
                              {hasAnomaly(feed) && (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              )}
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
                              <div className="flex items-center gap-1">
                                {feed.anomalies.priceVolatility && (
                                  <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                                    波动异常
                                  </Badge>
                                )}
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
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{feed.updateFrequency}s</TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end">
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
                              {feed.anomalies.highConfidenceInterval && (
                                <Badge
                                  variant="destructive"
                                  className="mt-0.5 h-4 px-1 text-[10px]"
                                >
                                  置信过高
                                </Badge>
                              )}
                            </div>
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
                </div>
              )}
            </CardContent>
          </Card>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Hermes 服务状态
              </CardTitle>
              <CardDescription>Pyth 数据传输服务节点监控</CardDescription>
            </CardHeader>
            <CardContent>
              {loading && !hermesStatus ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
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
                  <p className="mt-1 text-sm">请稍后刷新页面查看完整数据</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
