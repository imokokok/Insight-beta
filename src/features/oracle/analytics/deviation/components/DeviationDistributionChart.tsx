'use client';

import { useMemo, useState } from 'react';

import { BarChart3, ZoomIn, ZoomOut, X } from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Brush,
  ReferenceLine,
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useIsMobile } from '@/hooks';
import { useI18n } from '@/i18n';

import type { DeviationTrend } from '../types/deviation';

interface DeviationDistributionChartProps {
  trends: DeviationTrend[];
}

interface ChartDataItem {
  symbol: string;
  deviation: number;
  avgDeviation: number;
  maxDeviation: number;
  trendDirection: string;
  volatility: number;
  anomalyScore: number;
  rank: number;
}

function getDeviationLevel(
  deviation: number,
  t: (key: string) => string,
): { level: string; color: string } {
  const absDeviation = Math.abs(deviation);
  if (absDeviation >= 5) return { level: t('common.critical'), color: '#dc2626' };
  if (absDeviation >= 2) return { level: t('common.high'), color: '#ea580c' };
  if (absDeviation >= 1) return { level: t('common.medium'), color: '#f97316' };
  return { level: t('common.low'), color: '#22c55e' };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartDataItem }>;
  t: (key: string) => string;
  isMobile?: boolean;
  onClose?: () => void;
}

