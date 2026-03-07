'use client';

import { useMemo, useState } from 'react';

import { CheckCircle, XCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Badge } from '@/components/ui';
import { useI18n } from '@/i18n';
import { CHART_GRID } from '@/lib/chart-config';
import { cn, TrendIcon } from '@/shared/utils';

interface ChainDataPoint {
  chain: string;
  value: number;
  timestamp: string;
  delay: number;
  blockNumber: number;
}

interface CrossChainConsistencyProps {
  dapiName: string;
  data: ChainDataPoint[];
  isLoading?: boolean;
}

interface ConsistencyScore {
  score: number;
  level: 'excellent' | 'good' | 'fair' | 'poor';
  maxDeviation: number;
  avgDeviation: number;
  syncedChains: number;
  totalChains: number;
}

interface ComparisonChartData {
  chain: string;
  value: number;
  deviation: number;
  isSynced: boolean;
}

export function CrossChainConsistency({ dapiName, data, isLoading }: CrossChainConsistencyProps) {
  const [selectedChain, setSelectedChain] = useState<string | null>(null);

  const consistencyScore = useMemo<ConsistencyScore | null>(() => {
    if (!data || data.length === 0) return null;

    // 计算平均价格
    const avgValue = data.reduce((sum, d) => sum + d.value, 0) / data.length;

    // 计算每个链的偏差
    const deviations = data.map((d) => Math.abs((d.value - avgValue) / avgValue) * 100);
    const maxDeviation = Math.max(...deviations);
    const avgDeviation = deviations.reduce((sum, d) => sum + d, 0) / deviations.length;

    // 计算同步的链数量（偏差 < 1% 视为同步）
    const syncedChains = deviations.filter((d) => d < 1).length;
    const totalChains = data.length;

    // 计算一致性评分 (0-100)
    let score = 100;
    score -= maxDeviation * 5; // 最大偏差扣分
    score -= avgDeviation * 10; // 平均偏差扣分
    score -= (1 - syncedChains / totalChains) * 20; // 未同步链扣分
    score = Math.max(0, Math.min(100, score));

    // 确定等级
    let level: ConsistencyScore['level'] = 'excellent';
    if (score < 90) level = 'good';
    if (score < 75) level = 'fair';
    if (score < 60) level = 'poor';

    return {
      score: Math.round(score),
      level,
      maxDeviation: parseFloat(maxDeviation.toFixed(3)),
      avgDeviation: parseFloat(avgDeviation.toFixed(3)),
      syncedChains,
      totalChains,
    };
  }, [data]);

  const chartData = useMemo<ComparisonChartData[]>(() => {
    if (!data || data.length === 0) return [];

    const avgValue = data.reduce((sum, d) => sum + d.value, 0) / data.length;

    return data.map((d) => ({
      chain: d.chain,
      value: d.value,
      deviation: Math.abs((d.value - avgValue) / avgValue) * 100,
      isSynced: Math.abs((d.value - avgValue) / avgValue) * 100 < 1,
    }));
  }, [data]);

  const getScoreColor = (level: string) => {
    switch (level) {
      case 'excellent':
        return 'text-green-600';
      case 'good':
        return 'text-blue-600';
      case 'fair':
        return 'text-yellow-600';
      case 'poor':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getScoreBadgeColor = (level: string) => {
    switch (level) {
      case 'excellent':
        return 'success';
      case 'good':
        return 'default';
      case 'fair':
        return 'warning';
      case 'poor':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{
      value: number;
      payload: ComparisonChartData;
    }>;
  }) => {
    if (active && payload && payload.length) {
      const chainData = payload[0]!.payload;
      return (
        <div className="rounded-lg border bg-white p-3 shadow-lg dark:bg-slate-800">
          <p className="mb-2 text-xs font-semibold">{chainData.chain}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">价格:</span>
              <span className="text-sm font-bold">{chainData.value.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">偏差:</span>
              <span
                className={cn(
                  'text-sm font-medium',
                  chainData.deviation < 1
                    ? 'text-green-600'
                    : chainData.deviation < 3
                      ? 'text-yellow-600'
                      : 'text-red-600',
                )}
              >
                {chainData.deviation.toFixed(3)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">状态:</span>
              {chainData.isSynced ? (
                <Badge variant="success" size="sm">
                  已同步
                </Badge>
              ) : (
                <Badge variant="warning" size="sm">
                  未同步
                </Badge>
              )}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>跨链一致性分析</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            加载中...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>跨链一致性分析</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            暂无数据
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              {dapiName} 跨链一致性分析
            </CardTitle>
            <CardDescription>
              对比同一 dAPI 在不同链上的数据，评估数据一致性
            </CardDescription>
          </div>
          {consistencyScore && (
            <div className="text-right">
              <div className="text-sm text-muted-foreground">一致性评分</div>
              <div className={cn('text-3xl font-bold', getScoreColor(consistencyScore.level))}>
                {consistencyScore.score}
              </div>
              <Badge
                variant={getScoreBadgeColor(consistencyScore.level)}
                className="mt-1"
              >
                {consistencyScore.level === 'excellent' && '优秀'}
                {consistencyScore.level === 'good' && '良好'}
                {consistencyScore.level === 'fair' && '一般'}
                {consistencyScore.level === 'poor' && '较差'}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* 一致性统计 */}
        {consistencyScore && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">已同步链</span>
                </div>
                <div className="mt-2 text-2xl font-bold">
                  {consistencyScore.syncedChains} / {consistencyScore.totalChains}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm text-muted-foreground">最大偏差</span>
                </div>
                <div className="mt-2 text-2xl font-bold">
                  {consistencyScore.maxDeviation}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">平均偏差</span>
                </div>
                <div className="mt-2 text-2xl font-bold">
                  {consistencyScore.avgDeviation}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  {consistencyScore.score >= 90 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm text-muted-foreground">整体状态</span>
                </div>
                <div className={cn('mt-2 text-xl font-bold', getScoreColor(consistencyScore.level))}>
                  {consistencyScore.level === 'excellent' && '优秀'}
                  {consistencyScore.level === 'good' && '良好'}
                  {consistencyScore.level === 'fair' && '一般'}
                  {consistencyScore.level === 'poor' && '较差'}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 跨链对比图表 */}
        <div>
          <h4 className="mb-3 text-sm font-semibold">各链数据对比</h4>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray={CHART_GRID.strokeDasharray}
                  className={CHART_GRID.className}
                  vertical={CHART_GRID.vertical}
                />
                <XAxis
                  dataKey="chain"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  unit="%"
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  yAxisId="right"
                  y={1}
                  stroke="#22c55e"
                  strokeDasharray="3 3"
                  label={{ value: '同步阈值 1%', fontSize: 12, fill: '#22c55e' }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="value"
                  name="价格"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="right"
                  dataKey="deviation"
                  name="偏差"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 详细数据表 */}
        <div className="mt-6">
          <h4 className="mb-3 text-sm font-semibold">详细数据</h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="pb-3 text-left text-sm font-medium text-muted-foreground">链</th>
                  <th className="pb-3 text-right text-sm font-medium text-muted-foreground">
                    价格
                  </th>
                  <th className="pb-3 text-right text-sm font-medium text-muted-foreground">
                    偏差
                  </th>
                  <th className="pb-3 text-right text-sm font-medium text-muted-foreground">
                    延迟
                  </th>
                  <th className="pb-3 text-right text-sm font-medium text-muted-foreground">
                    区块号
                  </th>
                  <th className="pb-3 text-center text-sm font-medium text-muted-foreground">
                    状态
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((chainData, index) => {
                  const deviation =
                    chartData.find((c) => c.chain === chainData.chain)?.deviation || 0;
                  const isSynced = deviation < 1;

                  return (
                    <tr
                      key={index}
                      className="border-b last:border-0 hover:bg-muted/20"
                      onClick={() =>
                        setSelectedChain(selectedChain === chainData.chain ? null : chainData.chain)
                      }
                    >
                      <td className="py-3">
                        <Badge variant="secondary" className="capitalize">
                          {chainData.chain}
                        </Badge>
                      </td>
                      <td className="py-3 text-right font-mono">
                        {chainData.value.toFixed(2)}
                      </td>
                      <td
                        className={cn(
                          'py-3 text-right font-mono',
                          deviation < 1
                            ? 'text-green-600'
                            : deviation < 3
                              ? 'text-yellow-600'
                              : 'text-red-600',
                        )}
                      >
                        {deviation.toFixed(3)}%
                      </td>
                      <td className="py-3 text-right">{chainData.delay}ms</td>
                      <td className="py-3 text-right font-mono">{chainData.blockNumber}</td>
                      <td className="py-3 text-center">
                        {isSynced ? (
                          <CheckCircle className="mx-auto h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="mx-auto h-4 w-4 text-red-500" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
