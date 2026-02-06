/**
 * PriceComparison Component
 *
 * 跨协议价格对比组件
 * 展示多个预言机协议的价格对比和偏差分析
 */

'use client';

import { useEffect, useCallback, useState, useRef } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { RefreshCw, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { logger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

interface PriceData {
  protocol: string;
  chain: string;
  price: number;
  timestamp: string;
  confidence?: number;
  isStale: boolean;
}

interface ComparisonStatistics {
  avgPrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  priceRange: number;
  priceRangePercent: number;
}

interface PriceComparisonData {
  symbol: string;
  timestamp: string;
  available: boolean;
  prices: PriceData[];
  statistics: ComparisonStatistics;
  recommended: {
    price: number;
    source: string;
  };
  message?: string;
}

// ============================================================================
// Form Schema
// ============================================================================

const formSchema = z.object({
  symbol: z
    .string()
    .min(1, '请输入交易对')
    .regex(/^[A-Z0-9]+\/[A-Z0-9]+$/, '格式应为 XXX/XXX (如: ETH/USD)'),
});

type FormData = z.infer<typeof formSchema>;

// ============================================================================
// Component
// ============================================================================

export function PriceComparison() {
  const [comparison, setComparison] = useState<PriceComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      symbol: 'ETH/USD',
    },
  });

  // 使用 ref 存储 AbortController 以便取消请求
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchComparison = useCallback(async (formData: FormData) => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // 创建新的 AbortController
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    // 重试配置
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(
          `/api/oracle/unified?action=comparison&symbol=${encodeURIComponent(formData.symbol)}`,
          {
            signal: abortControllerRef.current.signal,
          },
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch comparison: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        setComparison(data);
        setLoading(false);
        return; // 成功，退出重试循环
      } catch (error: unknown) {
        // 如果是取消请求，直接返回
        if (error instanceof Error && error.name === 'AbortError') {
          logger.debug('Request aborted', { symbol: formData.symbol });
          return;
        }

        lastError = error instanceof Error ? error : new Error(String(error));

        // 如果不是最后一次尝试，等待后重试
        if (attempt < maxRetries - 1) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 5000);
          logger.info(`Retrying fetch comparison`, {
            symbol: formData.symbol,
            attempt: attempt + 1,
            maxRetries,
            backoffMs,
          });
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    }

    // 所有重试都失败了
    const errorMessage = lastError?.message || 'Failed to fetch comparison';
    setError(errorMessage);
    logger.error('Failed to fetch comparison after retries', {
      error: lastError,
      symbol: formData.symbol,
      attempts: maxRetries,
    });
    setLoading(false);
  }, []);

  // Initial fetch
  useEffect(() => {
    handleSubmit(fetchComparison)();

    // 清理函数：组件卸载时取消进行中的请求
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [handleSubmit, fetchComparison]);

  // Handle symbol input change - convert to uppercase
  const handleSymbolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('symbol', e.target.value.toUpperCase(), { shouldValidate: true });
  };

  // 计算偏差
  const calculateDeviation = (price: number, reference: number): number => {
    // 防止除以零
    if (!reference || reference === 0 || !isFinite(reference)) {
      return 0;
    }
    const deviation = ((price - reference) / reference) * 100;
    // 检查结果有效性
    return isFinite(deviation) ? deviation : 0;
  };

  // 获取偏差颜色
  const getDeviationColor = (deviation: number): string => {
    const absDeviation = Math.abs(deviation);
    if (absDeviation > 1) return 'text-red-600';
    if (absDeviation > 0.5) return 'text-yellow-600';
    return 'text-green-600';
  };

  // 获取偏差图标
  const getDeviationIcon = (deviation: number) => {
    const absDeviation = Math.abs(deviation);
    if (absDeviation > 1) return <AlertTriangle className="h-4 w-4 text-red-600" />;
    if (absDeviation > 0.5) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            跨协议价格对比
          </CardTitle>
          <form onSubmit={handleSubmit(fetchComparison)} className="flex items-start gap-2">
            <div className="flex flex-col">
              <Input
                type="text"
                {...register('symbol', { onChange: handleSymbolChange })}
                placeholder="输入交易对 (如: ETH/USD)"
                className="w-40"
                aria-invalid={errors.symbol ? 'true' : 'false'}
              />
              {errors.symbol && (
                <span className="mt-1 text-xs text-red-500">{errors.symbol.message}</span>
              )}
            </div>
            <Button type="submit" variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </form>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="text-muted-foreground h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-red-500" />
            <p className="text-red-600">{error}</p>
          </div>
        ) : comparison?.available ? (
          <div className="space-y-6">
            {/* 价格表格 */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left font-medium">协议</th>
                    <th className="py-2 text-left font-medium">链</th>
                    <th className="py-2 text-right font-medium">价格</th>
                    <th className="py-2 text-right font-medium">偏差</th>
                    <th className="py-2 text-center font-medium">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.prices.map((price, index) => {
                    const deviation = calculateDeviation(
                      price.price,
                      comparison.statistics.avgPrice,
                    );
                    return (
                      <tr key={index} className="hover:bg-muted/50 border-b last:border-0">
                        <td className="py-3">
                          <Badge variant="secondary" className="font-semibold">
                            {price.protocol.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="text-muted-foreground py-3 capitalize">{price.chain}</td>
                        <td className="py-3 text-right font-mono font-medium">
                          $
                          {price.price.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 6,
                          })}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {getDeviationIcon(deviation)}
                            <span className={`font-mono ${getDeviationColor(deviation)}`}>
                              {deviation > 0 ? '+' : ''}
                              {deviation.toFixed(2)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          {price.isStale ? (
                            <Badge variant="destructive">过期</Badge>
                          ) : (
                            <Badge variant="outline" className="border-green-200 text-green-600">
                              正常
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 统计信息 */}
            <div className="grid grid-cols-2 gap-4 border-t pt-4 md:grid-cols-4">
              <StatCard
                label="平均价格"
                value={`$${comparison.statistics.avgPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`}
              />
              <StatCard
                label="中位数"
                value={`$${comparison.statistics.medianPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`}
              />
              <StatCard
                label="价格范围"
                value={`${comparison.statistics.priceRangePercent.toFixed(2)}%`}
                highlight={comparison.statistics.priceRangePercent > 1}
              />
              <StatCard
                label="推荐价格"
                value={`$${comparison.recommended.price.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`}
                valueClassName="text-green-600"
              />
            </div>

            {/* 更新时间 */}
            <p className="text-muted-foreground text-right text-xs">
              更新时间: {new Date(comparison.timestamp).toLocaleString()}
            </p>
          </div>
        ) : (
          <div className="py-8 text-center">
            <TrendingUp className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
            <p className="text-muted-foreground">{comparison?.message || '暂无对比数据'}</p>
            <p className="text-muted-foreground mt-2 text-sm">
              请输入交易对（如：ETH/USD, BTC/USD）查看价格对比
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface StatCardProps {
  label: string;
  value: string;
  highlight?: boolean;
  valueClassName?: string;
}

function StatCard({ label, value, highlight, valueClassName }: StatCardProps) {
  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <p className="text-muted-foreground mb-1 text-xs">{label}</p>
      <p
        className={`font-mono text-lg font-semibold ${
          highlight ? 'text-red-600' : valueClassName || ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default PriceComparison;
