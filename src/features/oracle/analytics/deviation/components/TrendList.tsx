'use client';

import { useState, useMemo } from 'react';

import { ChevronRight, ChevronDown, ChevronUp, BarChart3, AlertTriangle, Clock, DollarSign } from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Dot,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

import { DeviationSeverityBadge } from './DeviationSeverityBadge';
import { TrendDirectionBadge } from './TrendDirectionBadge';

import type { DeviationTrend, PriceDeviationPoint } from '../types/deviation';

interface TrendListProps {
  trends: DeviationTrend[];
  isLoading: boolean;
  onSelect: (trend: DeviationTrend) => void;
  symbolDataMap?: Record<string, PriceDeviationPoint[]>;
}

function getDeviationColor(deviation: number): string {
  const absDeviation = Math.abs(deviation);
  if (absDeviation >= 5) return '#dc2626';
  if (absDeviation >= 2) return '#ea580c';
  if (absDeviation >= 1) return '#f97316';
  return '#22c55e';
}

interface MiniChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { time: string; deviation: number; avgPrice: number } }>;
}

function MiniChartTooltip({ active, payload }: MiniChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div className="rounded border bg-white px-2 py-1 text-xs shadow">
      <div className="font-medium">{data.time}</div>
      <div className="text-orange-600">{data.deviation.toFixed(2)}%</div>
    </div>
  );
}

