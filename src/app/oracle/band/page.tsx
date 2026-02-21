'use client';

import { useState, useEffect, useCallback } from 'react';

import {
  RefreshCw,
  GitBranch,
  Activity,
  Database,
  Shield,
  Globe,
  LayoutDashboard,
  FileCode,
  TrendingUp,
  BarChart3,
  ArrowLeftRight,
} from 'lucide-react';

import { StatsBar } from '@/components/common';
import { AutoRefreshControl } from '@/components/common/AutoRefreshControl';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { ProtocolHealthBadge } from '@/components/common/ProtocolHealthBadge';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { ErrorBanner } from '@/components/ui';
import { RefreshIndicator } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import {
  BridgeStatusCard,
  DataSourceList,
  TransferHistory,
  CosmosChainSelector,
  BandExportButton,
  AggregationValidationCard,
  BandPriceChart,
  DataFreshnessCard,
  OracleScriptList,
  ValidatorHealthCard,
  BridgeTrendChart,
  PriceTrendTab,
  QualityAnalysisTab,
  PriceComparisonTab,
} from '@/features/oracle/band';
import type {
  Bridge,
  DataSource,
  OracleScript,
  ValidatorHealthSummary,
} from '@/features/oracle/band';
import { useI18n } from '@/i18n';
import { fetchApiData, cn } from '@/shared/utils';

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

interface IBCStatusData {
  chainId: string;
  network: 'mainnet' | 'testnet';
  connections: {
    total: number;
    open: number;
    init: number;
    tryopen: number;
  };
  channels: {
    total: number;
    open: number;
    closed: number;
  };
  summary: {
    totalConnections: number;
    activeConnections: number;
    totalChannels: number;
    activeChannels: number;
    estimatedTransfers: number;
  };
  lastUpdated: number;
}

interface IBCResponse {
  data: IBCStatusData;
}

interface OverviewStats {
  totalBridges: number;
  activeBridges: number;
  totalTransfers: number;
  totalSources: number;
}

