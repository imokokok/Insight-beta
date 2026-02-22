'use client';

import { useState, useEffect, useCallback } from 'react';

import { useRouter } from 'next/navigation';

import {
  RefreshCw,
  Server,
  TrendingUp,
  Database,
  Shield,
  LayoutDashboard,
  Fuel,
  GitCompare,
  Bell,
} from 'lucide-react';

import { ContentSection, ContentGrid, StatsBar } from '@/components/common';
import { AutoRefreshControl } from '@/components/common/AutoRefreshControl';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { ProtocolHealthBadge } from '@/components/common/ProtocolHealthBadge';
import { Button } from '@/components/ui';
import { ErrorBanner } from '@/components/ui';
import { RefreshIndicator } from '@/components/ui';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import {
  PriceUpdateMonitor,
  DapiList,
  SignatureVerifyPanel,
  Api3ExportButton,
  GasCostAnalysis,
  CrossProtocolComparison,
  AlertConfigPanel,
} from '@/features/oracle/api3';
import { useI18n } from '@/i18n';
import { fetchApiData } from '@/shared/utils';
import { formatTime } from '@/shared/utils/format/date';
import { cn } from '@/shared/utils/ui';

interface AirnodesResponse {
  airnodes: Array<{
    address: string;
    chain: string;
    online: boolean;
    lastHeartbeat: string | null;
    responseTime: number;
    dataFeeds: string[];
  }>;
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
  totalDapis: number;
}

