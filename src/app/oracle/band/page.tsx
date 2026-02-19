'use client';

import { useState, useEffect, useCallback } from 'react';

import { RefreshCw, GitBranch, Activity, Database, Shield, Globe } from 'lucide-react';

import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { RefreshIndicator } from '@/components/ui/RefreshIndicator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  BridgeStatusCard,
  DataSourceList,
  TransferHistory,
  CosmosChainSelector,
} from '@/features/oracle/band';
import type { Bridge, DataSource } from '@/features/oracle/band';
import { useI18n } from '@/i18n';
import { fetchApiData } from '@/shared/utils';

interface BridgesResponse {
  bridges: Bridge[];
  summary: {
    total: number;
    active: number;
    inactive: number;
    degraded: number;
    totalTransfers: number;
    avgLatency: number;
  };
}

interface SourcesResponse {
  sources: DataSource[];
  summary: {
    total: number;
    active: number;
    inactive: number;
    evmCount: number;
    cosmosCount: number;
    avgReliability: number;
  };
}

interface OverviewStats {
  totalBridges: number;
  activeBridges: number;
  totalTransfers: number;
  totalSources: number;
}

const SUPPORTED_CHAINS = [
  'ethereum',
  'polygon',
  'arbitrum',
  'optimism',
  'avalanche',
  'bsc',
  'fantom',
  'cosmos',
  'osmosis',
  'juno',
];

