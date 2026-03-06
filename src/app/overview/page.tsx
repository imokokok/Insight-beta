'use client';

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';

import {
  Activity,
  BarChart3,
  Globe,
  Link2,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Shield,
  Zap,
  Layers,
  Activity as ActivityIcon,
  CircleAlert,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

import { EnhancedAreaChart, EnhancedBarChart } from '@/components/charts';
import { CHART_COLORS } from '@/components/charts';
import {
  ContentSection,
  AutoRefreshControl,
  ErrorBoundary,
  KPIOverviewBar,
  type KPIItem,
  TimeRangeSelector,
  type TimeRange,
} from '@/components/common';
import { ChartCard } from '@/components/common';
import { HealthScoreBadge, HealthScoreTrend } from '@/components/common/data/HealthScoreCard';
import { MiniTrend } from '@/components/common/data/MiniTrend';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { ErrorBanner } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { useI18n } from '@/i18n';
import { fetchApiData, formatNumber, cn, formatFreshness, formatTimeAgo } from '@/shared/utils';
import { calculateHealthScore } from '@/shared/utils/math';
import { useOnChainActivity } from '@/features/overview/hooks/useOnChainActivity';

const AnomalyList = lazy(() =>
  import('@/features/oracle/analytics/deviation/components/AnomalyList').then((mod) => ({
    default: mod.AnomalyList,
  })),
);

interface ProtocolHealth {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  feeds: number;
  activeFeeds: number;
  avgLatency: number;
  lastUpdate: string;
  icon: React.ReactNode;
  color: string;
  href: string;
  latencyTrend: number[];
  tvl?: string;
  volume24h?: string;
  marketShare?: number;
  healthScore?: ReturnType<typeof calculateHealthScore>;
}

interface OverviewStats {
  totalTVL: string;
  totalProtocols: number;
  avgLatency: number;
  healthScore: number;
  totalFeeds: number;
  activeFeeds: number;
  totalUpdates24h: number;
  marketConcentration?: number;
  totalVolume24h?: string;
}

interface PriceTrendPoint {
  timestamp: string;
  value: number;
}

interface AnomalyData {
  symbol: string;
  timestamp: string;
  maxDeviationPercent: number;
  avgPrice: number;
  medianPrice: number;
  protocols: string[];
  outlierProtocols: string[];
  prices: Record<string, number>;
}

interface OverviewPageState {
  stats: OverviewStats | null;
  protocols: ProtocolHealth[];
  priceTrendData: PriceTrendPoint[];
  anomalies: AnomalyData[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  autoRefreshEnabled: boolean;
  refreshInterval: number;
  timeUntilRefresh: number;
  timeRange: TimeRange;
  isSyncing: boolean;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  selectedAsset: string;
  priceDeviation?: {
    minPrice: number;
    maxPrice: number;
    avgPrice: number;
    deviationPercent: number;
  } | null;
}

const protocolConfigs: Array<{
  name: string;
  icon: React.ReactNode;
  color: string;
  href: string;
}> = [
  {
    name: 'Chainlink',
    icon: <Link2 className="h-5 w-5" />,
    color: 'text-blue-500',
    href: '/protocols/chainlink',
  },
  {
    name: 'Pyth',
    icon: <Zap className="h-5 w-5" />,
    color: 'text-yellow-500',
    href: '/protocols/pyth',
  },
  {
    name: 'API3',
    icon: <Activity className="h-5 w-5" />,
    color: 'text-green-500',
    href: '/protocols/api3',
  },
  {
    name: 'Band',
    icon: <Globe className="h-5 w-5" />,
    color: 'text-purple-500',
    href: '/protocols/band',
  },
];

const getQuickLinks = (t: (key: string) => string) => [
  {
    title: t('overview.quickLinks.priceComparison.title'),
    description: t('overview.quickLinks.priceComparison.description'),
    icon: <BarChart3 className="h-5 w-5" />,
    href: '/compare/price',
    color: 'bg-blue-500/10 text-blue-500',
  },
  {
    title: t('overview.quickLinks.crossChain.title'),
    description: t('overview.quickLinks.crossChain.description'),
    icon: <Globe className="h-5 w-5" />,
    href: '/cross-chain',
    color: 'bg-green-500/10 text-green-500',
  },
  {
    title: t('overview.quickLinks.alerts.title'),
    description: t('overview.quickLinks.alerts.description'),
    icon: <AlertTriangle className="h-5 w-5" />,
    href: '/alerts',
    color: 'bg-orange-500/10 text-orange-500',
  },
  {
    title: t('overview.quickLinks.reliability.title'),
    description: t('overview.quickLinks.reliability.description'),
    icon: <Shield className="h-5 w-5" />,
    href: '/compare/reliability',
    color: 'bg-purple-500/10 text-purple-500',
  },
];

export default function OverviewPage() {
  const { t, lang } = useI18n();

  const [state, setState] = useState<OverviewPageState>({
    stats: null,
    protocols: [],
    priceTrendData: [],
    anomalies: [],
    loading: true,
    error: null,
    lastUpdated: null,
    autoRefreshEnabled: false,
    refreshInterval: 30000,
    timeUntilRefresh: 0,
    timeRange: '24H',
    isSyncing: false,
    syncStatus: 'idle',
    selectedAsset: 'BTC/USD',
    priceDeviation: null,
  });

  const updateState = useCallback((partial: Partial<OverviewPageState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const fetchData = useCallback(async () => {
    try {
      updateState({ loading: true, error: null, isSyncing: true, syncStatus: 'syncing' });

      const [statsRes, trendRes, anomaliesRes] = await Promise.all([
        fetchApiData<OverviewStats>('/api/oracle/stats').catch(() => null),
        fetchApiData<PriceTrendPoint[]>(
          `/api/oracle/history/prices?latest=true&symbol=${encodeURIComponent(state.selectedAsset)}`,
        ).catch(() => []),
        fetchApiData<AnomalyData[]>('/api/oracle/analytics/deviation?type=report').catch(() => []),
      ]);

      const protocols: ProtocolHealth[] = protocolConfigs.map((config, index) => {
        const feedsValues = [156, 150, 45, 85] as const;
        const activeFeedsValues = [152, 148, 44, 82] as const;
        const avgLatencyValues = [180, 95, 320, 280] as const;
        const latencyTrendValues = [
          [175, 178, 182, 176, 180, 185, 180],
          [90, 92, 95, 88, 93, 97, 95],
          [310, 325, 315, 330, 320, 340, 320],
          [275, 280, 285, 278, 282, 290, 280],
        ] as const;
        const tvlValues = ['$22.5B', '$15.8B', '$4.2B', '$2.7B'] as const;
        const volumeValues = ['$3.2B', '$2.8B', '$1.5B', '$1.0B'] as const;
        const marketShareValues = [45.2, 32.5, 12.8, 9.5] as const;

        const feeds = feedsValues[index] ?? 0;
        const activeFeeds = activeFeedsValues[index] ?? 0;
        const avgLatency = avgLatencyValues[index] ?? 0;
        const latencyTrend = [...(latencyTrendValues[index] ?? [])];

        const updateIntervalSeconds = avgLatency * 3;

        const healthScore = calculateHealthScore({
          avgLatency,
          updateIntervalSeconds,
          activeFeeds,
          totalFeeds: feeds,
        });

        const status = healthScore.status;

        return {
          ...config,
          status,
          feeds,
          activeFeeds,
          avgLatency,
          lastUpdate: new Date().toISOString(),
          latencyTrend,
          tvl: tvlValues[index],
          volume24h: volumeValues[index],
          marketShare: marketShareValues[index],
          healthScore,
        };
      });

      const priceTrendData: PriceTrendPoint[] = trendRes.length > 0 ? trendRes : [];

      const mockAnomalies: AnomalyData[] = anomaliesRes.length
        ? anomaliesRes
        : [
            {
              symbol: 'BTC/USD',
              timestamp: new Date(Date.now() - 3600000).toISOString(),
              maxDeviationPercent: 0.025,
              avgPrice: 67234.56,
              medianPrice: 67230.0,
              protocols: ['Chainlink', 'Pyth', 'API3', 'Band'],
              outlierProtocols: ['Band'],
              prices: {
                Chainlink: 67235.0,
                Pyth: 67234.0,
                API3: 67233.0,
                Band: 67050.0,
              },
            },
            {
              symbol: 'ETH/USD',
              timestamp: new Date(Date.now() - 7200000).toISOString(),
              maxDeviationPercent: 0.018,
              avgPrice: 3456.78,
              medianPrice: 3456.5,
              protocols: ['Chainlink', 'Pyth', 'API3', 'Band'],
              outlierProtocols: ['API3'],
              prices: {
                Chainlink: 3457.0,
                Pyth: 3456.5,
                API3: 3520.0,
                Band: 3456.0,
              },
            },
          ];

      let priceDeviation = null;
      if (priceTrendData.length > 0 && mockAnomalies.length > 0) {
        const currentAnomaly = mockAnomalies.find((a) => a.symbol === state.selectedAsset);
        if (currentAnomaly) {
          const prices = Object.values(currentAnomaly.prices);
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
          const deviationPercent = ((maxPrice - minPrice) / avgPrice) * 100;
          priceDeviation = { minPrice, maxPrice, avgPrice, deviationPercent };
        }
      }

      updateState({
        stats: statsRes ?? null,
        protocols,
        priceTrendData,
        anomalies: mockAnomalies,
        priceDeviation,
        lastUpdated: new Date(),
        isSyncing: false,
        syncStatus: 'success',
      });

      toast.success(t('overview.dataSync.synced'), {
        description: formatTimeAgo(new Date().toISOString(), lang === 'zh' ? 'zh' : 'en'),
        duration: 2000,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      updateState({
        error: errorMessage,
        isSyncing: false,
        syncStatus: 'error',
      });

      toast.error(t('overview.dataSync.failed'), {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      updateState({ loading: false });
    }
  }, [updateState, t, lang, state.selectedAsset]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!state.autoRefreshEnabled) {
      updateState({ timeUntilRefresh: 0 });
      return;
    }

    updateState({ timeUntilRefresh: state.refreshInterval });
    const interval = setInterval(() => {
      setState((prev) => {
        if (prev.timeUntilRefresh <= 1000) {
          fetchData();
          return { ...prev, timeUntilRefresh: prev.refreshInterval };
        }
        return { ...prev, timeUntilRefresh: prev.timeUntilRefresh - 1000 };
      });
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [state.autoRefreshEnabled, state.refreshInterval, fetchData]);

  const kpiItems: KPIItem[] = useMemo(
    () =>
      state.stats
        ? [
            {
              id: 'tvl',
              label: t('common.kpi.totalTVL'),
              value: state.stats.totalTVL,
              icon: <TrendingUp className="h-5 w-5" />,
              trend: { value: 5.2, isPositive: true },
              color: 'blue' as const,
            },
            {
              id: 'volume',
              label: t('common.kpi.volume24h'),
              value: state.stats.totalVolume24h || '$8.5B',
              icon: <ActivityIcon className="h-5 w-5" />,
              trend: { value: 3.8, isPositive: true },
              color: 'green' as const,
            },
            {
              id: 'concentration',
              label: t('common.kpi.marketConcentration'),
              value: `${Math.round((state.stats.marketConcentration || 0.68) * 100)}%`,
              icon: <Layers className="h-5 w-5" />,
              trend: { value: -2.1, isPositive: true },
              color: 'purple' as const,
            },
            {
              id: 'health',
              label: t('common.kpi.healthScore'),
              value: `${state.stats.healthScore}%`,
              icon: <Shield className="h-5 w-5" />,
              trend: { value: 0.5, isPositive: true },
              color: 'amber' as const,
            },
          ]
        : [],
    [state.stats, t],
  );

  const quickLinks = useMemo(() => getQuickLinks(t), [t]);

  const getStatusColor = (status: ProtocolHealth['status']) => {
    switch (status) {
      case 'healthy':
        return 'bg-success/20 text-success';
      case 'warning':
        return 'bg-warning/20 text-warning';
      case 'critical':
        return 'bg-error/20 text-error';
    }
  };

  const getStatusLabel = (status: ProtocolHealth['status']) => {
    switch (status) {
      case 'healthy':
        return t('common.status.healthy');
      case 'warning':
        return t('common.status.warning');
      case 'critical':
        return t('common.status.critical');
    }
  };

  const marketShareData = useMemo(() => {
    if (!state.protocols.length) return [];
    return state.protocols.map((p) => ({
      name: p.name,
      value: p.marketShare || 0,
      color:
        p.name === 'Chainlink'
          ? CHART_COLORS.series[0]
          : p.name === 'Pyth'
            ? CHART_COLORS.series[1]
            : p.name === 'API3'
              ? CHART_COLORS.series[2]
              : CHART_COLORS.series[3],
    }));
  }, [state.protocols]);

  const protocolComparisonData = useMemo(() => {
    if (!state.protocols.length) return [];
    return state.protocols.map((p) => ({
      name: p.name,
      tvl: parseFloat((p.tvl || '$0').replace(/[^0-9.]/g, '')),
      volume: parseFloat((p.volume24h || '$0').replace(/[^0-9.]/g, '')),
      latency: p.avgLatency,
      health: p.status === 'healthy' ? 100 : p.status === 'warning' ? 70 : 40,
    }));
  }, [state.protocols]);

  const { data: activityData, loading: activityLoading, error: activityError, refresh: refreshActivity } = useOnChainActivity();
  
  const onChainActivityData = useMemo(() => {
    if (activityData?.dailyData) {
      return activityData.dailyData;
    }
    return [];
  }, [activityData]);

  const SyncStatusIndicator = () => {
    const locale = lang === 'zh' ? 'zh' : 'en';

    if (state.syncStatus === 'error') {
      return (
        <div className="flex items-center gap-2 text-error">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">{t('overview.dataSync.failed')}</span>
        </div>
      );
    }

    if (state.syncStatus === 'syncing' || state.isSyncing) {
      return (
        <div className="flex items-center gap-2 text-warning">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">{t('overview.dataSync.syncing')}</span>
        </div>
      );
    }

    if (state.lastUpdated) {
      const freshness = formatFreshness(state.lastUpdated, locale);
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-success">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">{t('overview.dataSync.synced')}</span>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <div className="h-4 w-px bg-border" />
            <span className="text-xs text-muted-foreground">
              {t('overview.dataSync.lastUpdated')}:{' '}
              <span
                className={cn(
                  'font-medium',
                  freshness.color === 'success'
                    ? 'text-success'
                    : freshness.color === 'warning'
                      ? 'text-warning'
                      : 'text-error',
                )}
              >
                {formatTimeAgo(state.lastUpdated.toISOString(), locale)}
              </span>
            </span>
          </div>
        </div>
      );
    }

    return null;
  };

  const FreshnessBadge = ({ lastUpdate }: { lastUpdate: string }) => {
    const locale = lang === 'zh' ? 'zh' : 'en';
    const freshness = formatFreshness(lastUpdate, locale);

    const config = {
      success: {
        bg: 'bg-success/20',
        text: 'text-success',
        label: t('overview.freshness.fresh'),
      },
      warning: {
        bg: 'bg-warning/20',
        text: 'text-warning',
        label: t('overview.freshness.moderate'),
      },
      error: {
        bg: 'bg-error/20',
        text: 'text-error',
        label: t('overview.freshness.stale'),
      },
    }[freshness.color];

    return (
      <Badge variant="outline" className={cn('gap-1 border-0', config.bg, config.text)}>
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            freshness.color === 'success'
              ? 'bg-success'
              : freshness.color === 'warning'
                ? 'bg-warning'
                : 'bg-error',
          )}
        />
        <span className="text-[10px]">{config.label}</span>
      </Badge>
    );
  };

  if (state.error && !state.stats) {
    return (
      <div className="container mx-auto space-y-4 p-3 sm:p-4">
        <ErrorBanner
          error={new Error(state.error)}
          onRetry={fetchData}
          title={t('common.errorLoadFailed')}
          isRetrying={state.loading}
        />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {t('overview.pageTitle') || 'Oracle Network Overview'}
                </h1>
                <SyncStatusIndicator />
              </div>
              <p className="text-sm text-muted-foreground">
                {t('overview.pageDescription') || 'Real-time metrics and analytics'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchData} disabled={state.loading}>
                <RefreshCw className={cn('mr-2 h-4 w-4', state.loading && 'animate-spin')} />
                {t('common.refresh')}
              </Button>
              <AutoRefreshControl
                isEnabled={state.autoRefreshEnabled}
                onToggle={() => updateState({ autoRefreshEnabled: !state.autoRefreshEnabled })}
                interval={state.refreshInterval}
                onIntervalChange={(interval) => updateState({ refreshInterval: interval })}
                timeUntilRefresh={state.timeUntilRefresh}
              />
            </div>
          </div>

          {state.loading && !state.stats ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-28 w-full" />
                ))}
              </div>
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <>
              <KPIOverviewBar items={kpiItems} />

              <ContentSection>
                <div className="grid gap-4 lg:grid-cols-2">
                  <ChartCard
                    title={t('overview.protocolMarketShare') || 'Protocol Market Share'}
                    description={
                      t('overview.marketShareDesc') || 'TVL distribution across protocols'
                    }
                    icon={<Layers className="h-5 w-5" />}
                    className="grid-lines-light"
                  >
                    <div className="space-y-3">
                      {marketShareData.map((item) => (
                        <div key={item.name} className="flex items-center gap-3">
                          <div
                            className="h-3 w-3 rounded-sm"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="flex-1 text-sm font-medium">{item.name}</span>
                          <span className="font-mono text-sm text-muted-foreground">
                            {item.value.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                      <div className="mt-4 h-4 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="flex h-full transition-all duration-500"
                          style={{
                            width: '100%',
                          }}
                        >
                          {marketShareData.map((item) => (
                            <div
                              key={item.name}
                              className="h-full"
                              style={{
                                width: `${item.value}%`,
                                backgroundColor: item.color,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </ChartCard>

                  <ChartCard
                    title={t('overview.protocolHealth') || 'Protocol Health Status'}
                    description={t('overview.healthStatusDesc') || 'Quantified health scores'}
                    icon={<Shield className="h-5 w-5" />}
                  >
                    <EnhancedBarChart
                      data={state.protocols.map((p) => ({
                        name: p.name,
                        health: p.status === 'healthy' ? 100 : p.status === 'warning' ? 70 : 40,
                        latency: p.avgLatency,
                        feeds: p.activeFeeds,
                      }))}
                      bars={[
                        {
                          dataKey: 'health',
                          name: t('overview.healthScore') || 'Health',
                          color: CHART_COLORS.semantic.success.DEFAULT,
                        },
                      ]}
                      height={240}
                      valueFormatter={(v: number) => `${v}%`}
                      showGrid
                    />
                  </ChartCard>
                </div>
              </ContentSection>

              <ContentSection>
                <ChartCard
                  title={t('overview.protocolMetrics') || 'Protocol Metrics'}
                  description={t('overview.metricsDesc') || 'TVL and 24h Volume comparison'}
                  icon={<BarChart3 className="h-5 w-5" />}
                >
                  <EnhancedBarChart
                    data={protocolComparisonData}
                    bars={[
                      {
                        dataKey: 'tvl',
                        name: t('overview.tvl') || 'TVL',
                        color: CHART_COLORS.series[0],
                      },
                      {
                        dataKey: 'volume',
                        name: t('overview.volume24h') || '24h Volume',
                        color: CHART_COLORS.series[1],
                      },
                    ]}
                    height={280}
                    valueFormatter={(v) => `$${v}B`}
                    showGrid
                    showLegend
                  />
                </ChartCard>
              </ContentSection>

              <ContentSection>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {state.protocols.map((protocol) => (
                    <a
                      key={protocol.name}
                      href={protocol.href}
                      className="group rounded-xl border border-border/30 bg-background/50 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md hover:shadow-primary/5"
                    >
                      <div className="mb-4 flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'rounded-xl p-3 transition-transform group-hover:scale-110',
                              protocol.color,
                              'bg-background/80',
                            )}
                          >
                            {protocol.icon}
                          </div>
                          <div>
                            <h3 className="text-base font-semibold tracking-tight">
                              {protocol.name}
                            </h3>
                            <div className="mt-1 flex items-center gap-2">
                              <FreshnessBadge lastUpdate={protocol.lastUpdate} />
                              <Badge
                                variant="outline"
                                className={cn(
                                  'border-0 px-2 py-0.5 text-xs font-medium',
                                  getStatusColor(protocol.status),
                                )}
                              >
                                {getStatusLabel(protocol.status)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        {protocol.healthScore && (
                          <div className="flex flex-col items-center gap-1">
                            <HealthScoreBadge protocol={protocol} t={t} />
                            <span className="text-[10px] font-medium text-muted-foreground">
                              {t('overview.healthScore')}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mb-4 grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Layers className="h-3 w-3" />
                            <span>{t('overview.feeds') || 'Feeds'}</span>
                          </div>
                          <div className="text-lg font-bold tracking-tight">
                            <span className="text-foreground">{protocol.activeFeeds}</span>
                            <span className="font-normal text-muted-foreground">
                              /{protocol.feeds}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Zap className="h-3 w-3" />
                            <span>{t('overview.latency') || 'Latency'}</span>
                          </div>
                          <div
                            className={cn(
                              'text-lg font-bold tracking-tight',
                              protocol.avgLatency < 200
                                ? 'text-success'
                                : protocol.avgLatency < 300
                                  ? 'text-warning'
                                  : 'text-error',
                            )}
                          >
                            {protocol.avgLatency}
                            <span className="ml-0.5 text-sm font-normal text-muted-foreground">
                              ms
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <TrendingUp className="h-3 w-3" />
                            <span>TVL</span>
                          </div>
                          <div className="text-lg font-bold tracking-tight">{protocol.tvl}</div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Activity className="h-3 w-3" />
                            <span>{t('overview.volume24h') || '24h Vol'}</span>
                          </div>
                          <div className="text-lg font-bold tracking-tight">
                            {protocol.volume24h}
                          </div>
                        </div>
                      </div>

                      {protocol.latencyTrend.length >= 2 && (
                        <div className="border-t border-border/50 pt-3">
                          <div className="flex items-center justify-between">
                            {protocol.healthScore && (
                              <div className="flex items-center gap-2">
                                <HealthScoreTrend protocol={protocol} t={t} />
                              </div>
                            )}
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[10px] font-medium text-muted-foreground">
                                {t('overview.latencyTrend') || 'Latency Trend'}
                              </span>
                              <MiniTrend
                                data={protocol.latencyTrend}
                                width={96}
                                height={28}
                                color={
                                  protocol.status === 'healthy'
                                    ? 'success'
                                    : protocol.status === 'warning'
                                      ? 'neutral'
                                      : 'error'
                                }
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              </ContentSection>

              <ContentSection>
                <div className="grid gap-4 lg:grid-cols-2">
                  <ChartCard
                    title={t('overview.onChainActivity') || 'On-Chain Activity'}
                    description={t('overview.onChainActivityDesc') || 'Updates and active feeds'}
                    icon={<Activity className="h-5 w-5" />}
                    actions={
                      activityError ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={refreshActivity}
                          className="h-8 text-xs"
                        >
                          <RefreshCw className="h-3.5 w-3.5 mr-1" />
                          {t('common.retry') || '重试'}
                        </Button>
                      ) : null
                    }
                  >
                    {activityLoading ? (
                      <div className="flex h-[240px] items-center justify-center">
                        <Skeleton className="h-full w-full" />
                      </div>
                    ) : activityError ? (
                      <div className="flex h-[240px] flex-col items-center justify-center gap-2 text-center">
                        <AlertCircle className="h-8 w-8 text-warning" />
                        <p className="text-sm text-muted-foreground">
                          {t('overview.activityLoadError') || '加载活动数据失败，显示估算数据'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activityError.message}
                        </p>
                      </div>
                    ) : onChainActivityData.length > 0 ? (
                      <EnhancedBarChart
                        data={onChainActivityData}
                        bars={[
                          {
                            dataKey: 'updates',
                            name: t('overview.updates') || 'Updates',
                            color: CHART_COLORS.series[0],
                          },
                          {
                            dataKey: 'activeFeeds',
                            name: t('overview.activeFeeds') || 'Active Feeds',
                            color: CHART_COLORS.series[1],
                          },
                        ]}
                        height={240}
                        valueFormatter={(v) => formatNumber(v, 0)}
                        showGrid
                        showLegend
                      />
                    ) : (
                      <div className="flex h-[240px] items-center justify-center">
                        <p className="text-sm text-muted-foreground">
                          {t('common.noData') || '暂无数据'}
                        </p>
                      </div>
                    )}
                  </ChartCard>

                  <ChartCard
                    title={t('overview.priceTrend') || 'Price Trend'}
                    description={
                      <div className="flex flex-col gap-2">
                        <span>{t('overview.priceTrendDesc') || 'Aggregated price trend'}</span>
                        {state.priceDeviation && (
                          <div className="flex items-center gap-2 text-xs">
                            <Badge
                              variant="outline"
                              className={cn(
                                'border-0 px-1.5 py-0.5',
                                state.priceDeviation.deviationPercent < 0.5
                                  ? 'bg-success/10 text-success'
                                  : state.priceDeviation.deviationPercent < 1
                                    ? 'bg-warning/10 text-warning'
                                    : 'bg-error/10 text-error',
                              )}
                            >
                              偏差：{state.priceDeviation.deviationPercent.toFixed(3)}%
                            </Badge>
                            <span className="text-muted-foreground">
                              区间：${state.priceDeviation.minPrice.toFixed(2)} - $
                              {state.priceDeviation.maxPrice.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    }
                    icon={<TrendingUp className="h-5 w-5" />}
                    extraActions={
                      <div className="flex items-center gap-2">
                        <select
                          value={state.selectedAsset}
                          onChange={(e) => {
                            updateState({ selectedAsset: e.target.value });
                            setTimeout(() => fetchData(), 0);
                          }}
                          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium"
                        >
                          <option value="BTC/USD">BTC/USD</option>
                          <option value="ETH/USD">ETH/USD</option>
                          <option value="SOL/USD">SOL/USD</option>
                          <option value="LINK/USD">LINK/USD</option>
                        </select>
                        <TimeRangeSelector
                          value={state.timeRange}
                          onChange={(range) => updateState({ timeRange: range })}
                          showCustom={false}
                        />
                      </div>
                    }
                  >
                    {state.priceTrendData.length === 0 ? (
                      <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
                        <TrendingUp className="h-12 w-12 opacity-20" />
                        <div className="text-center">
                          <p className="text-sm font-medium">暂无价格数据</p>
                          <p className="text-xs">
                            该资产暂无聚合价格数据，请
                            <a
                              href="/compare/price"
                              className="text-primary hover:underline"
                              onClick={(e) => {
                                e.preventDefault();
                                window.location.href = '/compare/price';
                              }}
                            >
                              查看其他价格对比
                            </a>
                          </p>
                        </div>
                      </div>
                    ) : (
                      <EnhancedAreaChart
                        data={state.priceTrendData.map((d) => ({
                          timestamp: d.timestamp,
                          value: d.value,
                        }))}
                        dataKey="value"
                        color={CHART_COLORS.primary.DEFAULT}
                        height={240}
                        valueFormatter={(v) => `$${formatNumber(v, 2)}`}
                        showGrid
                        gradient
                      />
                    )}
                    <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">数据来源：</span>
                        <div className="flex items-center gap-1">
                          {['Chainlink', 'Pyth', 'API3', 'Band'].map((protocol) => (
                            <Badge key={protocol} variant="outline" className="text-[10px]">
                              {protocol}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <a
                        href="/compare/price"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        查看详细对比
                        <ChevronRight className="h-3 w-3" />
                      </a>
                    </div>
                  </ChartCard>
                </div>
              </ContentSection>

              {state.anomalies.length > 0 && (
                <ContentSection>
                  <div className="mb-4 flex items-center gap-2">
                    <CircleAlert className="h-5 w-5 text-orange-500" />
                    <div>
                      <h3 className="text-base font-semibold">
                        {t('overview.recentAnomalies') || 'Recent Anomalies'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t('overview.recentAnomaliesDesc') || 'Detected price deviations'}
                      </p>
                    </div>
                  </div>
                  <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                    <AnomalyList
                      anomalies={state.anomalies.map((a) => ({
                        ...a,
                        maxDeviation: a.maxDeviationPercent,
                        maxDeviationPercent: a.maxDeviationPercent / 100,
                      }))}
                      isLoading={state.loading}
                      onSelect={() => {}}
                    />
                  </Suspense>
                </ContentSection>
              )}

              <ContentSection>
                <h3 className="mb-4 text-base font-semibold">
                  {t('overview.quickAccess') || 'Quick Access'}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {quickLinks.map((link) => (
                    <a
                      key={link.title}
                      href={link.href}
                      className="flex items-center gap-3 rounded-lg border border-border/30 bg-background/50 p-3 transition-colors hover:border-primary/50 hover:bg-background/80"
                    >
                      <div className={cn('rounded-md p-2', link.color)}>{link.icon}</div>
                      <div>
                        <h4 className="text-sm font-medium">{link.title}</h4>
                        <p className="text-xs text-muted-foreground">{link.description}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </ContentSection>
            </>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
