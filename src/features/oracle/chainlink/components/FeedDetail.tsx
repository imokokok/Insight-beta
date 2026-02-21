'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

import Link from 'next/link';

import {
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  Clock,
  Database,
  Activity,
  CheckCircle,
  XCircle,
  ExternalLink,
  Copy,
  TrendingUp,
  Info,
} from 'lucide-react';

import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { usePriceHistory } from '@/features/oracle/analytics/deviation/hooks/usePriceHistory';
import {
  PriceHistoryChart,
  type SingleAssetDataPoint,
} from '@/features/oracle/components/PriceHistoryChart';
import { useI18n } from '@/i18n';
import { formatTime, cn, copyToClipboard } from '@/shared/utils';
import { fetchApiData } from '@/shared/utils/api';

interface FeedDetailData {
  feed: {
    address: string;
    symbol: string;
    pair: string;
    baseAsset: string;
    quoteAsset: string;
    chain: string;
    decimals: number;
    price: number;
    priceRaw: string;
    timestamp: number;
    lastUpdate: string;
    isStale: boolean;
    stalenessSeconds: number;
  };
  health: {
    healthy: boolean;
    lastUpdate: string;
    stalenessSeconds: number;
    issues: string[];
  };
  metadata: {
    source: string;
    fetchedAt: string;
  };
}

interface FeedDetailProps {
  address: string;
}

export function FeedDetail({ address }: FeedDetailProps) {
  const { t } = useI18n();
  const [feedData, setFeedData] = useState<FeedDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchFeedDetail = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchApiData<FeedDetailData>(`/api/oracle/chainlink/feed/${address}`);
      setFeedData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch feed details');
      setFeedData(null);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchFeedDetail();
  }, [fetchFeedDetail]);

  const { data: priceHistory, isLoading: historyLoading } = usePriceHistory(
    'chainlink',
    feedData?.feed.symbol ?? '',
    { limit: 100 },
  );

  const chartData = useMemo((): SingleAssetDataPoint[] => {
    if (!priceHistory || priceHistory.length === 0) return [];
    return priceHistory.map((record) => ({
      timestamp: new Date(record.timestamp).getTime(),
      price: record.price,
    }));
  }, [priceHistory]);

  const handleCopyAddress = async () => {
    if (feedData?.feed.address) {
      await copyToClipboard(feedData.feed.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    if (price >= 1) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  const formatStaleness = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const breadcrumbItems = [
    { label: t('nav.oracle'), href: '/oracle' },
    { label: 'Chainlink', href: '/oracle/chainlink' },
    { label: feedData?.feed.pair ?? address.slice(0, 8) },
  ];

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

  if (error || !feedData) {
    return (
      <div className="container mx-auto space-y-6 p-4 sm:p-6">
        <Breadcrumb items={breadcrumbItems.slice(0, 2)} />
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
            <AlertTriangle className="h-12 w-12 text-amber-500" />
            <div className="text-center">
              <p className="font-medium text-foreground">{t('common.error')}</p>
              <p className="text-sm text-muted-foreground">{error || 'Feed not found'}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchFeedDetail}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('common.retry')}
              </Button>
              <Link href="/oracle/chainlink">
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

  const { feed, health } = feedData;

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6">
      <Breadcrumb items={breadcrumbItems} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/oracle/chainlink">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
              <Database className="h-6 w-6 text-blue-600" />
              <span>{feed.pair}</span>
              <Badge variant={health.healthy ? 'success' : 'destructive'} className="ml-2">
                {health.healthy ? '健康' : '异常'}
              </Badge>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Chainlink Price Feed on {feed.chain}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchFeedDetail}>
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
              当前价格
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="text-4xl font-bold text-primary">{formatPrice(feed.price)}</div>
              <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  更新于 {formatTime(feed.lastUpdate)}
                </span>
                {feed.isStale && (
                  <Badge variant="warning" size="sm">
                    延迟 {formatStaleness(feed.stalenessSeconds)}
                  </Badge>
                )}
              </div>
            </div>

            <div className="h-72">
              {historyLoading ? (
                <div className="flex h-full items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : chartData.length > 0 ? (
                <PriceHistoryChart
                  data={chartData}
                  symbol={feed.symbol}
                  title="历史价格"
                  height={280}
                />
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
                健康状态
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">状态</span>
                <div className="flex items-center gap-2">
                  {health.healthy ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span
                    className={cn(
                      'font-medium',
                      health.healthy ? 'text-green-600' : 'text-red-600',
                    )}
                  >
                    {health.healthy ? '正常' : '异常'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">数据延迟</span>
                <Badge variant={health.stalenessSeconds > 3600 ? 'warning' : 'secondary'}>
                  {formatStaleness(health.stalenessSeconds)}
                </Badge>
              </div>

              {health.issues.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">问题列表</p>
                  <div className="space-y-2">
                    {health.issues.map((issue, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 rounded-md bg-amber-50 p-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
                      >
                        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <span>{issue}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                喂价信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">交易对</span>
                <span className="font-medium">{feed.pair}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">基础资产</span>
                <Badge variant="outline">{feed.baseAsset}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">报价资产</span>
                <Badge variant="outline">{feed.quoteAsset}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">链</span>
                <Badge variant="secondary" className="capitalize">
                  {feed.chain}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">精度</span>
                <span className="font-mono text-sm">{feed.decimals} decimals</span>
              </div>

              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">合约地址</span>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
                    {feed.address}
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

              <div className="pt-2">
                <a
                  href={`https://etherscan.io/address/${feed.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  在区块浏览器中查看
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