export default function BandProtocolPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('overview');
  const [bridgesData, setBridgesData] = useState<BridgesResponse | null>(null);
  const [sourcesData, setSourcesData] = useState<SourcesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedCosmosChain, setSelectedCosmosChain] = useState('cosmoshub-4');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [bridgesRes, sourcesRes] = await Promise.all([
        fetchApiData<BridgesResponse>('/api/oracle/band/bridges'),
        fetchApiData<SourcesResponse>('/api/oracle/band/sources'),
      ]);

      setBridgesData(bridgesRes);
      setSourcesData(sourcesRes);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const breadcrumbItems = [{ label: t('nav.oracle'), href: '/oracle' }, { label: 'Band Protocol' }];

  const overviewStats: OverviewStats = {
    totalBridges: bridgesData?.summary.total ?? 0,
    activeBridges: bridgesData?.summary.active ?? 0,
    totalTransfers: bridgesData?.summary.totalTransfers ?? 0,
    totalSources: sourcesData?.summary.total ?? 0,
  };

  const getChainConnectivity = () => {
    if (!bridgesData) return [];
    return SUPPORTED_CHAINS.map((chain) => {
      const isActive = bridgesData.bridges.some(
        (b) => (b.sourceChain === chain || b.destinationChain === chain) && b.status === 'active',
      );
      return { chain, isActive };
    });
  };

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6">
      <Breadcrumb items={breadcrumbItems} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl lg:text-3xl">
            <Globe className="h-6 w-6 text-orange-600" />
            <span>Band Protocol</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">跨链预言机 - Cosmos 生态与数据桥监控</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
          <RefreshIndicator
            lastUpdated={lastUpdated}
            isRefreshing={loading}
            onRefresh={fetchData}
          />
        </div>
      </div>

      {error && (
        <ErrorBanner
          error={new Error(error)}
          onRetry={fetchData}
          title="加载数据失败"
          isRetrying={loading}
        />
      )}

      {loading && !bridgesData && !sourcesData ? (
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
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">总数据桥数</span>
                  <GitBranch className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-2 text-2xl font-bold">{overviewStats.totalBridges}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">活跃数据桥数</span>
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                </div>
                <div className="mt-2 text-2xl font-bold text-green-600">
                  {overviewStats.activeBridges}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">总传输量</span>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-2 text-2xl font-bold">
                  {overviewStats.totalTransfers.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">数据源数量</span>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-2 text-2xl font-bold">{overviewStats.totalSources}</div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">概览</TabsTrigger>
              <TabsTrigger value="bridges">数据桥</TabsTrigger>
              <TabsTrigger value="sources">数据源</TabsTrigger>
              <TabsTrigger value="transfers">传输历史</TabsTrigger>
              <TabsTrigger value="cosmos">Cosmos</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>协议状态摘要</CardTitle>
                    <CardDescription>Band Protocol 整体运行状态</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="rounded-lg bg-muted/30 p-4">
                        <div className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-green-500" />
                          <span className="font-medium">系统状态</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="success">正常运行</Badge>
                        </div>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-4">
                        <div className="flex items-center gap-2">
                          <Activity className="h-5 w-5 text-blue-500" />
                          <span className="font-medium">平均延迟</span>
                        </div>
                        <div className="mt-2 text-lg font-semibold">
                          {bridgesData?.summary.avgLatency ?? 0}ms
                        </div>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-4">
                        <div className="flex items-center gap-2">
                          <Database className="h-5 w-5 text-purple-500" />
                          <span className="font-medium">数据可靠性</span>
                        </div>
                        <div className="mt-2 text-lg font-semibold">
                          {sourcesData?.summary.avgReliability.toFixed(1) ?? 0}%
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>支持的链连接情况</CardTitle>
                    <CardDescription>各区块链网络的数据桥连接状态</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {getChainConnectivity().map(({ chain, isActive }) => (
                        <Badge
                          key={chain}
                          variant="secondary"
                          className={`capitalize ${isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}
                        >
                          {chain}
                          {isActive && <span className="ml-1 text-xs">●</span>}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <GitBranch className="h-5 w-5" />
                        最近数据桥
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {bridgesData?.bridges.slice(0, 3).map((bridge) => (
                        <BridgeStatusCard key={bridge.bridgeId} bridge={bridge} className="mb-3" />
                      ))}
                      {bridgesData?.bridges.length === 0 && (
                        <div className="py-8 text-center text-muted-foreground">暂无数据桥信息</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        数据源分布
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">EVM 链数据源</span>
                          <span className="font-semibold">
                            {sourcesData?.summary.evmCount ?? 0}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-blue-500"
                            style={{
                              width: `${
                                sourcesData
                                  ? (sourcesData.summary.evmCount /
                                      (sourcesData.summary.evmCount +
                                        sourcesData.summary.cosmosCount)) *
                                    100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Cosmos 链数据源</span>
                          <span className="font-semibold">
                            {sourcesData?.summary.cosmosCount ?? 0}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-purple-500"
                            style={{
                              width: `${
                                sourcesData
                                  ? (sourcesData.summary.cosmosCount /
                                      (sourcesData.summary.evmCount +
                                        sourcesData.summary.cosmosCount)) *
                                    100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="bridges">
              <Card>
                <CardHeader>
                  <CardTitle>数据桥列表</CardTitle>
                  <CardDescription>
                    显示 {bridgesData?.bridges.length ?? 0} 个数据桥
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {bridgesData?.bridges.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <GitBranch className="mx-auto h-12 w-12 opacity-50" />
                      <p className="mt-2">暂无数据桥信息</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {bridgesData?.bridges.map((bridge) => (
                        <BridgeStatusCard key={bridge.bridgeId} bridge={bridge} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sources">
              <DataSourceList
                sources={sourcesData?.sources}
                loading={loading}
                chain={undefined}
                symbol={undefined}
              />
            </TabsContent>

            <TabsContent value="transfers">
              <TransferHistory limit={20} />
            </TabsContent>

            <TabsContent value="cosmos">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Cosmos 链选择器
                    </CardTitle>
                    <CardDescription>选择 Cosmos 生态链查看详细数据</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CosmosChainSelector
                      selectedChain={selectedCosmosChain}
                      onChainChange={setSelectedCosmosChain}
                      showDetails={true}
                      filterType="mainnet"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Cosmos 生态数据</CardTitle>
                    <CardDescription>当前选中链的数据传输状态</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="rounded-lg bg-muted/30 p-4">
                        <span className="text-sm text-muted-foreground">选中链 ID</span>
                        <div className="mt-1 font-mono text-lg">{selectedCosmosChain}</div>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-4">
                        <span className="text-sm text-muted-foreground">IBC 连接数</span>
                        <div className="mt-1 text-lg font-semibold">12</div>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-4">
                        <span className="text-sm text-muted-foreground">数据请求</span>
                        <div className="mt-1 text-lg font-semibold">1,234</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
