'use client';

import { useMemo } from 'react';

import { TrendingUp, Target, AlertTriangle, Clock, Activity, BarChart2, Info } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

import { DeviationTrendChart } from './DeviationTrendChart';
import { TrendDirectionBadge } from './TrendDirectionBadge';

import type { DeviationTrend, PriceDeviationPoint } from '../types/deviation';

interface TrendDetailsProps {
  selectedTrend: DeviationTrend | null;
  symbolData: PriceDeviationPoint[];
}

function getSeverityLevel(score: number): { label: string; color: string; bgColor: string } {
  if (score > 0.7) return { label: 'critical', color: 'text-red-600', bgColor: 'bg-red-50' };
  if (score > 0.4) return { label: 'warning', color: 'text-orange-600', bgColor: 'bg-orange-50' };
  return { label: 'normal', color: 'text-green-600', bgColor: 'bg-green-50' };
}

export function TrendDetails({ selectedTrend, symbolData }: TrendDetailsProps) {
  const { t } = useI18n();

  const enhancedStats = useMemo(() => {
    if (symbolData.length === 0) return null;

    const deviations = symbolData.map((d) => d.maxDeviationPercent);
    const prices = symbolData.map((d) => d.avgPrice);

    const avgDev = deviations.reduce((a, b) => a + b, 0) / deviations.length;
    const maxDev = Math.max(...deviations);
    const minDev = Math.min(...deviations);
    const stdDev = Math.sqrt(
      deviations.reduce((sum, d) => sum + Math.pow(d - avgDev, 2), 0) / deviations.length,
    );

    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);

    const totalOutliers = symbolData.reduce((sum, d) => sum + d.outlierProtocols.length, 0);
    const outlierDataPoints = symbolData.filter((d) => d.outlierProtocols.length > 0).length;

    const protocolCounts: Record<string, number> = {};
    symbolData.forEach((d) => {
      d.protocols.forEach((p) => {
        protocolCounts[p] = (protocolCounts[p] || 0) + 1;
      });
    });

    const sortedProtocols = Object.entries(protocolCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      avgDev,
      maxDev,
      minDev,
      stdDev,
      avgPrice,
      maxPrice,
      minPrice,
      totalOutliers,
      outlierDataPoints,
      dataPointsCount: symbolData.length,
      sortedProtocols,
      outlierRatio: outlierDataPoints / symbolData.length,
    };
  }, [symbolData]);

  if (!selectedTrend) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <TrendingUp className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p className="text-muted-foreground">{t('common.selectSymbol')}</p>
        </CardContent>
      </Card>
    );
  }

  const severity = getSeverityLevel(selectedTrend.anomalyScore);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {selectedTrend.symbol} {t('analytics.deviation.trends.details')}
          </CardTitle>
          <CardDescription>{t('analytics.deviation.trends.analysisPeriod')}</CardDescription>
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
            <div className={cn('rounded-lg p-3', severity.bgColor)}>
              <p className="text-xs text-muted-foreground">{t('common.anomalyScore')}</p>
              <p className={cn('text-lg font-bold', severity.color)}>
                {(selectedTrend.anomalyScore * 100).toFixed(1)}%
              </p>
              <p className={cn('text-xs', severity.color)}>
                {t(`common.severity.${severity.label}`)}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-muted-foreground">{t('common.avgDeviation')}</p>
              <p className="text-lg font-bold">{(selectedTrend.avgDeviation * 100).toFixed(2)}%</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-muted-foreground">{t('common.maxDeviation')}</p>
              <p className="text-lg font-bold">{(selectedTrend.maxDeviation * 100).toFixed(2)}%</p>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-800">{t('common.recommendation')}</p>
            <p className="mt-1 text-sm text-blue-700">{selectedTrend.recommendation}</p>
          </div>
        </CardContent>
      </Card>

      {enhancedStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart2 className="h-4 w-4" />
              {t('analytics.deviation.trends.detailedStats')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Activity className="h-3 w-3" />
                  {t('common.dataPoints')}
                </div>
                <p className="text-lg font-semibold">{enhancedStats.dataPointsCount}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <AlertTriangle className="h-3 w-3" />
                  {t('common.outliers')}
                </div>
                <p className="text-lg font-semibold text-red-500">{enhancedStats.totalOutliers}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {t('common.outlierRatio')}
                </div>
                <p className="text-lg font-semibold">
                  {(enhancedStats.outlierRatio * 100).toFixed(1)}%
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <BarChart2 className="h-3 w-3" />
                  {t('common.stdDeviation')}
                </div>
                <p className="text-lg font-semibold">{(enhancedStats.stdDev * 100).toFixed(3)}%</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  {t('common.deviationRange')}
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('common.min')}</p>
                    <p className="font-semibold text-green-600">
                      {(enhancedStats.minDev * 100).toFixed(2)}%
                    </p>
                  </div>
                  <div className="mx-3 h-2 flex-1 rounded bg-gradient-to-r from-green-200 via-yellow-200 to-red-200" />
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{t('common.max')}</p>
                    <p className="font-semibold text-red-600">
                      {(enhancedStats.maxDev * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  {t('common.priceRange')}
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('common.low')}</p>
                    <p className="font-semibold">${enhancedStats.minPrice.toFixed(4)}</p>
                  </div>
                  <div className="mx-3 h-2 flex-1 rounded bg-gradient-to-r from-blue-200 to-purple-200" />
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{t('common.high')}</p>
                    <p className="font-semibold">${enhancedStats.maxPrice.toFixed(4)}</p>
                  </div>
                </div>
              </div>
            </div>

            {enhancedStats.sortedProtocols.length > 0 && (
              <div className="rounded-lg border p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  {t('common.topProtocols')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {enhancedStats.sortedProtocols.map(([protocol, count]) => (
                    <Badge key={protocol} variant="secondary" className="gap-1">
                      <span className="capitalize">{protocol}</span>
                      <span className="text-xs text-muted-foreground">({count})</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg bg-amber-50 p-3">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 text-amber-600" />
                <div className="text-xs text-amber-800">
                  <p className="font-medium">
                    {t('common.volatility')}: {(selectedTrend.volatility * 100).toFixed(2)}%
                  </p>
                  <p className="mt-1 text-amber-700">
                    {selectedTrend.volatility > 0.02
                      ? t('analytics.deviation.trends.highVolatilityWarning')
                      : t('analytics.deviation.trends.normalVolatility')}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {symbolData.length > 0 && <DeviationTrendChart dataPoints={symbolData} />}
    </div>
  );
}
