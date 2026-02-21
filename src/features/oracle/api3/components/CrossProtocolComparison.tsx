'use client';

import { useState, useEffect } from 'react';

import {
  GitCompare,
  RefreshCw,
  Clock,
  Zap,
  Activity,
  Database,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { useI18n } from '@/i18n';
import { fetchApiData, cn } from '@/shared/utils';

interface ComparisonLatencyData {
  avgResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  samples: number;
}

interface ComparisonAvailabilityData {
  uptime: number;
  airnodeCount: number;
  onlineAirnodes: number;
  offlineAirnodes: number;
  avgHeartbeatAge: number;
  last24hDowntime: number;
}

interface ComparisonGasData {
  avgGasPerUpdate: number;
  avgGasCostUsd: number;
  avgGasCostEth: number;
  updateFrequency: number;
  dailyGasCostUsd: number;
}

interface ComparisonQualityData {
  deviationRate: number;
  deviationThreshold: number;
  updateFrequency: number;
  dataFreshness: number;
  signatureVerification: boolean;
  updateCount24h: number;
}

interface HistoricalDataPoint {
  timestamp: string;
  api3: number;
  chainlink: number;
}

interface ComparisonData {
  latency: {
    api3: ComparisonLatencyData;
    chainlink: {
      avgResponseTime: number;
      ocrLatency: number;
      p50Latency: number;
      p95Latency: number;
      p99Latency: number;
      samples: number;
    };
    comparison: {
      fasterProtocol: 'api3' | 'chainlink';
      differencePercent: number;
    };
  };
  availability: {
    api3: ComparisonAvailabilityData;
    chainlink: ComparisonAvailabilityData & {
      nodeCount: number;
      onlineNodes: number;
      offlineNodes: number;
    };
    comparison: {
      higherUptime: 'api3' | 'chainlink';
      differencePercent: number;
    };
  };
  gasCost: {
    api3: ComparisonGasData;
    chainlink: ComparisonGasData & {
      ocrGasOverhead: number;
    };
    comparison: {
      cheaperProtocol: 'api3' | 'chainlink';
      savingsPercent: number;
    };
  };
  dataQuality: {
    api3: ComparisonQualityData;
    chainlink: ComparisonQualityData & {
      deviationCheckCount: number;
      fallbackTriggeredCount: number;
    };
    comparison: {
      betterQuality: 'api3' | 'chainlink';
      freshnessDiff: number;
    };
  };
  historicalData: {
    latencyHistory: HistoricalDataPoint[];
    uptimeHistory: HistoricalDataPoint[];
    gasHistory: HistoricalDataPoint[];
  };
  lastUpdated: string;
  isMock: boolean;
}

type ComparisonTab = 'latency' | 'availability' | 'gas' | 'quality';

const protocolColors = {
  api3: '#3b82f6',
  chainlink: '#a855f7',
};

export function CrossProtocolComparison({ className }: { className?: string }) {
  useI18n();
  const [data, setData] = useState<ComparisonData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ComparisonTab>('latency');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const result = await fetchApiData<ComparisonData>('/api/comparison/api3-chainlink');
      setData(result);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    fetchData();
  };

  const formatLatency = (ms: number) => `${ms.toFixed(1)}ms`;
  const formatPercent = (value: number) => `${value.toFixed(2)}%`;
  const formatGas = (gas: number) => gas.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const formatUSD = (usd: number) => `$${usd.toFixed(4)}`;

  const tabs: { key: ComparisonTab; label: string; icon: React.ReactNode }[] = [
    { key: 'latency', label: '延迟', icon: <Clock className="h-4 w-4" /> },
    { key: 'availability', label: '可用性', icon: <Activity className="h-4 w-4" /> },
    { key: 'gas', label: 'Gas 成本', icon: <Zap className="h-4 w-4" /> },
    { key: 'quality', label: '数据质量', icon: <Database className="h-4 w-4" /> },
  ];

  const renderLatencyComparison = () => {
    if (!data) return null;

    const { latency } = data;
    const comparison = latency.comparison;
    const isApi3Faster = comparison.fasterProtocol === 'api3';

    const latencyBarData = [
      { name: 'API3', value: latency.api3.avgResponseTime, color: protocolColors.api3 },
      {
        name: 'Chainlink',
        value: latency.chainlink.avgResponseTime,
        color: protocolColors.chainlink,
      },
    ];

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">平均响应时间</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: protocolColors.api3 }}
                    />
                    <span className="text-sm">API3</span>
                    <span className="font-mono font-medium">
                      {formatLatency(latency.api3.avgResponseTime)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: protocolColors.chainlink }}
                    />
                    <span className="text-sm">Chainlink</span>
                    <span className="font-mono font-medium">
                      {formatLatency(latency.chainlink.avgResponseTime)}
                    </span>
                  </div>
                </div>
                <div
                  className={cn(
                    'flex items-center gap-1 rounded-lg px-3 py-2',
                    isApi3Faster
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                  )}
                >
                  {isApi3Faster ? (
                    <TrendingDown className="h-4 w-4" />
                  ) : (
                    <TrendingUp className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">
                    API3 {isApi3Faster ? '快' : '慢'} {comparison.differencePercent.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="mt-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={latencyBarData} layout="vertical">
                    <XAxis type="number" tickFormatter={formatLatency} />
                    <YAxis type="category" dataKey="name" width={80} />
                    <Tooltip formatter={(value) => formatLatency(Number(value))} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {latencyBarData.map((entry, index) => (
                        <rect key={`bar-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">响应时间分布</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">P50 延迟</span>
                  <div className="flex gap-4">
                    <span className="font-mono" style={{ color: protocolColors.api3 }}>
                      {formatLatency(latency.api3.p50ResponseTime)}
                    </span>
                    <span className="font-mono" style={{ color: protocolColors.chainlink }}>
                      {formatLatency(latency.chainlink.p50Latency)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">P95 延迟</span>
                  <div className="flex gap-4">
                    <span className="font-mono" style={{ color: protocolColors.api3 }}>
                      {formatLatency(latency.api3.p95ResponseTime)}
                    </span>
                    <span className="font-mono" style={{ color: protocolColors.chainlink }}>
                      {formatLatency(latency.chainlink.p95Latency)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">P99 延迟</span>
                  <div className="flex gap-4">
                    <span className="font-mono" style={{ color: protocolColors.api3 }}>
                      {formatLatency(latency.api3.p99ResponseTime)}
                    </span>
                    <span className="font-mono" style={{ color: protocolColors.chainlink }}>
                      {formatLatency(latency.chainlink.p99Latency)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">OCR 延迟</span>
                  <div className="flex gap-4">
                    <span className="font-mono text-muted-foreground">-</span>
                    <span className="font-mono" style={{ color: protocolColors.chainlink }}>
                      {formatLatency(latency.chainlink.ocrLatency)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">样本数</span>
                  <div className="flex gap-4">
                    <span className="font-mono" style={{ color: protocolColors.api3 }}>
                      {latency.api3.samples.toLocaleString()}
                    </span>
                    <span className="font-mono" style={{ color: protocolColors.chainlink }}>
                      {latency.chainlink.samples.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">延迟趋势 (48h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={data.historicalData.latencyHistory}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="timestamp"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) =>
                      new Date(value).toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    }
                  />
                  <YAxis tickFormatter={formatLatency} />
                  <Tooltip formatter={(value) => formatLatency(Number(value))} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="api3"
                    name="API3"
                    stroke={protocolColors.api3}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="chainlink"
                    name="Chainlink"
                    stroke={protocolColors.chainlink}
                    strokeWidth={2}
                    dot={false}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderAvailabilityComparison = () => {
    if (!data) return null;

    const { availability } = data;
    const comparison = availability.comparison;
    const isApi3Higher = comparison.higherUptime === 'api3';

    const uptimeBarData = [
      { name: 'API3', value: availability.api3.uptime, color: protocolColors.api3 },
      { name: 'Chainlink', value: availability.chainlink.uptime, color: protocolColors.chainlink },
    ];

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">在线率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: protocolColors.api3 }}
                    />
                    <span className="text-sm">API3</span>
                    <span className="font-mono font-medium">
                      {formatPercent(availability.api3.uptime)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: protocolColors.chainlink }}
                    />
                    <span className="text-sm">Chainlink</span>
                    <span className="font-mono font-medium">
                      {formatPercent(availability.chainlink.uptime)}
                    </span>
                  </div>
                </div>
                <div
                  className={cn(
                    'flex items-center gap-1 rounded-lg px-3 py-2',
                    isApi3Higher
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                  )}
                >
                  {isApi3Higher ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingUp className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">
                    API3 {isApi3Higher ? '高' : '低'} {comparison.differencePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
              <div className="mt-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={uptimeBarData} layout="vertical">
                    <XAxis type="number" domain={[99, 100]} tickFormatter={formatPercent} />
                    <YAxis type="category" dataKey="name" width={80} />
                    <Tooltip formatter={(value) => formatPercent(Number(value))} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {uptimeBarData.map((entry, index) => (
                        <rect key={`bar-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">节点状态</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">API3 Airnodes</span>
                    <span className="font-mono">
                      {availability.api3.onlineAirnodes} / {availability.api3.airnodeCount} 在线
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{
                        width: `${(availability.api3.onlineAirnodes / availability.api3.airnodeCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Chainlink Nodes</span>
                    <span className="font-mono">
                      {availability.chainlink.onlineNodes} / {availability.chainlink.nodeCount} 在线
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-purple-500"
                      style={{
                        width: `${(availability.chainlink.onlineNodes / availability.chainlink.nodeCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="rounded-lg bg-muted p-3">
                    <div className="text-xs text-muted-foreground">平均心跳年龄</div>
                    <div className="font-mono text-lg" style={{ color: protocolColors.api3 }}>
                      {availability.api3.avgHeartbeatAge.toFixed(1)}s
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <div className="text-xs text-muted-foreground">24h 离线时间</div>
                    <div className="font-mono text-lg" style={{ color: protocolColors.api3 }}>
                      {availability.api3.last24hDowntime.toFixed(2)}m
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">在线率趋势 (48h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={data.historicalData.uptimeHistory}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="timestamp"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) =>
                      new Date(value).toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    }
                  />
                  <YAxis domain={[99, 100]} tickFormatter={formatPercent} />
                  <Tooltip formatter={(value) => formatPercent(Number(value))} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="api3"
                    name="API3"
                    stroke={protocolColors.api3}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="chainlink"
                    name="Chainlink"
                    stroke={protocolColors.chainlink}
                    strokeWidth={2}
                    dot={false}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderGasComparison = () => {
    if (!data) return null;

    const { gasCost } = data;
    const comparison = gasCost.comparison;
    const isApi3Cheaper = comparison.cheaperProtocol === 'api3';

    const gasBarData = [
      { name: 'API3', value: gasCost.api3.avgGasPerUpdate, color: protocolColors.api3 },
      {
        name: 'Chainlink',
        value: gasCost.chainlink.avgGasPerUpdate,
        color: protocolColors.chainlink,
      },
    ];

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Gas 消耗</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: protocolColors.api3 }}
                    />
                    <span className="text-sm">API3</span>
                    <span className="font-mono font-medium">
                      {formatGas(gasCost.api3.avgGasPerUpdate)} gas
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: protocolColors.chainlink }}
                    />
                    <span className="text-sm">Chainlink</span>
                    <span className="font-mono font-medium">
                      {formatGas(gasCost.chainlink.avgGasPerUpdate)} gas
                    </span>
                  </div>
                </div>
                <div
                  className={cn(
                    'flex items-center gap-1 rounded-lg px-3 py-2',
                    isApi3Cheaper
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                  )}
                >
                  {isApi3Cheaper ? (
                    <TrendingDown className="h-4 w-4" />
                  ) : (
                    <TrendingUp className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">
                    API3 节省 {comparison.savingsPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="mt-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gasBarData} layout="vertical">
                    <XAxis type="number" tickFormatter={(v) => v.toLocaleString()} />
                    <YAxis type="category" dataKey="name" width={80} />
                    <Tooltip formatter={(value) => `${Number(value).toLocaleString()} gas`} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {gasBarData.map((entry, index) => (
                        <rect key={`bar-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Gas 成本</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">单次更新 Gas 成本 (USD)</span>
                  <div className="flex gap-4">
                    <span className="font-mono" style={{ color: protocolColors.api3 }}>
                      {formatUSD(gasCost.api3.avgGasCostUsd)}
                    </span>
                    <span className="font-mono" style={{ color: protocolColors.chainlink }}>
                      {formatUSD(gasCost.chainlink.avgGasCostUsd)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">单次更新 Gas 成本 (ETH)</span>
                  <div className="flex gap-4">
                    <span className="font-mono" style={{ color: protocolColors.api3 }}>
                      {gasCost.api3.avgGasCostEth.toFixed(6)} ETH
                    </span>
                    <span className="font-mono" style={{ color: protocolColors.chainlink }}>
                      {gasCost.chainlink.avgGasCostEth.toFixed(6)} ETH
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">OCR Gas 开销</span>
                  <div className="flex gap-4">
                    <span className="font-mono text-muted-foreground">-</span>
                    <span className="font-mono" style={{ color: protocolColors.chainlink }}>
                      {formatGas(gasCost.chainlink.ocrGasOverhead)} gas
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">更新频率</span>
                  <div className="flex gap-4">
                    <span className="font-mono" style={{ color: protocolColors.api3 }}>
                      ~{Math.round(gasCost.api3.updateFrequency)}s
                    </span>
                    <span className="font-mono text-muted-foreground">-</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">每日 Gas 成本 (USD)</span>
                  <div className="flex gap-4">
                    <span className="font-mono" style={{ color: protocolColors.api3 }}>
                      {formatUSD(gasCost.api3.dailyGasCostUsd)}
                    </span>
                    <span className="font-mono" style={{ color: protocolColors.chainlink }}>
                      {formatUSD(gasCost.chainlink.dailyGasCostUsd)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gas 消耗趋势 (48h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={data.historicalData.gasHistory}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="timestamp"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) =>
                      new Date(value).toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    }
                  />
                  <YAxis tickFormatter={(v) => v.toLocaleString()} />
                  <Tooltip formatter={(value) => `${Number(value).toLocaleString()} gas`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="api3"
                    name="API3"
                    stroke={protocolColors.api3}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="chainlink"
                    name="Chainlink"
                    stroke={protocolColors.chainlink}
                    strokeWidth={2}
                    dot={false}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderQualityComparison = () => {
    if (!data) return null;

    const { dataQuality } = data;
    const comparison = dataQuality.comparison;
    const isApi3Better = comparison.betterQuality === 'api3';

    const deviationBarData = [
      { name: 'API3', value: dataQuality.api3.deviationRate, color: protocolColors.api3 },
      {
        name: 'Chainlink',
        value: dataQuality.chainlink.deviationRate,
        color: protocolColors.chainlink,
      },
    ];

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">偏差率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: protocolColors.api3 }}
                    />
                    <span className="text-sm">API3</span>
                    <span className="font-mono font-medium">
                      {dataQuality.api3.deviationRate.toFixed(3)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: protocolColors.chainlink }}
                    />
                    <span className="text-sm">Chainlink</span>
                    <span className="font-mono font-medium">
                      {dataQuality.chainlink.deviationRate.toFixed(3)}%
                    </span>
                  </div>
                </div>
                <div
                  className={cn(
                    'flex items-center gap-1 rounded-lg px-3 py-2',
                    isApi3Better
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                  )}
                >
                  {isApi3Better ? (
                    <TrendingDown className="h-4 w-4" />
                  ) : (
                    <TrendingUp className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">
                    API3 偏差 {isApi3Better ? '更低' : '更高'}
                  </span>
                </div>
              </div>
              <div className="mt-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deviationBarData} layout="vertical">
                    <XAxis type="number" tickFormatter={(v) => `${v.toFixed(2)}%`} />
                    <YAxis type="category" dataKey="name" width={80} />
                    <Tooltip formatter={(value) => `${Number(value).toFixed(3)}%`} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {deviationBarData.map((entry, index) => (
                        <rect key={`bar-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">数据质量指标</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">偏差阈值</span>
                  <div className="flex gap-4">
                    <span className="font-mono" style={{ color: protocolColors.api3 }}>
                      {dataQuality.api3.deviationThreshold}%
                    </span>
                    <span className="font-mono" style={{ color: protocolColors.chainlink }}>
                      {dataQuality.chainlink.deviationThreshold}%
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">更新频率</span>
                  <div className="flex gap-4">
                    <span className="font-mono" style={{ color: protocolColors.api3 }}>
                      {dataQuality.api3.updateFrequency.toFixed(1)}%
                    </span>
                    <span className="font-mono" style={{ color: protocolColors.chainlink }}>
                      {dataQuality.chainlink.updateFrequency.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">数据新鲜度</span>
                  <div className="flex gap-4">
                    <span className="font-mono" style={{ color: protocolColors.api3 }}>
                      {dataQuality.api3.dataFreshness.toFixed(1)}s
                    </span>
                    <span className="font-mono" style={{ color: protocolColors.chainlink }}>
                      -
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">签名验证</span>
                  <div className="flex gap-4">
                    <Badge variant="outline" className="border-green-500 text-green-600">
                      {dataQuality.api3.signatureVerification ? '启用' : '禁用'}
                    </Badge>
                    <span className="font-mono text-muted-foreground">-</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">24h 更新次数</span>
                  <div className="flex gap-4">
                    <span className="font-mono" style={{ color: protocolColors.api3 }}>
                      {dataQuality.api3.updateCount24h.toLocaleString()}
                    </span>
                    <span className="font-mono" style={{ color: protocolColors.chainlink }}>
                      -
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">偏差检查次数</span>
                  <div className="flex gap-4">
                    <span className="font-mono text-muted-foreground">-</span>
                    <span className="font-mono" style={{ color: protocolColors.chainlink }}>
                      {dataQuality.chainlink.deviationCheckCount.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fallback 触发次数</span>
                  <div className="flex gap-4">
                    <span className="font-mono text-muted-foreground">-</span>
                    <span className="font-mono" style={{ color: protocolColors.chainlink }}>
                      {dataQuality.chainlink.fallbackTriggeredCount}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  if (isLoading && !data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-primary" />
            API3 vs Chainlink 跨协议对比
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5 text-primary" />
              API3 vs Chainlink 跨协议对比
            </CardTitle>
            <CardDescription className="mt-1">
              从延迟、可用性、Gas 成本和数据质量等维度对比两大预言机协议
            </CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5"
            >
              {tab.icon}
              {tab.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {activeTab === 'latency' && renderLatencyComparison()}
        {activeTab === 'availability' && renderAvailabilityComparison()}
        {activeTab === 'gas' && renderGasComparison()}
        {activeTab === 'quality' && renderQualityComparison()}
      </CardContent>
    </Card>
  );
}
