'use client';

import { TrendingUp, Target } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/i18n/LanguageProvider';

import { DeviationTrendChart } from './DeviationTrendChart';
import { TrendDirectionBadge } from './TrendDirectionBadge';

import type { DeviationTrend, PriceDeviationPoint } from '../types/deviation';

interface TrendDetailsProps {
  selectedTrend: DeviationTrend | null;
  symbolData: PriceDeviationPoint[];
}

export function TrendDetails({ selectedTrend, symbolData }: TrendDetailsProps) {
  const { t } = useI18n();
  
  if (!selectedTrend) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <TrendingUp className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p className="text-muted-foreground">
            {t('common.selectSymbol')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {selectedTrend.symbol} {t('analytics.deviation.trends.details')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-muted-foreground">{t('common.trendDirection')}</p>
              <TrendDirectionBadge
                direction={selectedTrend.trendDirection}
                strength={selectedTrend.trendStrength}
              />
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-muted-foreground">{t('common.anomalyScore')}</p>
              <p
                className={`text-lg font-bold ${
                  selectedTrend.anomalyScore > 0.7
                    ? 'text-red-500'
                    : selectedTrend.anomalyScore > 0.4
                      ? 'text-orange-500'
                      : 'text-green-500'
                }`}
              >
                {(selectedTrend.anomalyScore * 100).toFixed(1)}%
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-muted-foreground">{t('common.avgDeviation')}</p>
              <p className="text-lg font-bold">
                {(selectedTrend.avgDeviation * 100).toFixed(2)}%
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-muted-foreground">{t('common.maxDeviation')}</p>
              <p className="text-lg font-bold">
                {(selectedTrend.maxDeviation * 100).toFixed(2)}%
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-800">{t('common.recommendation')}</p>
            <p className="mt-1 text-sm text-blue-700">{selectedTrend.recommendation}</p>
          </div>
        </CardContent>
      </Card>

      {symbolData.length > 0 && <DeviationTrendChart dataPoints={symbolData} />}
    </>
  );
}
