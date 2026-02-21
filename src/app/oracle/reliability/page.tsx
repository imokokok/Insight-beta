'use client';

import { useState } from 'react';

import { Shield, RefreshCw, TrendingUp, Calendar } from 'lucide-react';

import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshIndicator } from '@/components/ui/RefreshIndicator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ReliabilityScoreCard,
  ReliabilityComparisonTable,
  ReliabilityTrendChart,
} from '@/features/oracle/reliability/components';
import { useReliabilityScores, useReliabilityTrend } from '@/features/oracle/reliability/hooks';
import { useI18n } from '@/i18n';
import type { TimePeriod } from '@/types/oracle/reliability';

const periods: { value: TimePeriod; labelKey: string }[] = [
  { value: '7d', labelKey: 'oracle.reliability.7d' },
  { value: '30d', labelKey: 'oracle.reliability.30d' },
  { value: '90d', labelKey: 'oracle.reliability.90d' },
];

export default function ReliabilityPage() {
  const { t } = useI18n();
  const [period, setPeriod] = useState<TimePeriod>('30d');
  const [selectedProtocol, setSelectedProtocol] = useState<string>('chainlink');

  const { rankings, lastUpdated, periodStart, periodEnd, isLoading, isError, refresh } =
    useReliabilityScores(period);
  const { trendData, isLoading: trendLoading } = useReliabilityTrend(selectedProtocol, 30);

  const breadcrumbItems = [
    { label: t('nav.oracle'), href: '/oracle' },
    { label: t('oracle.reliability.pageTitle') },
  ];

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6">
      <Breadcrumb items={breadcrumbItems} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
            <Shield className="h-6 w-6 text-primary" />
            {t('oracle.reliability.pageTitle')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('oracle.reliability.pageDescription')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refresh()} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
          <RefreshIndicator
            lastUpdated={lastUpdated ? new Date(lastUpdated) : null}
            isRefreshing={isLoading}
            onRefresh={refresh}
          />
        </div>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
            <TabsList className="grid w-full grid-cols-3">
              {periods.map((p) => (
                <TabsTrigger key={p.value} value={p.value}>
                  {t(p.labelKey)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {periodStart && periodEnd && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {t('oracle.reliability.dataRangeLabel', {
                  startDate: formatDate(periodStart),
                  endDate: formatDate(periodEnd),
                })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {isError && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="p-4">
            <p className="text-destructive text-sm">{t('oracle.reliability.loadError')}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {rankings.map((ranking) => (
          <ReliabilityScoreCard
            key={ranking.protocol}
            protocol={ranking.protocol}
            score={ranking.score}
            rank={ranking.rank}
            accuracyScore={ranking.metrics.accuracyScore}
            latencyScore={ranking.metrics.latencyScore}
            availabilityScore={ranking.metrics.availabilityScore}
            deviationAvg={ranking.metrics.deviationAvg}
            sampleCount={ranking.metrics.sampleCount}
          />
        ))}
      </div>

      <ReliabilityComparisonTable rankings={rankings} isLoading={isLoading} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('oracle.reliability.trendAnalysis')}
          </CardTitle>
          <CardDescription>{t('oracle.reliability.trendDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedProtocol} onValueChange={setSelectedProtocol}>
            <TabsList className="mb-4">
              {rankings.map((r) => (
                <TabsTrigger key={r.protocol} value={r.protocol} className="capitalize">
                  {r.protocol}
                </TabsTrigger>
              ))}
            </TabsList>
            {rankings.map((r) => (
              <TabsContent key={r.protocol} value={r.protocol}>
                <ReliabilityTrendChart
                  data={trendData}
                  protocol={r.protocol}
                  isLoading={trendLoading}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('oracle.reliability.methodology')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>{t('oracle.reliability.methodologyDesc')}</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <div className="font-medium text-foreground">
                  {t('oracle.reliability.accuracy')} (50%)
                </div>
                <p className="mt-1 text-xs">{t('oracle.reliability.accuracyDesc')}</p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="font-medium text-foreground">
                  {t('oracle.reliability.latency')} (30%)
                </div>
                <p className="mt-1 text-xs">{t('oracle.reliability.latencyDesc')}</p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="font-medium text-foreground">
                  {t('oracle.reliability.availability')} (20%)
                </div>
                <p className="mt-1 text-xs">{t('oracle.reliability.availabilityDesc')}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
