'use client';

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';

import { motion } from 'framer-motion';
import {
  Activity,
  Shield,
  Zap,
  TrendingUp,
  Link2,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Globe,
} from 'lucide-react';

import { EnhancedAreaChart, EnhancedBarChart } from '@/components/charts';
import { CHART_COLORS } from '@/components/charts';
import {
  ContentSection,
  ContentGrid,
  AutoRefreshControl,
  Breadcrumb,
  ErrorBoundary,
  KPIOverviewBar,
  type KPIItem,
  TimeRangeSelector,
  type TimeRange,
} from '@/components/common';
import { ChartCard } from '@/components/common';
import { MiniTrend } from '@/components/common/data/MiniTrend';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { ErrorBanner } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { useI18n } from '@/i18n/LanguageProvider';
import { fetchApiData, formatNumber, cn } from '@/shared/utils';

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
}

interface OverviewStats {
  totalTVL: string;
  totalProtocols: number;
  avgLatency: number;
  healthScore: number;
  totalFeeds: number;
  activeFeeds: number;
  totalUpdates24h: number;
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
    scenario: t('overview.quickLinks.priceComparison.scenario'),
    icon: <BarChart3 className="h-5 w-5" />,
    href: '/compare/price',
    color: 'bg-blue-500/10 text-blue-500',
  },
  {
    title: t('overview.quickLinks.crossChain.title'),
    description: t('overview.quickLinks.crossChain.description'),
    scenario: t('overview.quickLinks.crossChain.scenario'),
    icon: <Globe className="h-5 w-5" />,
    href: '/cross-chain',
    color: 'bg-green-500/10 text-green-500',
  },
  {
    title: t('overview.quickLinks.alerts.title'),
    description: t('overview.quickLinks.alerts.description'),
    scenario: t('overview.quickLinks.alerts.scenario'),
    icon: <AlertTriangle className="h-5 w-5" />,
    href: '/alerts',
    color: 'bg-orange-500/10 text-orange-500',
  },
  {
    title: t('overview.quickLinks.reliability.title'),
    description: t('overview.quickLinks.reliability.description'),
    scenario: t('overview.quickLinks.reliability.scenario'),
    icon: <Shield className="h-5 w-5" />,
    href: '/compare/reliability',
    color: 'bg-purple-500/10 text-purple-500',
  },
];

