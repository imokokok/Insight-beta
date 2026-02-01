'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Award,
  Wallet,
  BarChart3,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import type { CostComparison } from '@/lib/types/oracle';
import { cn } from '@/lib/utils';

interface CostEfficiencyProps {
  data?: CostComparison;
  isLoading?: boolean;
}

const useCaseLabels: Record<string, string> = {
  defi_protocol: 'DeFi 协议',
  trading: '交易应用',
  enterprise: '企业应用',
  hobby: '个人/实验',
};

function formatCost(value: number): string {
  if (value === 0) return '免费';
  if (value < 1) return `$${(value * 100).toFixed(0)}¢`;
  if (value < 1000) return `$${value.toFixed(0)}`;
  return `$${(value / 1000).toFixed(1)}k`;
}

function getCostLevelColor(score: number): string {
  if (score >= 80) return 'text-emerald-600 bg-emerald-50';
  if (score >= 60) return 'text-yellow-600 bg-yellow-50';
  if (score >= 40) return 'text-orange-600 bg-orange-50';
  return 'text-red-600 bg-red-50';
}

export function CostEfficiencyView({ data, isLoading }: CostEfficiencyProps) {
  const radarData = useMemo(() => {
    if (!data) return [];
    return data.protocols.map((p) => ({
      protocol: p.protocol,
      成本优势: p.costScore,
      综合价值: p.valueScore,
      数据准确性: p.accuracyScore,
      可用性: p.uptimeScore,
      覆盖范围: Math.min(100, (p.feedsCount / 100) * 100),
      多链支持: Math.min(100, (p.chainsCount / 10) * 100),
    }));
  }, [data]);

  const costComparisonData = useMemo(() => {
    if (!data) return [];
    return data.protocols.map((p) => ({
      protocol: p.protocol,
      costPerFeed: p.costPerFeed,
      costPerChain: p.costPerChain,
      costPerUpdate: p.costPerUpdate * 1000, // Scale for visibility
      roi: p.roi,
    }));
  }, [data]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="mb-6 grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.protocols.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>成本效益分析</CardTitle>
          <CardDescription>暂无数据</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground flex h-64 items-center justify-center">
          <DollarSign className="mr-2 h-5 w-5" />
          成本数据加载中...
        </CardContent>
      </Card>
    );
  }

  const { protocols, recommendations } = data;
  const bestValue = protocols.reduce((prev, current) =>
    prev.valueScore > current.valueScore ? prev : current,
  );
  const cheapest = protocols.reduce((prev, current) =>
    prev.costScore > current.costScore ? prev : current,
  );

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">成本效益分析</CardTitle>
            <CardDescription className="text-muted-foreground mt-1 text-sm">
              各预言机协议的成本结构和性价比对比
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            <Wallet className="mr-1 h-3 w-3" />
            月度估算
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Top Recommendations */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Best Value */}
          <div className="rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="flex items-center gap-1 text-sm font-medium text-violet-600">
                  <Award className="h-4 w-4" />
                  最佳性价比
                </p>
                <p className="mt-1 text-xl font-bold capitalize">{bestValue.protocol}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  价值评分: {bestValue.valueScore.toFixed(0)}/100
                </p>
              </div>
              <div className="rounded-full bg-violet-100 p-2 text-violet-600">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Cheapest */}
          <div className="rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                  <DollarSign className="h-4 w-4" />
                  最低成本
                </p>
                <p className="mt-1 text-xl font-bold capitalize">{cheapest.protocol}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  成本评分: {cheapest.costScore.toFixed(0)}/100
                </p>
              </div>
              <div className="rounded-full bg-emerald-100 p-2 text-emerald-600">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Most Feeds */}
          <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="flex items-center gap-1 text-sm font-medium text-blue-600">
                  <BarChart3 className="h-4 w-4" />
                  最多喂价
                </p>
                <p className="mt-1 text-xl font-bold capitalize">
                  {
                    protocols.reduce((prev, current) =>
                      prev.feedsCount > current.feedsCount ? prev : current,
                    ).protocol
                  }
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {Math.max(...protocols.map((p) => p.feedsCount))} 个喂价对
                </p>
              </div>
              <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="radar" className="w-full" value="radar" onValueChange={() => {}}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="radar">综合评分</TabsTrigger>
            <TabsTrigger value="costs">成本对比</TabsTrigger>
            <TabsTrigger value="recommendations">使用建议</TabsTrigger>
          </TabsList>

          <TabsContent value="radar" className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="protocol" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                  {radarData.slice(0, 4).map((entry, index) => (
                    <Radar
                      key={entry.protocol}
                      name={entry.protocol}
                      dataKey={entry.protocol}
                      stroke={['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6'][index]}
                      fill={['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6'][index]}
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                  ))}
                  <RechartsTooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Score Table */}
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">协议</th>
                    <th className="px-4 py-2 text-right font-medium">成本评分</th>
                    <th className="px-4 py-2 text-right font-medium">价值评分</th>
                    <th className="px-4 py-2 text-right font-medium">准确性</th>
                    <th className="px-4 py-2 text-right font-medium">可用性</th>
                    <th className="px-4 py-2 text-center font-medium">喂价数</th>
                  </tr>
                </thead>
                <tbody>
                  {protocols
                    .sort((a, b) => b.valueScore - a.valueScore)
                    .map((protocol) => (
                      <tr key={protocol.protocol} className="hover:bg-muted/30 border-t">
                        <td className="px-4 py-2 font-medium capitalize">{protocol.protocol}</td>
                        <td className="px-4 py-2 text-right">
                          <span
                            className={cn(
                              'rounded px-2 py-0.5 text-xs font-medium',
                              getCostLevelColor(protocol.costScore),
                            )}
                          >
                            {protocol.costScore.toFixed(0)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right font-medium">
                          {protocol.valueScore.toFixed(0)}
                        </td>
                        <td className="text-muted-foreground px-4 py-2 text-right">
                          {protocol.accuracyScore.toFixed(0)}%
                        </td>
                        <td className="text-muted-foreground px-4 py-2 text-right">
                          {protocol.uptimeScore.toFixed(1)}%
                        </td>
                        <td className="px-4 py-2 text-center">
                          <Badge variant="secondary" className="text-xs">
                            {protocol.feedsCount}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="costs" className="space-y-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={costComparisonData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="protocol"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(0, 3)}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <RechartsTooltip
                    formatter={(value: number | undefined, name: string | undefined) => {
                      if (value === undefined || name === undefined) return ['', name || ''];
                      if (name === 'roi') return [`${value.toFixed(1)}x`, 'ROI'];
                      return [formatCost(value), name];
                    }}
                  />
                  <Bar
                    dataKey="costPerFeed"
                    name="每喂价成本"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="costPerUpdate"
                    name="每千次更新"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {protocols.slice(0, 4).map((protocol) => (
                <div key={protocol.protocol} className="bg-muted/20 rounded-lg border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium capitalize">{protocol.protocol}</span>
                    <Badge variant="outline" className="text-xs">
                      {protocol.chainsCount} 条链
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">每喂价:</span>
                      <span>{formatCost(protocol.costPerFeed)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">每更新:</span>
                      <span>{formatCost(protocol.costPerUpdate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ROI:</span>
                      <span className={protocol.roi > 1 ? 'text-emerald-600' : 'text-red-600'}>
                        {protocol.roi.toFixed(1)}x
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="bg-card rounded-lg border p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 text-primary rounded-full p-2">
                      {rec.useCase === 'defi_protocol' && <BarChart3 className="h-5 w-5" />}
                      {rec.useCase === 'trading' && <TrendingUp className="h-5 w-5" />}
                      {rec.useCase === 'enterprise' && <Award className="h-5 w-5" />}
                      {rec.useCase === 'hobby' && <Wallet className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{useCaseLabels[rec.useCase]}</h4>
                        <Badge className="text-xs">推荐: {rec.recommendedProtocol}</Badge>
                      </div>
                      <p className="text-muted-foreground mt-1 text-sm">{rec.reason}</p>
                      <div className="mt-3 flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                          预估月成本:{' '}
                          <span className="text-foreground font-medium">
                            {formatCost(rec.estimatedMonthlyCost)}
                          </span>
                        </span>
                        <span className="text-muted-foreground">
                          备选: {rec.alternatives.slice(0, 2).join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-muted/30 flex items-start gap-3 rounded-lg border p-4">
              <Info className="text-muted-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
              <div className="text-muted-foreground text-sm">
                <p className="text-foreground mb-1 font-medium">成本计算说明</p>
                <p>
                  成本估算基于公开的价格信息和链上 Gas
                  费用。实际成本可能因使用量、链上拥堵情况和协议定价策略而有所不同。建议直接联系协议方获取准确报价。
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
