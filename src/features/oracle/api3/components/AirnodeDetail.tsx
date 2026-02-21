'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

import Link from 'next/link';

import {
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  Clock,
  Server,
  Activity,
  CheckCircle,
  XCircle,
  ExternalLink,
  Copy,
  TrendingUp,
  Info,
  Zap,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatTime, cn, copyToClipboard } from '@/shared/utils';
import { fetchApiData } from '@/shared/utils/api';

interface DapiInfo {
  symbol: string;
  feedId: string;
  chain: string;
  contractAddress: string;
  dataFeedAddress: string | null;
  decimals: number;
  status: 'active' | 'inactive' | 'unknown';
  lastValue: string;
  lastUpdate: string;
}

interface UpdateRecord {
  id: string;
  timestamp: string;
  blockNumber: number;
  transactionHash: string;
  gasUsed: string;
  dapiName: string;
  oldValue: string;
  newValue: string;
}

interface AirnodeDetailData {
  airnode: {
    address: string;
    xpub: string;
    ipfsEndpoint: string;
    oevEndpoint: string;
    chain: string;
    online: boolean;
    lastHeartbeat: string | null;
    responseTime: number;
    uptime: number;
  };
  dapis: DapiInfo[];
  updateHistory: UpdateRecord[];
  responseTimeHistory: Array<{
    timestamp: string;
    responseTime: number;
  }>;
  metadata: {
    totalDapis: number;
    activeDapis: number;
    totalUpdates: number;
    fetchedAt: string;
  };
}

interface AirnodeDetailProps {
  address: string;
}

interface ResponseTimeChartData {
  time: string;
  timestamp: string;
  responseTime: number;
}

