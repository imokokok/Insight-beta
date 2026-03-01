'use client';

import { useState } from 'react';

import { RefreshCw } from 'lucide-react';

import { Breadcrumb } from '@/components/common';
import { Button } from '@/components/ui';
import { Card, CardContent } from '@/components/ui';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import {
  ReliabilityScoreCard,
  ReliabilityComparisonTable,
  ReliabilityTrendChart,
} from '@/features/oracle/reliability/components';
import { useReliabilityScores, useReliabilityTrend } from '@/features/oracle/reliability/hooks';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';
import type { TimePeriod } from '@/types/oracle';

import { ComparePageLayout } from '../components/ComparePageLayout';

const periods: { value: TimePeriod; labelKey: string }[] = [
  { value: '7d', labelKey: 'oracle.reliability.7d' },
  { value: '30d', labelKey: 'oracle.reliability.30d' },
  { value: '90d', labelKey: 'oracle.reliability.90d' },
];

export default function ReliabilityComparePage() {
  const { t } = useI18n();
  const [period, setPeriod] = useState<TimePeriod>('30d');
  const [selectedProtocol, setSelectedProtocol] = useState<string>('chainlink');

  const {
    rankings,
    lastUpdated: _lastUpdated,
    periodStart,
    periodEnd,
    isLoading: reliabilityLoading,
    isError: reliabilityError,
    refresh: refreshReliability,
  } = useReliabilityScores(period);
  const { trendData, isLoading: trendLoading } = useReliabilityTrend(selectedProtocol, 30);

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  const breadcrumbItems = [
    { label: t('nav.compare'), href: '/compare' },
    { label: t('compare.tabs.reliability') },
  ];

  return (
    <ComparePageLayout activeTab="reliability">
      <Breadcrumb items={breadcrumbItems} />

      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-medium sm:text-lg">
                {t('compare.reliability.title') || '可靠性分析'}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('compare.reliability.description') || '可靠性评分排名、可靠性趋势图'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void refreshReliability()}
                disabled={reliabilityLoading}
              >
                <RefreshCw className={cn('mr-2 h-4 w-4', reliabilityLoading && 'animate-spin')} />
                {t('common.refresh')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-xl border border-border/30 bg-card/30 p-4">
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
            <span>{`${formatDate(periodStart)} - ${formatDate(periodEnd)}`}</span>
          </div>
        )}
      </div>

      {reliabilityError && (
        <div className="border-destructive/50 bg-destructive/10 rounded-xl border p-4">
          <p className="text-destructive text-sm">{t('oracle.reliability.loadError')}</p>
        </div>
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

      <ReliabilityComparisonTable rankings={rankings} isLoading={reliabilityLoading} />

      <Card className="border-border/50">
        <CardContent className="p-4">
          <h4 className="mb-4 text-base font-medium">{t('oracle.reliability.trendAnalysis')}</h4>
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
    </ComparePageLayout>
  );
}
