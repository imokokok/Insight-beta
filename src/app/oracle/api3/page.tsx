'use client';

import { useState, useEffect, useCallback } from 'react';

import { RefreshCw, Server, TrendingUp, Database, Shield, LayoutDashboard } from 'lucide-react';

import { AutoRefreshControl } from '@/components/common/AutoRefreshControl';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { ProtocolHealthBadge } from '@/components/common/ProtocolHealthBadge';
import { TrendIndicator } from '@/components/common/TrendIndicator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { RefreshIndicator } from '@/components/ui/RefreshIndicator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  OevOverview,
  DapiList,
  SignatureVerifyPanel,
  Api3ExportButton,
} from '@/features/oracle/api3';
import { useI18n } from '@/i18n';
import { fetchApiData } from '@/shared/utils';
import { formatTime } from '@/shared/utils/format/date';
import { cn } from '@/shared/utils/ui';

interface AirnodesResponse {
  airnodes: Array<{
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
    oevAmount: string;
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
  totalOev: number;
  totalDapis: number;
}

export default function Api3Page() {
  const { t } = useI18n();
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
        totalOev: 0,
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

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
  };

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
                <span className="text-sm font-medium text-muted-foreground">总 Airnodes</span>
                <Server className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="text-2xl font-bold">{overviewStats.totalAirnodes}</div>
                <TrendIndicator trend="up" value={2.5} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">在线 Airnodes</span>
                <div className="h-2 w-2 rounded-full bg-green-500" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="text-2xl font-bold text-green-600">
                  {overviewStats.onlineAirnodes}
                </div>
                <TrendIndicator trend="up" value={3.1} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">OEV 总量</span>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(overviewStats.totalOev)}
                </div>
                <TrendIndicator trend="up" value={15.8} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">dAPIs 数量</span>
                <Database className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="text-2xl font-bold">{overviewStats.totalDapis}</div>
                <TrendIndicator trend="up" value={1.2} />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
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
            OEV
          </TabsTrigger>
          <TabsTrigger value="dapis" className="flex items-center gap-1.5">
            <Database className="h-4 w-4" />
            dAPIs
          </TabsTrigger>
          <TabsTrigger value="verify" className="flex items-center gap-1.5">
            <Shield className="h-4 w-4" />
            签名验证
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API3 协议概览</CardTitle>
              <CardDescription>第一方预言机网络状态摘要</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                API3 是一个第一方预言机解决方案，通过 Airnode 技术实现去中心化数据馈送。 API3
                协议提供安全、透明且可验证的链上数据，支持多种区块链网络。
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Server className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Airnode 技术</p>
                        <p className="font-semibold">第一方预言机节点</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Shield className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">签名验证</p>
                        <p className="font-semibold">可验证的数据源</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-8 w-8 text-purple-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">OEV 捕获</p>
                        <p className="font-semibold">最大化价值提取</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="airnodes" className="mt-6">
          {loading && !airnodesData ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : airnodesData ? (
            <>
              {airnodesData.airnodes.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Server className="mx-auto h-12 w-12 opacity-50" />
                    <p className="mt-2">暂无 Airnode 数据</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {airnodesData.airnodes.map((airnode, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Server className="h-4 w-4 text-primary" />
                            Airnode
                          </CardTitle>
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
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">链</p>
                            <Badge variant="secondary" className="text-xs">
                              {airnode.chain}
                            </Badge>
                          </div>
                          <div className="space-y-1">
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
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">最后心跳</p>
                          <p className="text-sm font-medium">
                            {airnode.lastHeartbeat ? formatTime(airnode.lastHeartbeat) : '-'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="oev" className="mt-6">
          {loading && !oevData ? (
            <div className="space-y-6">
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
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            </div>
          ) : oevData ? (
            <OevOverview loading={loading} />
          ) : null}
        </TabsContent>

        <TabsContent value="dapis" className="mt-6">
          <DapiList />
        </TabsContent>

        <TabsContent value="verify" className="mt-6">
          <SignatureVerifyPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
