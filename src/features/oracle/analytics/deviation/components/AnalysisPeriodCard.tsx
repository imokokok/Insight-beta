'use client';

import { Clock } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useI18n } from '@/i18n';
import { formatTime } from '@/shared/utils';

import type { DeviationReport } from '../types/deviation';

interface AnalysisPeriodCardProps {
  report: DeviationReport | null;
}

export function AnalysisPeriodCard({ report }: AnalysisPeriodCardProps) {
  const { t } = useI18n();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t('analytics.analysisPeriod.title')}
        </CardTitle>
        <CardDescription>{t('analytics.analysisPeriod.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {report ? (
          <>
            <div className="flex justify-between rounded-lg bg-gray-50 p-3">
              <span className="text-muted-foreground">{t('analytics.analysisPeriod.generatedAt')}</span>
              <span className="font-medium">{formatTime(report.generatedAt)}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-gray-50 p-3">
              <span className="text-muted-foreground">{t('analytics.analysisPeriod.periodStart')}</span>
              <span className="font-medium">{formatTime(report.period.start)}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-gray-50 p-3">
              <span className="text-muted-foreground">{t('analytics.analysisPeriod.periodEnd')}</span>
              <span className="font-medium">{formatTime(report.period.end)}</span>
            </div>
            <div className="rounded-lg bg-orange-50 p-4">
              <p className="text-sm font-medium text-orange-800">{t('analytics.analysisPeriod.analysisWindow')}</p>
              <p className="text-2xl font-bold text-orange-600">{t('analytics.analysisPeriod.hours24')}</p>
              <p className="text-xs text-orange-700">{t('analytics.analysisPeriod.rollingWindow')}</p>
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-gray-400">{t('analytics.analysisPeriod.loading')}</div>
        )}
      </CardContent>
    </Card>
  );
}