export default function Api3Page() {
  const { t } = useI18n();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');

  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [airnodesData, setAirnodesData] = useState<AirnodesResponse | null>(null);
  const [oevData, setOevData] = useState<OevResponse | null>(null);
  const [_dapisData, setDapisData] = useState<DapisResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(0);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [airnodesRes, oevRes, dapisRes] = await Promise.all([
        fetchApiData<AirnodesResponse>('/api/oracle/api3/airnodes'),
        fetchApiData<OevResponse>('/api/oracle/api3/oev'),
        fetchApiData<DapisResponse>('/api/oracle/api3/dapis'),
      ]);

      setAirnodesData(airnodesRes);
      setOevData(oevRes);
      setDapisData(dapisRes);

      setOverviewStats({
        totalAirnodes: airnodesRes.metadata?.total ?? 0,
        onlineAirnodes: airnodesRes.metadata?.online ?? 0,
        totalDapis: dapisRes.metadata?.total ?? 0,
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

  const breadcrumbItems = [{ label: t('nav.oracle'), href: '/oracle' }, { label: 'API3' }];

  const getResponseTimeColor = (ms: number) => {
    if (ms < 100) return 'text-green-500';
    if (ms < 300) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6">
      <Breadcrumb items={breadcrumbItems} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl lg:text-3xl">
            <Server className="h-6 w-6 text-blue-600" />
            <span>API3</span>
            {overviewStats && (
              <ProtocolHealthBadge
                status={
                  overviewStats.totalAirnodes > 0 &&
                  overviewStats.onlineAirnodes / overviewStats.totalAirnodes >= 0.9
                    ? 'healthy'
                    : overviewStats.totalAirnodes > 0 &&
                        overviewStats.onlineAirnodes / overviewStats.totalAirnodes >= 0.7
                      ? 'warning'
                      : 'critical'
                }
                label={
                  overviewStats.totalAirnodes > 0
                    ? `${((overviewStats.onlineAirnodes / overviewStats.totalAirnodes) * 100).toFixed(0)}% 在线`
                    : undefined
                }
              />
            )}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            第一方预言机 - Airnode 技术与签名数据验证
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
          <Api3ExportButton
            data={
              overviewStats || airnodesData || oevData || _dapisData
                ? {
                    overviewStats,
                    airnodesData,
                    oevData,
                    dapisData: _dapisData,
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
          title="API3 网络状态"
          items={[
            {
              label: '总 Airnodes',
              value: overviewStats.totalAirnodes,
              trend: 'up' as const,
              icon: <Server className="h-4 w-4" />,
            },
            {
              label: '在线 Airnodes',
              value: overviewStats.onlineAirnodes,
              trend: 'up' as const,
              status: 'healthy' as const,
            },
            {
              label: '价格更新事件',
              value: oevData?.metadata?.total ?? 0,
              trend: 'up' as const,
              icon: <TrendingUp className="h-4 w-4" />,
            },
            {
              label: 'dAPIs 数量',
              value: overviewStats.totalDapis,
              trend: 'up' as const,
              icon: <Database className="h-4 w-4" />,
            },
          ]}
          showProgress
          progressData={[
            { label: '在线', value: overviewStats.onlineAirnodes, color: '#22c55e' },
            {
              label: '离线',
              value: overviewStats.totalAirnodes - overviewStats.onlineAirnodes,
              color: '#ef4444',
            },
          ]}
        />
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview" className="flex items-center gap-1.5">
            <LayoutDashboard className="h-4 w-4" />
            概览
          </TabsTrigger>
          <TabsTrigger value="airnodes" className="flex items-center gap-1.5">
            <Server className="h-4 w-4" />
            Airnodes
          </TabsTrigger>
          <TabsTrigger value="oev" className="flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4" />
            价格更新
          </TabsTrigger>
          <TabsTrigger value="dapis" className="flex items-center gap-1.5">
            <Database className="h-4 w-4" />
            dAPIs
          </TabsTrigger>
          <TabsTrigger value="gas" className="flex items-center gap-1.5">
            <Fuel className="h-4 w-4" />
            Gas 成本
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-1.5">
            <GitCompare className="h-4 w-4" />
            对比
          </TabsTrigger>
          <TabsTrigger value="verify" className="flex items-center gap-1.5">
            <Shield className="h-4 w-4" />
            签名验证
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-1.5">
            <Bell className="h-4 w-4" />
            监控
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <ContentSection title="API3 协议概览" description="第一方预言机网络状态摘要">
            <p className="text-muted-foreground">
              API3 是一个第一方预言机解决方案，通过 Airnode 技术实现去中心化数据馈送。 API3
              协议提供安全、透明且可验证的链上数据，支持多种区块链网络。
            </p>
          </ContentSection>

          <ContentSection title="核心特性">
            <ContentGrid columns={3}>
              <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-muted/30 p-4">
                <div className="rounded-lg bg-blue-500/10 p-3">
                  <Server className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Airnode 技术</p>
                  <p className="font-semibold text-foreground">第一方预言机节点</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-muted/30 p-4">
                <div className="rounded-lg bg-green-500/10 p-3">
                  <Shield className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">签名验证</p>
                  <p className="font-semibold text-foreground">可验证的数据源</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-muted/30 p-4">
                <div className="rounded-lg bg-purple-500/10 p-3">
                  <TrendingUp className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">价格更新监控</p>
                  <p className="font-semibold text-foreground">追踪价格更新事件</p>
                </div>
              </div>
            </ContentGrid>
          </ContentSection>
        </TabsContent>

        <TabsContent value="airnodes" className="mt-6">
          {loading && !airnodesData ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : airnodesData ? (
            <>
              {airnodesData.airnodes.length === 0 ? (
                <div className="rounded-xl border border-border/30 bg-card/30 py-12 text-center text-muted-foreground">
                  <Server className="mx-auto h-12 w-12 opacity-50" />
                  <p className="mt-2">暂无 Airnode 数据</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {airnodesData.airnodes.map((airnode, index) => (
                    <div
                      key={index}
                      className="flex cursor-pointer items-center justify-between rounded-xl border border-border/30 bg-card/30 p-4 transition-colors hover:bg-muted/30"
                      onClick={() => router.push(`/oracle/api3/airnode/${airnode.address}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <Server className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Airnode</span>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                airnode.online
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }`}
                            >
                              {airnode.online ? t('common.online') : t('common.offline')}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            最后心跳:{' '}
                            {airnode.lastHeartbeat ? formatTime(airnode.lastHeartbeat) : '-'}
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
        </TabsContent>

        <TabsContent value="oev" className="mt-6">
          <PriceUpdateMonitor loading={loading} />
        </TabsContent>

        <TabsContent value="dapis" className="mt-6">
          <DapiList />
        </TabsContent>

        <TabsContent value="gas" className="mt-6">
          <GasCostAnalysis />
        </TabsContent>

        <TabsContent value="comparison" className="mt-6">
          <CrossProtocolComparison />
        </TabsContent>

        <TabsContent value="verify" className="mt-6">
          <SignatureVerifyPanel />
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          <AlertConfigPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
