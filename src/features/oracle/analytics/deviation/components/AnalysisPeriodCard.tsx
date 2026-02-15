'use client';

import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatTime } from '@/shared/utils';
import type { DeviationReport } from '../types/deviation';

interface AnalysisPeriodCardProps {
  report: DeviationReport | null;
}

export function AnalysisPeriodCard({ report }: AnalysisPeriodCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Analysis Period
        </CardTitle>
        <CardDescription>Report generation details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {report ? (
          <>
            <div className="flex justify-between rounded-lg bg-gray-50 p-3">
              <span className="text-muted-foreground">Generated At</span>
              <span className="font-medium">{formatTime(report.generatedAt)}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-gray-50 p-3">
              <span className="text-muted-foreground">Period Start</span>
              <span className="font-medium">{formatTime(report.period.start)}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-gray-50 p-3">
              <span className="text-muted-foreground">Period End</span>
              <span className="font-medium">{formatTime(report.period.end)}</span>
            </div>
            <div className="rounded-lg bg-orange-50 p-4">
              <p className="text-sm font-medium text-orange-800">Analysis Window</p>
              <p className="text-2xl font-bold text-orange-600">24 Hours</p>
              <p className="text-xs text-orange-700">Rolling window for trend analysis</p>
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-gray-400">Loading...</div>
        )}
      </CardContent>
    </Card>
  );
}
