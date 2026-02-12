'use client';

import { useMemo } from 'react';

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

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useI18n } from '@/i18n';
import type { CostComparison } from '@/types/oracle';
import { cn } from '@/shared/utils';

interface CostEfficiencyProps {
  data?: CostComparison;
  isLoading?: boolean;
}

function formatCost(value: number, t: (key: string) => string): string {
  if (value === 0) return t('comparison.cost.free');
  if (value < 1) return `$${(value * 100).toFixed(0)}¢`;
  if (value < 1000) return `$${value.toFixed(0)}`;
  return `$${(value / 1000).toFixed(1)}k`;
}

function getCostLevelColor(score: number): string {
  if (score >= 80) return 'text-emerald-600 bg-emerald-50';
  if (score >= 60) return 'text-yellow-600 bg-yellow-50';
  if (score >= 40) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
}

export function CostEfficiencyView({ data, isLoading }: CostEfficiencyProps) {
  const { t } = useI18n();

  const radarData = useMemo(() => {
    if (!data) return [];
    return data.protocols.map((p) => ({
      protocol: p.protocol,
      [t('comparison.cost.radar.costAdvantage')]: p.costScore,
      [t('comparison.cost.radar.overallValue')]: p.valueScore,
      [t('comparison.cost.radar.accuracy')]: p.accuracyScore,
      [t('comparison.cost.radar.uptime')]: p.uptimeScore,
      [t('comparison.cost.radar.coverage')]: Math.min(100, (p.feedsCount / 100) * 100),
      [t('comparison.cost.radar.multiChain')]: Math.min(100, (p.chainsCount / 10) * 100),
    }));
  }, [data, t]);

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
          <CardTitle>{t('comparison.cost.title')}</CardTitle>
          <CardDescription>{t('comparison.status.noData')}</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground flex h-64 items-center justify-center">
          <DollarSign className="mr-2 h-5 w-5" />
          {t('comparison.cost.loading')}
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
            <CardTitle className="text-lg font-semibold">{t('comparison.cost.title')}</CardTitle>
            <CardDescription className="text-muted-foreground mt-1 text-sm">
              {t('comparison.cost.description')}
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            <Wallet className="mr-1 h-3 w-3" />
            {t('comparison.cost.monthlyEstimate')}
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
                  {t('comparison.cost.bestValue')}
                </p>
                <p className="mt-1 text-xl font-bold capitalize">{bestValue.protocol}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {t('comparison.cost.valueScore')}: {bestValue.valueScore.toFixed(0)}/100
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
                  {t('comparison.cost.lowestCost')}
                </p>
                <p className="mt-1 text-xl font-bold capitalize">{cheapest.protocol}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {t('comparison.cost.costScore')}: {cheapest.costScore.toFixed(0)}/100
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
                  {t('comparison.cost.mostFeeds')}
                </p>
                <p className="mt-1 text-xl font-bold capitalize">
                  {
                    protocols.reduce((prev, current) =>
                      prev.feedsCount > current.feedsCount ? prev : current,
                    ).protocol
                  }
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {Math.max(...protocols.map((p) => p.feedsCount))} {t('comparison.cost.feedPairs')}
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
            <TabsTrigger value="radar">{t('comparison.cost.tabs.overallScore')}</TabsTrigger>
            <TabsTrigger value="costs">{t('comparison.cost.tabs.costComparison')}</TabsTrigger>
            <TabsTrigger value="recommendations">
              {t('comparison.cost.tabs.recommendations')}
            </TabsTrigger>
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
                    <th className="px-4 py-2 text-left font-medium">
                      {t('comparison.table.protocol')}
                    </th>
                    <th className="px-4 py-2 text-right font-medium">
                      {t('comparison.cost.costScore')}
                    </th>
                    <th className="px-4 py-2 text-right font-medium">
                      {t('comparison.cost.valueScore')}
                    </th>
                    <th className="px-4 py-2 text-right font-medium">
                      {t('comparison.cost.accuracy')}
                    </th>
                    <th className="px-4 py-2 text-right font-medium">
                      {t('comparison.cost.uptime')}
                    </th>
                    <th className="px-4 py-2 text-center font-medium">
                      {t('comparison.cost.feedCount')}
                    </th>
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
                      return [formatCost(value, t), name];
                    }}
                  />
                  <Bar
                    dataKey="costPerFeed"
                    name={t('comparison.cost.costPerFeed')}
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="costPerUpdate"
                    name={t('comparison.cost.costPer1000Updates')}
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
                      {protocol.chainsCount} {t('comparison.cost.chains')}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('comparison.cost.perFeed')}:</span>
                      <span>{formatCost(protocol.costPerFeed, t)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t('comparison.cost.perUpdate')}:
                      </span>
                      <span>{formatCost(protocol.costPerUpdate, t)}</span>
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
                        <h4 className="font-semibold">
                          {t(`comparison.cost.useCase.${rec.useCase}`)}
                        </h4>
                        <Badge className="text-xs">
                          {t('comparison.cost.recommended')}: {rec.recommendedProtocol}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-1 text-sm">{rec.reason}</p>
                      <div className="mt-3 flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                          {t('comparison.cost.estimatedMonthlyCost')}:{' '}
                          <span className="text-foreground font-medium">
                            {formatCost(rec.estimatedMonthlyCost, t)}
                          </span>
                        </span>
                        <span className="text-muted-foreground">
                          {t('comparison.cost.alternatives')}:{' '}
                          {rec.alternatives.slice(0, 2).join(', ')}
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
                <p className="text-foreground mb-1 font-medium">
                  {t('comparison.cost.calculationNote')}
                </p>
                <p>{t('comparison.cost.calculationDescription')}</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