const CHAIN_DISPLAY_NAMES: Record<string, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  arbitrum: 'Arbitrum',
  optimism: 'Optimism',
  avalanche: 'Avalanche',
  bsc: 'BSC',
  fantom: 'Fantom',
  cosmos: 'Cosmos Hub',
  osmosis: 'Osmosis',
  juno: 'Juno',
};

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
  const [ibcData, setIbcData] = useState<IBCStatusData | null>(null);
  const [ibcLoading, setIbcLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedCosmosChain, setSelectedCosmosChain] = useState('cosmoshub-4');
  const [selectedBridge, setSelectedBridge] = useState<Bridge | null>(null);
  const [oracleScripts, setOracleScripts] = useState<OracleScript[] | null>(null);
  const [validatorSummary, setValidatorSummary] = useState<ValidatorHealthSummary | null>(null);

  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(0);

  const fetchIBCData = useCallback(async () => {
    try {
      setIbcLoading(true);
      const response = await fetchApiData<IBCResponse>('/api/oracle/band/ibc');
      setIbcData(response.data);
    } catch (err) {
      console.error('Failed to fetch IBC data:', err);
    } finally {
      setIbcLoading(false);
    }
  }, []);

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

      const mockOracleScripts: OracleScript[] = [
        {
          scriptId: 'price_feed',
          name: 'Price Feed',
          description: '获取加密货币价格数据',
          owner: 'band1abc123def456',
          codeHash: '0x1234abcd5678efgh',
          schema: '{symbol:string,price:uint64}',
          status: 'active',
          totalRequests: 125000,
          lastRequestAt: new Date(Date.now() - 300000).toISOString(),
          avgResponseTimeMs: 450,
          successRate: 99.2,
        },
        {
          scriptId: 'weather_data',
          name: 'Weather Data',
          description: '获取全球天气数据',
          owner: 'band1def456ghi789',
          codeHash: '0x5678efgh90abijkl',
          schema: '{location:string,temp:uint64}',
          status: 'active',
          totalRequests: 34500,
          lastRequestAt: new Date(Date.now() - 600000).toISOString(),
          avgResponseTimeMs: 820,
          successRate: 97.8,
        },
        {
          scriptId: 'sports_results',
          name: 'Sports Results',
          description: '获取体育比赛结果',
          owner: 'band1ghi789jkl012',
          codeHash: '0x90abijklcdefmnop',
          schema: '{gameId:string,score:string}',
          status: 'inactive',
          totalRequests: 12300,
          lastRequestAt: new Date(Date.now() - 86400000).toISOString(),
          avgResponseTimeMs: 580,
          successRate: 96.5,
        },
        {
          scriptId: 'stock_prices',
          name: 'Stock Prices',
          description: '获取股票价格数据',
          owner: 'band1jkl012mno345',
          codeHash: '0xcdefmnopqrstuvwx',
          schema: '{ticker:string,price:uint64}',
          status: 'deprecated',
          totalRequests: 89200,
          lastRequestAt: new Date(Date.now() - 259200000).toISOString(),
          avgResponseTimeMs: 380,
          successRate: 99.5,
        },
      ];
      setOracleScripts(mockOracleScripts);

      const mockValidatorSummary: ValidatorHealthSummary = {
        totalValidators: 100,
        activeValidators: 95,
        jailedValidators: 3,
        networkParticipationRate: 98.5,
        avgUptimePercent: 99.1,
        totalVotingPower: 1000000000,
      };
      setValidatorSummary(mockValidatorSummary);

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

  useEffect(() => {
    fetchIBCData();
  }, [fetchIBCData]);

  useEffect(() => {
    if (!autoRefreshEnabled) {
      setTimeUntilRefresh(0);
      return;
    }

    setTimeUntilRefresh(refreshInterval);
    const interval = setInterval(() => {
      setTimeUntilRefresh((prev) => {
        if (prev <= 1) {
          fetchData();
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, refreshInterval, fetchData]);

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

  const getProtocolHealth = (): 'healthy' | 'warning' | 'critical' => {
    if (!bridgesData || bridgesData.summary.total === 0) return 'critical';
    const activeRatio = bridgesData.summary.active / bridgesData.summary.total;
    if (activeRatio >= 0.8) return 'healthy';
    if (activeRatio >= 0.5) return 'warning';
    return 'critical';
  };

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6">
      <Breadcrumb items={breadcrumbItems} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl lg:text-3xl">
            <Globe className="h-6 w-6 text-orange-600" />
            <span>Band Protocol</span>
            <ProtocolHealthBadge status={getProtocolHealth()} />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">跨链预言机 - Cosmos 生态与数据桥监控</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={loading}>
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
          <BandExportButton
            data={
              bridgesData || sourcesData || oracleScripts || validatorSummary
                ? {
                    overviewStats,
                    bridgesData,
                    sourcesData,
                    oracleScripts,
                    validatorSummary,
                    generatedAt: lastUpdated?.toISOString() || new Date().toISOString(),
                  }
                : null
            }
            disabled={loading}
          />
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

      {loading && !overviewStats ? (
        <div className="h-16 animate-pulse rounded-xl bg-muted" />
      ) : overviewStats ? (
        <StatsBar
          items={[
            {
              label: '活跃数据桥',
              value: overviewStats.activeBridges,
              trend: 'up' as const,
              status: 'healthy' as const,
            },
            {
              label: '总传输量',
              value: overviewStats.totalTransfers.toLocaleString(),
              trend: 'up' as const,
            },
            { label: '数据源数量', value: overviewStats.totalSources, trend: 'neutral' as const },
          ]}
        />
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">
            <LayoutDashboard className="mr-1.5 h-4 w-4" />
            概览
          </TabsTrigger>
          <TabsTrigger value="bridges">
            <GitBranch className="mr-1.5 h-4 w-4" />
            数据桥
          </TabsTrigger>
          <TabsTrigger value="sources">
            <Database className="mr-1.5 h-4 w-4" />
            数据源
          </TabsTrigger>
          <TabsTrigger value="oracle-scripts">
            <FileCode className="mr-1.5 h-4 w-4" />
            Oracle Scripts
          </TabsTrigger>
          <TabsTrigger value="transfers">
            <Activity className="mr-1.5 h-4 w-4" />
            传输历史
          </TabsTrigger>
          <TabsTrigger value="cosmos">
            <Globe className="mr-1.5 h-4 w-4" />
            Cosmos
          </TabsTrigger>
          <TabsTrigger value="price-trend">
            <TrendingUp className="mr-1.5 h-4 w-4" />
            价格趋势
          </TabsTrigger>
          <TabsTrigger value="quality">
            <BarChart3 className="mr-1.5 h-4 w-4" />
            数据质量
          </TabsTrigger>
          <TabsTrigger value="comparison">
            <ArrowLeftRight className="mr-1.5 h-4 w-4" />
            价格对比
          </TabsTrigger>
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

            <div className="grid gap-4 lg:grid-cols-2">
              <AggregationValidationCard symbol="ETH/USD" chain="ethereum" />
              <DataFreshnessCard symbol="ETH/USD" chain="ethereum" />
            </div>

            <ValidatorHealthCard />

            <div className="grid gap-4 lg:grid-cols-2">
              <BandPriceChart symbol="ATOM/USD" chain="cosmos" timeRange="24h" />
              <BandPriceChart symbol="ETH/USD" chain="ethereum" timeRange="24h" />
            </div>

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
                      <span className="font-semibold">{sourcesData?.summary.evmCount ?? 0}</span>
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
                      <span className="font-semibold">{sourcesData?.summary.cosmosCount ?? 0}</span>
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
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>数据桥列表</CardTitle>
                <CardDescription>
                  显示 {bridgesData?.bridges.length ?? 0} 个数据桥
                  {selectedBridge && (
                    <span className="ml-2 text-xs text-muted-foreground">(点击数据桥查看趋势)</span>
                  )}
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
                      <BridgeStatusCard
                        key={bridge.bridgeId}
                        bridge={bridge}
                        onClick={(b) => setSelectedBridge(b)}
                        className={cn(
                          selectedBridge?.bridgeId === bridge.bridgeId && 'border-primary',
                        )}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedBridge && (
              <BridgeTrendChart
                bridgeId={selectedBridge.bridgeId}
                bridgeName={`${CHAIN_DISPLAY_NAMES[selectedBridge.sourceChain] ?? selectedBridge.sourceChain} → ${CHAIN_DISPLAY_NAMES[selectedBridge.destinationChain] ?? selectedBridge.destinationChain}`}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="sources">
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <BandPriceChart symbol="ETH/USD" chain="ethereum" timeRange="24h" />
              <BandPriceChart symbol="BTC/USD" chain="ethereum" timeRange="24h" />
            </div>
            <DataSourceList
              sources={sourcesData?.sources}
              loading={loading}
              chain={undefined}
              symbol={undefined}
            />
          </div>
        </TabsContent>

        <TabsContent value="oracle-scripts">
          <OracleScriptList scripts={oracleScripts ?? undefined} loading={loading} />
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
                  showIBCStatus={true}
                  filterType="mainnet"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Band Chain 区块信息</CardTitle>
                <CardDescription>最新区块状态</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-lg bg-muted/30 p-4">
                    <span className="text-sm text-muted-foreground">区块高度</span>
                    <div className="mt-1 font-mono text-lg">
                      {Math.floor(Math.random() * 10000000).toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-4">
                    <span className="text-sm text-muted-foreground">区块哈希</span>
                    <div className="mt-1 truncate font-mono text-sm">
                      0x
                      {Array.from({ length: 64 }, () =>
                        Math.floor(Math.random() * 16).toString(16),
                      ).join('')}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-4">
                    <span className="text-sm text-muted-foreground">时间戳</span>
                    <div className="mt-1 text-sm">{new Date().toLocaleString()}</div>
                  </div>
                </div>
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
                    {ibcLoading ? (
                      <Skeleton className="mt-1 h-7 w-16" />
                    ) : (
                      <div className="mt-1 text-lg font-semibold">
                        {ibcData?.connections.total ?? 0}
                      </div>
                    )}
                  </div>
                  <div className="rounded-lg bg-muted/30 p-4">
                    <span className="text-sm text-muted-foreground">活跃通道</span>
                    {ibcLoading ? (
                      <Skeleton className="mt-1 h-7 w-16" />
                    ) : (
                      <div className="mt-1 text-lg font-semibold">
                        {ibcData?.channels.open ?? 0}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="price-trend">
          <PriceTrendTab />
        </TabsContent>

        <TabsContent value="quality">
          <QualityAnalysisTab />
        </TabsContent>

        <TabsContent value="comparison">
          <PriceComparisonTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