function CustomTooltip({ active, payload, t, isMobile, onClose }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;
  const deviationLevel = getDeviationLevel(data.deviation ?? 0, t);

  if (isMobile) {
    return (
      <div className="fixed inset-x-4 bottom-4 z-50 rounded-xl border bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-semibold text-gray-900">{data.symbol}</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <span
            className="rounded px-3 py-1 text-sm font-medium text-white"
            style={{ backgroundColor: deviationLevel.color }}
          >
            {deviationLevel.level}
          </span>
          <span className="text-2xl font-bold" style={{ color: deviationLevel.color }}>
            {data.deviation.toFixed(2)}%
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-gray-50 p-2">
            <p className="text-xs text-gray-500">{t('common.maxDeviation')}</p>
            <p className="font-semibold">{data.maxDeviation.toFixed(2)}%</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-2">
            <p className="text-xs text-gray-500">{t('analytics.deviation.trends.volatility')}</p>
            <p className="font-semibold">{data.volatility.toFixed(4)}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="font-semibold text-gray-900">{data.symbol}</span>
        <span
          className="rounded px-2 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: deviationLevel.color }}
        >
          {deviationLevel.level}
        </span>
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-8">
          <span className="text-gray-500">{t('common.avgDeviation')}</span>
          <span className="font-medium" style={{ color: deviationLevel.color }}>
            {data.deviation.toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between gap-8">
          <span className="text-gray-500">{t('common.maxDeviation')}</span>
          <span className="font-medium text-gray-700">{data.maxDeviation.toFixed(2)}%</span>
        </div>
        <div className="flex justify-between gap-8">
          <span className="text-gray-500">{t('analytics.deviation.trends.volatility')}</span>
          <span className="font-medium text-gray-700">{data.volatility.toFixed(4)}</span>
        </div>
        <div className="flex justify-between gap-8">
          <span className="text-gray-500">{t('common.trend')}</span>
          <span className="font-medium text-gray-700">{data.trendDirection}</span>
        </div>
        <div className="flex justify-between gap-8">
          <span className="text-gray-500">{t('common.rank')}</span>
          <span className="font-medium text-gray-700">#{data.rank}</span>
        </div>
      </div>
    </div>
  );
}

export function DeviationDistributionChart({ trends }: DeviationDistributionChartProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [brushRange, setBrushRange] = useState<{ startIndex: number; endIndex: number } | null>(
    null,
  );
  const [showBrush, setShowBrush] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const data = useMemo<ChartDataItem[]>(() => {
    const sorted = trends.slice(0, 20).sort((a, b) => b.avgDeviation - a.avgDeviation);

    return sorted.map((item, index) => ({
      symbol: item.symbol,
      deviation: item.avgDeviation * 100,
      avgDeviation: item.avgDeviation * 100,
      maxDeviation: item.maxDeviation * 100,
      trendDirection: item.trendDirection,
      volatility: item.volatility,
      anomalyScore: item.anomalyScore,
      rank: index + 1,
    }));
  }, [trends]);

  const displayData = useMemo(() => {
    if (!brushRange) return data;
    return data.slice(brushRange.startIndex, brushRange.endIndex + 1);
  }, [data, brushRange]);

  const handleBrushChange = (range: { startIndex?: number; endIndex?: number }) => {
    if (range.startIndex !== undefined && range.endIndex !== undefined) {
      setBrushRange({ startIndex: range.startIndex, endIndex: range.endIndex });
    }
  };

  const handleZoomIn = () => {
    setShowBrush(true);
  };

  const handleZoomOut = () => {
    setShowBrush(false);
    setBrushRange(null);
  };

  const handleReset = () => {
    setBrushRange(null);
    setShowBrush(false);
  };

  const handleCloseTooltip = () => {
    setActiveIndex(null);
  };

  const mobileData = activeIndex !== null ? data[activeIndex] : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t('analytics.deviation.chart.deviationDistribution')}
            </CardTitle>
            <CardDescription>
              {t('analytics.deviation.chart.deviationDistributionDesc')}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            {!showBrush ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                className="h-10 min-w-11 px-3 sm:h-8 sm:min-w-0 sm:px-2"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomOut}
                  className="h-10 min-w-11 px-3 sm:h-8 sm:min-w-0 sm:px-2"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="h-10 px-3 text-xs sm:h-8 sm:px-2"
                >
                  {t('common.reset')}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="15%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="symbol"
                tick={{ fontSize: isMobile ? 9 : 11 }}
                angle={-45}
                textAnchor="end"
                height={isMobile ? 60 : 80}
                interval={isMobile ? 1 : 0}
              />
              <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} unit="%" width={isMobile ? 30 : 40} />
              <Tooltip
                content={
                  isMobile ? (
                    <CustomTooltip t={t} isMobile={isMobile} onClose={handleCloseTooltip} />
                  ) : (
                    <CustomTooltip t={t} />
                  )
                }
                trigger={isMobile ? 'click' : 'hover'}
              />
              <ReferenceLine
                y={2}
                stroke="#ea580c"
                strokeDasharray="5 5"
                label={{ value: '2%', position: 'right', fontSize: 10 }}
              />
              <ReferenceLine
                y={5}
                stroke="#dc2626"
                strokeDasharray="5 5"
                label={{ value: '5%', position: 'right', fontSize: 10 }}
              />
              <Bar dataKey="deviation" fill="#f97316" radius={[4, 4, 0, 0]} minPointSize={3}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.deviation > 5 ? '#dc2626' : entry.deviation > 2 ? '#ea580c' : '#f97316'
                    }
                    className="cursor-pointer transition-opacity hover:opacity-80"
                    onClick={isMobile ? () => setActiveIndex(index) : undefined}
                  />
                ))}
              </Bar>
              {showBrush && !isMobile && (
                <Brush
                  dataKey="symbol"
                  height={30}
                  stroke="#f97316"
                  fill="#fff7ed"
                  onChange={handleBrushChange}
                  travellerWidth={10}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
        {brushRange && (
          <div className="mt-2 text-center text-xs text-muted-foreground">
            {t('common.showing')} {displayData.length} {t('common.of')} {data.length}{' '}
            {t('common.items')}
          </div>
        )}
        {isMobile && mobileData && (
          <CustomTooltip
            active={true}
            payload={[{ payload: mobileData }]}
            t={t}
            isMobile={isMobile}
            onClose={handleCloseTooltip}
          />
        )}
      </CardContent>
    </Card>
  );
}
