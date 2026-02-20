'use client';

import { useState, useEffect, useCallback } from 'react';

import { RefreshCw, Zap, Users, Activity, Server, Clock, Shield } from 'lucide-react';

import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { RefreshIndicator } from '@/components/ui/RefreshIndicator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6">
      <Breadcrumb items={breadcrumbItems} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl lg:text-3xl">
            <Zap className="h-6 w-6 text-yellow-500" />
            <span>Pyth Network</span>
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
              <div className="mt-2 text-2xl font-bold">{overviewStats.totalPublishers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">活跃 Publisher</span>
                <div className="h-2 w-2 rounded-full bg-green-500" />
              </div>
              <div className="mt-2 text-2xl font-bold text-green-600">
                {overviewStats.activePublishers}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">活跃价格源</span>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 text-2xl font-bold text-yellow-600">
                {overviewStats.activePriceFeeds}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">平均延迟</span>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div
                className={cn('mt-2 text-2xl font-bold', getLatencyColor(overviewStats.avgLatency))}
              >
                {formatLatency(overviewStats.avgLatency)}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="publishers">Publisher</TabsTrigger>
          <TabsTrigger value="price-feeds">价格推送</TabsTrigger>
          <TabsTrigger value="hermes">服务状态</TabsTrigger>
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
              <CardTitle>Publisher 监控</CardTitle>
              <CardDescription>Pyth 数据发布者状态与性能监控</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <Skeleton className="h-24 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <Users className="mx-auto h-12 w-12 opacity-50" />
                  <p className="mt-2">Publisher 详细数据加载中...</p>
                  <p className="mt-1 text-sm">请稍后刷新页面查看完整数据</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="price-feeds" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>价格推送统计</CardTitle>
              <CardDescription>实时价格更新频率与延迟分析</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
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
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <Activity className="mx-auto h-12 w-12 opacity-50" />
                  <p className="mt-2">价格推送详细数据加载中...</p>
                  <p className="mt-1 text-sm">请稍后刷新页面查看完整数据</p>
                </div>
              )}
            </CardContent>
          </Card>
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