function TrendExpandableContent({ dataPoints, t }: { dataPoints: PriceDeviationPoint[]; t: (key: string) => string }) {
  const isMobile = useIsMobile();
  
  const chartData = useMemo(() =>
    dataPoints
      .slice()
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((d) => ({
        time: new Date(d.timestamp).toLocaleTimeString(),
        fullTime: new Date(d.timestamp).toLocaleString(),
        timestamp: d.timestamp,
        deviation: d.maxDeviationPercent * 100,
        avgPrice: d.avgPrice,
        medianPrice: d.medianPrice,
        outlierCount: d.outlierProtocols.length,
        symbol: d.symbol,
        prices: d.prices,
        outlierProtocols: d.outlierProtocols,
      })),
    [dataPoints]
  );

  const stats = useMemo(() => {
    if (dataPoints.length === 0) return null;
    const deviations = dataPoints.map((d) => d.maxDeviationPercent);
    const avgDev = deviations.reduce((a, b) => a + b, 0) / deviations.length;
    const maxDev = Math.max(...deviations);
    const minDev = Math.min(...deviations);
    const outlierCount = dataPoints.reduce((sum, d) => sum + d.outlierProtocols.length, 0);
    return { avgDev, maxDev, minDev, outlierCount, dataPointsCount: dataPoints.length };
  }, [dataPoints]);

  if (dataPoints.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        {t('analytics:deviation.trends.noData')}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4 border-t pt-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-gray-50 p-2 sm:p-3">
          <p className="text-xs text-muted-foreground">{t('common.dataPoints')}</p>
          <p className="text-base font-semibold sm:text-lg">{stats?.dataPointsCount ?? 0}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-2 sm:p-3">
          <p className="text-xs text-muted-foreground">{t('common.avgDeviation')}</p>
          <p className="text-base font-semibold sm:text-lg">{((stats?.avgDev ?? 0) * 100).toFixed(2)}%</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-2 sm:p-3">
          <p className="text-xs text-muted-foreground">{t('common.maxDeviation')}</p>
          <p className="text-base font-semibold sm:text-lg">{((stats?.maxDev ?? 0) * 100).toFixed(2)}%</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-2 sm:p-3">
          <p className="text-xs text-muted-foreground">{t('common.outliers')}</p>
          <p className="text-base font-semibold text-red-500 sm:text-lg">{stats?.outlierCount ?? 0}</p>
        </div>
      </div>

      <div className="h-28 sm:h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="miniDeviationGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="time" tick={{ fontSize: isMobile ? 8 : 10 }} interval="preserveStartEnd" minTickGap={isMobile ? 20 : 30} />
            <YAxis tick={{ fontSize: isMobile ? 8 : 10 }} unit="%" width={isMobile ? 28 : 35} />
            <Tooltip content={<MiniChartTooltip />} />
            <Area
              type="monotone"
              dataKey="deviation"
              stroke="#f97316"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#miniDeviationGradient)"
              dot={({ cx, cy, payload }) => {
                const color = getDeviationColor(payload.deviation);
                const hasOutliers = payload.outlierCount > 0;
                return (
                  <Dot
                    cx={cx}
                    cy={cy}
                    r={hasOutliers ? (isMobile ? 4 : 3) : (isMobile ? 3 : 2)}
                    fill={color}
                    stroke={hasOutliers ? '#fff' : 'none'}
                    strokeWidth={hasOutliers ? 1 : 0}
                  />
                );
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="max-h-40 space-y-1 overflow-auto">
        {chartData.slice(-5).reverse().map((point) => (
          <div
            key={point.timestamp}
            className={cn(
              'flex items-center justify-between rounded p-2 text-xs',
              point.outlierCount > 0 ? 'bg-red-50' : 'bg-gray-50'
            )}
          >
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">{point.fullTime}</span>
              {point.outlierCount > 0 && (
                <Badge variant="outline" className="border-red-500 text-red-500 text-[10px]">
                  <AlertTriangle className="mr-1 h-2 w-2" />
                  {point.outlierCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="hidden items-center gap-1 sm:flex">
                <DollarSign className="h-3 w-3 text-muted-foreground" />
                {point.avgPrice.toFixed(4)}
              </span>
              <span
                className="font-medium"
                style={{ color: getDeviationColor(point.deviation) }}
              >
                {point.deviation.toFixed(2)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrendList({ trends, isLoading, onSelect, symbolDataMap }: TrendListProps) {
  const { t } = useI18n();
  const [expandedTrends, setExpandedTrends] = useState<Set<string>>(new Set());

  const toggleExpand = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTrends((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <div className="py-12 text-center">
        <BarChart3 className="mx-auto mb-4 h-16 w-16 text-orange-500" />
        <h3 className="text-lg font-semibold">{t('analytics:deviation.trends.empty')}</h3>
        <p className="mt-1 text-muted-foreground">{t('analytics:deviation.trends.emptyDescription')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {trends.map((trend) => {
        const isExpanded = expandedTrends.has(trend.symbol);
        const dataPoints = symbolDataMap?.[trend.symbol] ?? [];

        return (
          <div
            key={trend.symbol}
            className="rounded-lg border transition-all hover:border-orange-500 hover:shadow-md"
          >
            <button
              type="button"
              onClick={() => onSelect(trend)}
              className="group w-full cursor-pointer p-3 text-left sm:p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="font-semibold">{trend.symbol}</span>
                    <TrendDirectionBadge
                      direction={trend.trendDirection}
                      strength={trend.trendStrength}
                    />
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{trend.recommendation}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 sm:gap-4">
                    <span>{t('analytics:deviation.trends.avgDeviation')}: {(trend.avgDeviation * 100).toFixed(2)}%</span>
                    <span className="hidden sm:inline">{t('analytics:deviation.trends.max')}: {(trend.maxDeviation * 100).toFixed(2)}%</span>
                    <span className="hidden sm:inline">{t('analytics:deviation.trends.volatility')}: {(trend.volatility * 100).toFixed(2)}%</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 sm:gap-2">
                  <DeviationSeverityBadge deviation={trend.avgDeviation} />
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </button>

            {dataPoints.length > 0 && (
              <div className="border-t px-3 pb-2 sm:px-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-full text-xs text-muted-foreground sm:h-8"
                  onClick={(e) => toggleExpand(trend.symbol, e)}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="mr-1 h-4 w-4" />
                      {t('common.collapse')}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-1 h-4 w-4" />
                      {t('common.expandDetails')} ({dataPoints.length} {t('common.dataPoints')})
                    </>
                  )}
                </Button>
              </div>
            )}

            {isExpanded && dataPoints.length > 0 && (
              <div className="border-t bg-gray-50/50 px-3 pb-4 sm:px-4">
                <TrendExpandableContent dataPoints={dataPoints} t={t} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