export function AirnodeDetail({ address }: AirnodeDetailProps) {
  const { t } = useI18n();
  const [airnodeData, setAirnodeData] = useState<AirnodeDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchAirnodeDetail = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchApiData<AirnodeDetailData>(`/api/oracle/api3/airnode/${address}`);
      setAirnodeData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch airnode details');
      setAirnodeData(null);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchAirnodeDetail();
  }, [fetchAirnodeDetail]);

  const chartData = useMemo((): ResponseTimeChartData[] => {
    if (!airnodeData?.responseTimeHistory) return [];
    return airnodeData.responseTimeHistory.map((record) => ({
      time: new Date(record.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      timestamp: record.timestamp,
      responseTime: record.responseTime,
    }));
  }, [airnodeData]);

  const handleCopyAddress = async () => {
    if (airnodeData?.airnode.address) {
      await copyToClipboard(airnodeData.airnode.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatResponseTime = (ms: number): string => {
    if (ms < 100) return `${ms}ms (优秀)`;
    if (ms < 300) return `${ms}ms (良好)`;
    return `${ms}ms (较慢)`;
  };

  const getResponseTimeColor = (ms: number) => {
    if (ms < 100) return 'text-green-500';
    if (ms < 300) return 'text-yellow-500';
    return 'text-red-500';
  };

  const breadcrumbItems = [
    { label: t('nav.oracle'), href: '/oracle' },
    { label: 'API3', href: '/oracle/api3' },
    { label: airnodeData?.airnode.address.slice(0, 8) ?? address.slice(0, 8) },
  ];

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ value: number; payload: { timestamp: string } }>;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-white p-3 shadow-lg dark:bg-slate-800">
          <p className="mb-1 text-xs text-muted-foreground">
            {new Date(payload[0]!.payload.timestamp).toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-sm font-semibold">{payload[0]!.value}ms</span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 p-4 sm:p-6">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !airnodeData) {
    return (
      <div className="container-6 sm:p- space-y6 mx-auto p-4">
        <Breadcrumb items={breadcrumbItems.slice(0, 2)} />
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
            <AlertTriangle className="h-12 w-12 text-amber-500" />
            <div className="text-center">
              <p className="font-medium text-foreground">{t('common.error')}</p>
              <p className="text-sm text-muted-foreground">{error || 'Airnode not found'}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchAirnodeDetail}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('common.retry')}
              </Button>
              <Link href="/oracle/api3">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  返回列表
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { airnode, dapis, updateHistory, metadata } = airnodeData;

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6">
      <Breadcrumb items={breadcrumbItems} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/oracle/api3">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
              <Server className="h-6 w-6 text-blue-600" />
              <span>Airnode</span>
              <Badge variant={airnode.online ? 'success' : 'destructive'} className="ml-2">
                {airnode.online ? '在线' : '离线'}
              </Badge>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">API3 Airnode on {airnode.chain}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAirnodeDetail}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              响应时间历史
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-primary">
                  <span className={cn(getResponseTimeColor(airnode.responseTime))}>
                    {formatResponseTime(airnode.responseTime)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    最后心跳 {airnode.lastHeartbeat ? formatTime(airnode.lastHeartbeat) : '-'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">在线率</p>
                <p className="text-lg font-bold text-green-600">{airnode.uptime.toFixed(2)}%</p>
              </div>
            </div>

            <div className="h-72">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <defs>
                      <linearGradient id="responseTimeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                      className="text-muted-foreground"
                    />
                    <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" unit="ms" />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="responseTime"
                      name="响应时间"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  暂无历史数据
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                状态信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">状态</span>
                <div className="flex items-center gap-2">
                  {airnode.online ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span
                    className={cn(
                      'font-medium',
                      airnode.online ? 'text-green-600' : 'text-red-600',
                    )}
                  >
                    {airnode.online ? '在线' : '离线'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">链</span>
                <Badge variant="secondary" className="capitalize">
                  {airnode.chain}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">响应时间</span>
                <span className={cn('font-medium', getResponseTimeColor(airnode.responseTime))}>
                  {airnode.responseTime}ms
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">在线率</span>
                <span className="font-medium text-green-600">{airnode.uptime.toFixed(2)}%</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">dAPIs 数量</span>
                <span className="font-medium">
                  {metadata.activeDapis} / {metadata.totalDapis}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Airnode 信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">合约地址</span>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
                    {airnode.address}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleCopyAddress}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  {copied && <span className="text-xs text-green-600">已复制</span>}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">xpub</span>
                <code className="block truncate rounded bg-muted px-2 py-1 text-xs">
                  {airnode.xpub}
                </code>
              </div>

              <div className="space-y-2 pt-2">
                <a
                  href={`https://etherscan.io/address/${airnode.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  在区块浏览器中查看
                </a>
                <a
                  href={airnode.ipfsEndpoint}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  <Zap className="h-3.5 w-3.5" />
                  IPFS 端点
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            关联的 dAPI 列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="pb-3 text-left text-sm font-medium text-muted-foreground">
                    交易对
                  </th>
                  <th className="pb-3 text-left text-sm font-medium text-muted-foreground">链</th>
                  <th className="pb-3 text-left text-sm font-medium text-muted-foreground">状态</th>
                  <th className="pb-3 text-right text-sm font-medium text-muted-foreground">
                    当前值
                  </th>
                  <th className="pb-3 text-right text-sm font-medium text-muted-foreground">
                    最后更新
                  </th>
                </tr>
              </thead>
              <tbody>
                {dapis.map((dapi, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <td className="py-3">
                      <span className="font-medium">{dapi.symbol}</span>
                    </td>
                    <td className="py-3">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {dapi.chain}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <Badge variant={dapi.status === 'active' ? 'success' : 'secondary'} size="sm">
                        {dapi.status === 'active'
                          ? '活跃'
                          : dapi.status === 'inactive'
                            ? '非活跃'
                            : '未知'}
                      </Badge>
                    </td>
                    <td className="py-3 text-right font-mono">{dapi.lastValue}</td>
                    <td className="py-3 text-right text-sm text-muted-foreground">
                      {formatTime(dapi.lastUpdate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            更新记录
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="pb-3 text-left text-sm font-medium text-muted-foreground">时间</th>
                  <th className="pb-3 text-left text-sm font-medium text-muted-foreground">dAPI</th>
                  <th className="pb-3 text-right text-sm font-medium text-muted-foreground">
                    旧值
                  </th>
                  <th className="pb-3 text-right text-sm font-medium text-muted-foreground">
                    新值
                  </th>
                  <th className="pb-3 text-right text-sm font-medium text-muted-foreground">Gas</th>
                  <th className="pb-3 text-left text-sm font-medium text-muted-foreground">
                    交易哈希
                  </th>
                </tr>
              </thead>
              <tbody>
                {updateHistory.slice(0, 10).map((record) => (
                  <tr key={record.id} className="border-b last:border-0">
                    <td className="py-3 text-sm text-muted-foreground">
                      {formatTime(record.timestamp)}
                    </td>
                    <td className="py-3">
                      <span className="font-medium">{record.dapiName}</span>
                    </td>
                    <td className="py-3 text-right font-mono text-sm">{record.oldValue}</td>
                    <td className="py-3 text-right font-mono text-sm">{record.newValue}</td>
                    <td className="py-3 text-right text-sm">{record.gasUsed}</td>
                    <td className="py-3">
                      <a
                        href={`https://etherscan.io/tx/${record.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {record.transactionHash.slice(0, 8)}...
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
