'use client';

import { useState, useEffect, useCallback } from 'react';

import {
  RefreshCw,
  Database,
  Server,
  Clock,
  Activity,
  Shield,
  Link2,
  Users,
  LayoutDashboard,
} from 'lucide-react';

import { TrendIndicator, ProtocolHealthBadge } from '@/components/common';
import { AutoRefreshControl } from '@/components/common/AutoRefreshControl';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { RefreshIndicator } from '@/components/ui/RefreshIndicator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChainlinkExportButton } from '@/features/oracle/chainlink/components';
import { FeedAggregation } from '@/features/oracle/chainlink/components/FeedAggregation';
import { OcrRoundMonitor } from '@/features/oracle/chainlink/components/OcrRoundMonitor';
import { OperatorList } from '@/features/oracle/chainlink/components/OperatorList';
import { useI18n } from '@/i18n';
import { fetchApiData } from '@/shared/utils';

interface OverviewStats {
  totalFeeds: number;
  activeNodes: number;
  ocrRounds: number;
  avgLatency: number;
}

interface ChainlinkOverviewResponse {
  feeds: Array<{
    pair: string;
    status: string;
    decimals: number;
    lastUpdate: string;
  }>;
  metadata: {
    totalFeeds: number;
    activeFeeds: number;
    supportedChains: string[];
  };
}

export default function ChainlinkPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('overview');

  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [overviewData, setOverviewData] = useState<ChainlinkOverviewResponse | null>(null);

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

      const [overviewRes] = await Promise.all([
        fetchApiData<ChainlinkOverviewResponse>('/api/oracle/chainlink/overview'),
      ]);

      setOverviewData(overviewRes);

      setOverviewStats({
        totalFeeds: overviewRes.metadata?.totalFeeds ?? 0,
        activeNodes: 0,
        ocrRounds: 0,
        avgLatency: 0,
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

  const breadcrumbItems = [{ label: t('nav.oracle'), href: '/oracle' }, { label: 'Chainlink' }];

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6">
      <Breadcrumb items={breadcrumbItems} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl lg:text-3xl">
            <Link2 className="h-6 w-6 text-blue-600" />
            <span>Chainlink</span>
            <ProtocolHealthBadge
              status={overviewStats && overviewStats.activeNodes > 0 ? 'healthy' : 'warning'}
            />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            去中心化预言机网络 - OCR 轮次与节点运营商监控
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
          <ChainlinkExportButton
            data={
              overviewStats || overviewData
                ? {
                    overviewStats,
                    overviewData,
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
                <span className="text-sm font-medium text-muted-foreground">总喂价数</span>
                <Database className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-2xl font-bold">{overviewStats.totalFeeds}</span>
                <TrendIndicator trend="up" value={3.2} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">活跃节点数</span>
                <Server className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-2xl font-bold text-green-600">
                  {overviewStats.activeNodes}
                </span>
                <TrendIndicator trend="up" value={5.1} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">OCR 轮次</span>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-2xl font-bold">{overviewStats.ocrRounds}</span>
                <TrendIndicator trend="neutral" />
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
                <span className="text-2xl font-bold text-blue-600">
                  {overviewStats.avgLatency}ms
                </span>
                <TrendIndicator trend="down" value={8.5} />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <LayoutDashboard className="mr-1.5 h-4 w-4" />
            概览
          </TabsTrigger>
          <TabsTrigger value="ocr">
            <Activity className="mr-1.5 h-4 w-4" />
            OCR轮次
          </TabsTrigger>
          <TabsTrigger value="nodes">
            <Users className="mr-1.5 h-4 w-4" />
            节点运营商
          </TabsTrigger>
          <TabsTrigger value="feeds">
            <Database className="mr-1.5 h-4 w-4" />
            喂价聚合
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Chainlink 协议概览</CardTitle>
              <CardDescription>去中心化预言机网络状态摘要</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Chainlink 是领先的去中心化预言机网络，通过 OCR (Offchain Reporting)
                协议实现高效的数据聚合。网络由多个独立节点运营商组成，为智能合约提供可靠的外部数据。
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Activity className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">OCR 协议</p>
                        <p className="font-semibold">链下报告聚合</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Users className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">节点运营商</p>
                        <p className="font-semibold">去中心化数据源</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Shield className="h-8 w-8 text-purple-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">安全机制</p>
                        <p className="font-semibold">多签名验证</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>支持的链</CardTitle>
              <CardDescription>Chainlink 支持的区块链网络</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {overviewData?.metadata?.supportedChains?.map((chain) => (
                  <Badge key={chain} variant="secondary" className="capitalize">
                    {chain}
                  </Badge>
                )) || (
                  <>
                    <Badge variant="secondary">Ethereum</Badge>
                    <Badge variant="secondary">Polygon</Badge>
                    <Badge variant="secondary">Arbitrum</Badge>
                    <Badge variant="secondary">Optimism</Badge>
                    <Badge variant="secondary">Avalanche</Badge>
                    <Badge variant="secondary">BSC</Badge>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ocr" className="mt-6">
          <OcrRoundMonitor />
        </TabsContent>

        <TabsContent value="nodes" className="mt-6">
          <OperatorList />
        </TabsContent>

        <TabsContent value="feeds" className="mt-6">
          <FeedAggregation />
        </TabsContent>
      </Tabs>
    </div>
  );
}
