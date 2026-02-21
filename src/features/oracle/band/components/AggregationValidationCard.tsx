'use client';

import { useState, useEffect, useCallback } from 'react';

import {
  BarChart3,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Layers,
} from 'lucide-react';

import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/shared/utils';

export interface AggregationResult {
  symbol: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  priceCount: number;
  deviation: number;
  isValid: boolean;
}

interface AggregationValidationCardProps {
  symbol?: string;
  chain?: string;
  className?: string;
}

const getDeviationColor = (deviation: number): string => {
  if (deviation < 0.02) return 'text-emerald-500';
  if (deviation < 0.05) return 'text-amber-500';
  return 'text-red-500';
};

const getDeviationBarColor = (deviation: number): string => {
  if (deviation < 0.02) return 'bg-emerald-500';
  if (deviation < 0.05) return 'bg-amber-500';
  return 'bg-red-500';
};

const formatPrice = (price: number): string => {
  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }
  if (price >= 1) {
    return `$${price.toFixed(4)}`;
  }
  return `$${price.toFixed(6)}`;
};

const formatDeviation = (deviation: number): string => {
  return `${(deviation * 100).toFixed(2)}%`;
};

export function AggregationValidationCard({
  symbol = 'ETH/USD',
  chain,
  className,
}: AggregationValidationCardProps) {
  const [data, setData] = useState<AggregationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('symbol', symbol);
      if (chain) params.append('chain', chain);

      const response = await fetch(`/api/oracle/band/aggregation?${params.toString()}`);
      if (!response.ok) {
        throw new Error('获取聚合数据失败');
      }
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [symbol, chain]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            价格聚合验证
          </CardTitle>
          <CardDescription>多数据源价格聚合结果分析</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            价格聚合验证
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
            <div>
              <p className="font-medium text-foreground">加载失败</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              重试
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            价格聚合验证
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">暂无聚合数据</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const deviationPercentage = Math.min(data.deviation * 100, 100);
  const priceRange = data.maxPrice - data.minPrice;
  const avgPosition = data.avgPrice > 0 ? ((data.avgPrice - data.minPrice) / priceRange) * 100 : 50;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              价格聚合验证
            </CardTitle>
            <CardDescription>多数据源价格聚合结果分析 - {data.symbol}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge
              status={data.isValid ? 'active' : 'warning'}
              text={data.isValid ? '验证通过' : '偏差过大'}
              size="sm"
              pulse={data.isValid}
            />
            <Button variant="ghost" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-muted/30 p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              平均价格
            </div>
            <p className="mt-1 text-lg font-semibold">{formatPrice(data.avgPrice)}</p>
          </div>

          <div className="rounded-lg bg-muted/30 p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <BarChart3 className="h-3 w-3" />
              最低价格
            </div>
            <p className="mt-1 text-lg font-semibold text-red-500">{formatPrice(data.minPrice)}</p>
          </div>

          <div className="rounded-lg bg-muted/30 p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <BarChart3 className="h-3 w-3" />
              最高价格
            </div>
            <p className="mt-1 text-lg font-semibold text-emerald-500">
              {formatPrice(data.maxPrice)}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">价格偏差分析</span>
            <span className={cn('text-sm font-semibold', getDeviationColor(data.deviation))}>
              {formatDeviation(data.deviation)}
            </span>
          </div>

          <div className="relative h-6 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full transition-all duration-500',
                getDeviationBarColor(data.deviation),
              )}
              style={{ width: `${deviationPercentage}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-medium text-white drop-shadow-sm">
                {deviationPercentage.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>2.5%</span>
            <span>5%+</span>
          </div>
        </div>

        <div className="space-y-3">
          <span className="text-sm font-medium">价格范围可视化</span>
          <div className="relative h-4 w-full rounded-full bg-gradient-to-r from-red-200 via-amber-200 to-emerald-200 dark:from-red-900/30 dark:via-amber-900/30 dark:to-emerald-900/30">
            <div
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-gray-900"
              style={{ left: `${Math.max(0, Math.min(100, avgPosition))}%` }}
              title={`平均价格: ${formatPrice(data.avgPrice)}`}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-red-500">{formatPrice(data.minPrice)}</span>
            <span className="text-muted-foreground">价格区间</span>
            <span className="text-emerald-500">{formatPrice(data.maxPrice)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">数据源贡献</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" size="sm">
              {data.priceCount} 个数据源
            </Badge>
            {data.isValid ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
          </div>
        </div>

        {!data.isValid && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>价格偏差超过5%阈值，建议检查数据源状态</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