export default function OverviewPage() {
  const { t } = useI18n();

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
  });

  const updateState = useCallback((partial: Partial<OverviewPageState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const fetchData = useCallback(async () => {
    try {
      updateState({ loading: true, error: null });

      const [statsRes, trendRes, anomaliesRes] = await Promise.all([
        fetchApiData<OverviewStats>('/api/oracle/stats').catch(() => null),
        fetchApiData<PriceTrendPoint[]>('/api/oracle/history/prices?latest=true').catch(() => []),
        fetchApiData<AnomalyData[]>('/api/oracle/analytics/deviation?type=report').catch(() => []),
      ]);

      const mockStats: OverviewStats = statsRes ?? {
        totalTVL: '$45.2B',
        totalProtocols: 4,
        avgLatency: 245,
        healthScore: 98.5,
        totalFeeds: 256,
        activeFeeds: 248,
        totalUpdates24h: 125000,
      };

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

        const feeds = feedsValues[index] ?? 0;
        const activeFeeds = activeFeedsValues[index] ?? 0;
        const avgLatency = avgLatencyValues[index] ?? 0;
        const latencyTrend = [...(latencyTrendValues[index] ?? [])];
        const status: 'healthy' | 'warning' | 'critical' =
          avgLatency < 200 ? 'healthy' : avgLatency < 300 ? 'warning' : 'critical';

        return {
          ...config,
          status,
          feeds,
          activeFeeds,
          avgLatency,
          lastUpdate: new Date().toISOString(),
          latencyTrend,
        };
      });

      const mockTrendData: PriceTrendPoint[] = trendRes.length
        ? trendRes
        : Array.from({ length: 24 }, (_, i) => ({
            timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
            value: 67000 + Math.random() * 2000 - 1000,
          }));

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

      updateState({
        stats: mockStats,
        protocols,
        priceTrendData: mockTrendData,
        anomalies: mockAnomalies,
        lastUpdated: new Date(),
      });
    } catch (err) {
      updateState({ error: err instanceof Error ? err.message : 'Failed to fetch data' });
    } finally {
      updateState({ loading: false });
    }
  }, [updateState]);

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

    return () => clearInterval(interval);
  }, [state.autoRefreshEnabled, state.refreshInterval, fetchData, updateState]);

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
              color: 'blue',
            },
            {
              id: 'protocols',
              label: t('common.kpi.activeProtocols'),
              value: state.stats.totalProtocols,
              icon: <Shield className="h-5 w-5" />,
              trend: { value: 0, isPositive: true },
              color: 'green',
            },
            {
              id: 'latency',
              label: t('common.kpi.avgLatency'),
              value: `${state.stats.avgLatency}ms`,
              icon: <Zap className="h-5 w-5" />,
              trend: { value: 3.5, isPositive: false },
              color: 'amber',
            },
            {
              id: 'health',
              label: t('common.kpi.healthScore'),
              value: `${state.stats.healthScore}%`,
              icon: <Activity className="h-5 w-5" />,
              trend: { value: 0.5, isPositive: true },
              color: 'purple',
            },
          ]
        : [],
    [state.stats, t],
  );

  const breadcrumbItems = [
    { label: t('nav.oracle'), href: '/oracle' },
    { label: t('nav.overview') },
  ];

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

  if (state.error && !state.stats) {
    return (
      <div className="container mx-auto space-y-4 p-3 sm:p-4">
        <Breadcrumb items={breadcrumbItems} />
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
      <div className="min-h-screen pb-16 md:pb-0">
        <div className="space-y-3">
          <Breadcrumb items={breadcrumbItems} />

          <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl lg:text-3xl">
                <Activity className="h-6 w-6 text-primary" />
                {t('overview.pageTitle') || '预言机概览'}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                {t('overview.pageDescription') || '整合所有预言机的状态总览'}
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
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
              <Skeleton className="h-96 w-full" />
            </div>
          ) : (
            <>
              <KPIOverviewBar items={kpiItems} />

              <ContentSection
                title={t('overview.protocolHealth') || '协议健康状态'}
                description={t('overview.protocolHealthDesc') || '各预言机协议运行状态'}
              >
                <ContentGrid columns={4} gap="sm">
                  {state.protocols.map((protocol) => (
                    <motion.a
                      key={protocol.name}
                      href={protocol.href}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                      className="group rounded-xl border border-border/30 bg-card/30 p-4 transition-all hover:border-primary/30 hover:shadow-lg"
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div className={cn('rounded-lg bg-muted p-2', protocol.color)}>
                          {protocol.icon}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn('border-0', getStatusColor(protocol.status))}
                        >
                          {getStatusLabel(protocol.status)}
                        </Badge>
                      </div>
                      <h3 className="mb-2 font-semibold">{protocol.name}</h3>
                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <span>{t('overview.feeds') || '价格源'}</span>
                          <span className="font-mono font-medium text-foreground">
                            {protocol.activeFeeds}/{protocol.feeds}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>{t('overview.latency') || '延迟'}</span>
                          <span
                            className={cn(
                              'font-mono font-medium',
                              protocol.avgLatency < 200
                                ? 'text-success'
                                : protocol.avgLatency < 300
                                  ? 'text-warning'
                                  : 'text-error',
                            )}
                          >
                            {protocol.avgLatency}ms
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
                          <span>{t('common.viewDetails') || '查看详情'}</span>
                          <ArrowRight className="h-3 w-3" />
                        </div>
                        {protocol.latencyTrend.length >= 2 && (
                          <MiniTrend
                            data={protocol.latencyTrend}
                            width={48}
                            height={16}
                            color={
                              protocol.status === 'healthy'
                                ? 'success'
                                : protocol.status === 'warning'
                                  ? 'neutral'
                                  : 'error'
                            }
                          />
                        )}
                      </div>
                    </motion.a>
                  ))}
                </ContentGrid>
              </ContentSection>

              <div className="grid gap-4 lg:grid-cols-2">
                <ChartCard
                  title={t('overview.priceTrend') || '聚合价格趋势'}
                  description={t('overview.priceTrendDesc') || '主要资产价格走势'}
                  icon={<TrendingUp className="h-5 w-5" />}
                  extraActions={
                    <TimeRangeSelector
                      value={state.timeRange}
                      onChange={(range) => updateState({ timeRange: range })}
                      showCustom={false}
                    />
                  }
                >
                  <EnhancedAreaChart
                    data={state.priceTrendData.map((d) => ({
                      timestamp: d.timestamp,
                      value: d.value,
                    }))}
                    dataKey="value"
                    color={CHART_COLORS.primary.DEFAULT}
                    height={280}
                    valueFormatter={(v) => `$${formatNumber(v, 2)}`}
                    showGrid
                    gradient
                  />
                </ChartCard>

                <ChartCard
                  title={t('overview.protocolComparison') || '协议对比'}
                  description={t('overview.protocolComparisonDesc') || '各协议性能对比'}
                  icon={<BarChart3 className="h-5 w-5" />}
                >
                  <EnhancedBarChart
                    data={state.protocols.map((p) => ({
                      name: p.name,
                      latency: p.avgLatency,
                      feeds: p.activeFeeds,
                      health: p.status === 'healthy' ? 100 : p.status === 'warning' ? 70 : 40,
                    }))}
                    bars={[
                      {
                        dataKey: 'latency',
                        name: t('overview.latencyMs') || '延迟(ms)',
                        color: CHART_COLORS.series[0],
                      },
                      {
                        dataKey: 'health',
                        name: t('overview.healthScore') || '健康度',
                        color: CHART_COLORS.series[1],
                      },
                    ]}
                    height={280}
                    valueFormatter={(v) => formatNumber(v, 0)}
                    showGrid
                    showLegend
                  />
                </ChartCard>
              </div>

              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {t('overview.recentAnomalies') || '最近异常'}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t('overview.recentAnomaliesDesc') || '最近检测到的价格异常'}
                  </p>
                </div>
              </div>
              {state.anomalies.length > 0 ? (
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
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Shield className="mb-3 h-12 w-12 opacity-50" />
                  <p>{t('overview.noAnomalies') || '暂无异常'}</p>
                </div>
              )}

              <ContentSection
                title={t('overview.quickAccess') || '快速入口'}
                description={t('overview.quickAccessDesc') || '常用功能快速访问'}
              >
                <ContentGrid columns={4} gap="sm">
                  {quickLinks.map((link) => (
                    <a
                      key={link.title}
                      href={link.href}
                      className="group flex flex-col items-center gap-2 rounded-xl border border-border/30 bg-card/30 p-4 text-center transition-all hover:border-primary/30 hover:shadow-md"
                    >
                      <div className={cn('rounded-lg p-3', link.color)}>{link.icon}</div>
                      <div>
                        <h4 className="font-medium">{link.title}</h4>
                        <p className="mt-0.5 text-xs text-muted-foreground">{link.description}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground/70">{link.scenario}</p>
                      </div>
                    </a>
                  ))}
                </ContentGrid>
              </ContentSection>
            </>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
