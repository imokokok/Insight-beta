'use client';

import { useMemo, useState } from 'react';

import { TrendingUp, X, AlertTriangle, Clock, DollarSign } from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
  Dot,
} from 'recharts';

import { Button } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { useIsMobile } from '@/hooks';
import { useI18n } from '@/i18n';

import type { PriceDeviationPoint } from '../types/deviation';

interface DeviationTrendChartProps {
  dataPoints: PriceDeviationPoint[];
}

interface ChartDataItem {
  time: string;
  fullTime: string;
  timestamp: string;
  symbol: string;
  deviation: number;
  avgPrice: number;
  medianPrice: number;
  outlierCount: number;
  protocols: string[];
  outlierProtocols: string[];
  prices: Record<string, number>;
}

interface DataPointDetail {
  data: ChartDataItem;
  position: { x: number; y: number };
}

function getDeviationColor(deviation: number): string {
  const absDeviation = Math.abs(deviation);
  if (absDeviation >= 5) return '#dc2626';
  if (absDeviation >= 2) return '#ea580c';
  if (absDeviation >= 1) return '#f97316';
  return '#22c55e';
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartDataItem; x?: number; y?: number }>;
  t: (key: string) => string;
  onDetailClick?: (data: ChartDataItem, x: number, y: number) => void;
  isMobile?: boolean;
  onClose?: () => void;
}

function CustomTooltip({
  active,
  payload,
  t,
  onDetailClick,
  isMobile,
  onClose,
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;
  const x = payload[0]?.x ?? 0;
  const y = payload[0]?.y ?? 0;
  const deviationColor = getDeviationColor(data.deviation ?? 0);

  if (isMobile) {
    return (
      <div className="fixed inset-x-4 bottom-4 z-50 rounded-xl border bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-gray-500">{data.fullTime}</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <span className="text-2xl font-bold" style={{ color: deviationColor }}>
            {data.deviation.toFixed(2)}%
          </span>
          {data.outlierCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs text-red-500">
              <AlertTriangle className="h-3 w-3" />
              {data.outlierCount}
            </span>
          )}
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-gray-50 p-2">
            <p className="text-xs text-gray-500">{t('common.avgPrice')}</p>
            <p className="font-semibold">${data.avgPrice.toFixed(4)}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-2">
            <p className="text-xs text-gray-500">{t('common.medianPrice')}</p>
            <p className="font-semibold">${data.medianPrice.toFixed(4)}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-11 w-full text-sm"
          onClick={() => onDetailClick?.(data, x, y)}
        >
          {t('common.viewDetails')}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-xs text-gray-500">{data.fullTime}</span>
        {data.outlierCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-red-500">
            <AlertTriangle className="h-3 w-3" />
            {data.outlierCount} {t('common.anomalies')}
          </span>
        )}
      </div>
      <div className="mb-2 text-lg font-bold" style={{ color: deviationColor }}>
        {data.deviation.toFixed(2)}%
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-8">
          <span className="flex items-center gap-1 text-gray-500">
            <DollarSign className="h-3 w-3" />
            {t('common.avgPrice')}
          </span>
          <span className="font-medium text-gray-700">${data.avgPrice.toFixed(4)}</span>
        </div>
        <div className="flex justify-between gap-8">
          <span className="flex items-center gap-1 text-gray-500">
            <Clock className="h-3 w-3" />
            {t('common.medianPrice')}
          </span>
          <span className="font-medium text-gray-700">${data.medianPrice.toFixed(4)}</span>
        </div>
        <div className="flex justify-between gap-8">
          <span className="text-gray-500">{t('common.protocols')}</span>
          <span className="font-medium text-gray-700">{data.protocols.length}</span>
        </div>
      </div>
      <div className="mt-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-full text-xs"
          onClick={() => onDetailClick?.(data, x, y)}
        >
          {t('common.viewDetails')}
        </Button>
      </div>
    </div>
  );
}

interface DetailModalProps {
  detail: DataPointDetail | null;
  onClose: () => void;
  t: (key: string) => string;
}

function DetailModal({ detail, onClose, t }: DetailModalProps) {
  if (!detail) return null;

  const { data } = detail;
  const deviationColor = getDeviationColor(data.deviation);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="font-semibold">{t('analytics.deviation.anomalies.details')}</h3>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-gray-500">{data.fullTime}</span>
            <span
              className="rounded px-2 py-1 text-sm font-medium"
              style={{ backgroundColor: `${deviationColor}20`, color: deviationColor }}
            >
              {data.deviation.toFixed(2)}%
            </span>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-xs text-gray-500">{t('common.avgPrice')}</div>
              <div className="text-lg font-semibold">${data.avgPrice.toFixed(6)}</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-xs text-gray-500">{t('common.medianPrice')}</div>
              <div className="text-lg font-semibold">${data.medianPrice.toFixed(6)}</div>
            </div>
          </div>

          {data.outlierProtocols.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 text-sm font-medium text-red-600">
                {t('common.outlierProtocols')} ({data.outlierProtocols.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {data.outlierProtocols.map((protocol) => (
                  <span
                    key={protocol}
                    className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700"
                  >
                    {protocol}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 text-sm font-medium text-gray-700">
              {t('common.protocolPrices')}
            </div>
            <div className="max-h-40 space-y-1 overflow-auto">
              {Object.entries(data.prices).map(([protocol, price]) => {
                const isOutlier = data.outlierProtocols.includes(protocol);
                const priceDiff = ((price - data.avgPrice) / data.avgPrice) * 100;
                return (
                  <div
                    key={protocol}
                    className={`flex items-center justify-between rounded p-2 text-sm ${
                      isOutlier ? 'bg-red-50' : 'bg-gray-50'
                    }`}
                  >
                    <span className={isOutlier ? 'font-medium text-red-600' : ''}>{protocol}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">${price.toFixed(6)}</span>
                      <span
                        className={`text-xs ${priceDiff > 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {priceDiff > 0 ? '+' : ''}
                        {priceDiff.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DeviationTrendChart({ dataPoints }: DeviationTrendChartProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [detailModal, setDetailModal] = useState<DataPointDetail | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const data = useMemo<ChartDataItem[]>(
    () =>
      dataPoints
        .slice()
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map((d) => ({
          time: new Date(d.timestamp).toLocaleTimeString(),
          fullTime: new Date(d.timestamp).toLocaleString(),
          timestamp: d.timestamp,
          symbol: d.symbol,
          deviation: d.maxDeviationPercent * 100,
          avgPrice: d.avgPrice,
          medianPrice: d.medianPrice,
          outlierCount: d.outlierProtocols.length,
          protocols: d.protocols,
          outlierProtocols: d.outlierProtocols,
          prices: d.prices,
        })),
    [dataPoints],
  );

  const handleDetailClick = (data: ChartDataItem, x: number, y: number) => {
    setDetailModal({ data, position: { x, y } });
  };

  const handleCloseModal = () => {
    setDetailModal(null);
  };

  const handleCloseTooltip = () => {
    setActiveIndex(null);
  };

  const mobileData = activeIndex !== null ? data[activeIndex] : null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('analytics.deviation.chart.deviationTrend')}
          </CardTitle>
          <CardDescription>{t('analytics.deviation.chart.deviationDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="deviationGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: isMobile ? 9 : 11 }}
                  interval="preserveStartEnd"
                  minTickGap={isMobile ? 30 : 50}
                />
                <YAxis
                  tick={{ fontSize: isMobile ? 10 : 12 }}
                  unit="%"
                  width={isMobile ? 30 : 40}
                />
                <Tooltip
                  content={
                    isMobile ? (
                      <CustomTooltip
                        t={t}
                        onDetailClick={handleDetailClick}
                        isMobile={isMobile}
                        onClose={handleCloseTooltip}
                      />
                    ) : (
                      <CustomTooltip t={t} onDetailClick={handleDetailClick} />
                    )
                  }
                  trigger={isMobile ? 'click' : 'hover'}
                />
                <ReferenceLine y={2} stroke="#ea580c" strokeDasharray="5 5" />
                <ReferenceLine y={5} stroke="#dc2626" strokeDasharray="5 5" />
                <Area
                  type="monotone"
                  dataKey="deviation"
                  stroke="#f97316"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#deviationGradient)"
                  dot={({ cx, cy, payload, index }) => {
                    const color = getDeviationColor(payload.deviation);
                    const hasOutliers = payload.outlierCount > 0;
                    return (
                      <Dot
                        cx={cx}
                        cy={cy}
                        r={hasOutliers ? (isMobile ? 6 : 5) : isMobile ? 4 : 3}
                        fill={color}
                        stroke={hasOutliers ? '#fff' : 'none'}
                        strokeWidth={hasOutliers ? 2 : 0}
                        className="cursor-pointer transition-all"
                        onClick={isMobile ? () => setActiveIndex(index) : undefined}
                      />
                    );
                  }}
                  activeDot={({ cx, cy, payload }) => (
                    <Dot
                      cx={cx}
                      cy={cy}
                      r={isMobile ? 8 : 6}
                      fill={getDeviationColor(payload.deviation)}
                      stroke="#fff"
                      strokeWidth={2}
                      className="cursor-pointer"
                    />
                  )}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground sm:gap-4">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span>{'< 1%'}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-orange-500" />
              <span>1% - 2%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-orange-600" />
              <span>2% - 5%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-red-600" />
              <span>{'> 5%'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      {isMobile && mobileData && (
        <CustomTooltip
          active={true}
          payload={[{ payload: mobileData }]}
          t={t}
          onDetailClick={handleDetailClick}
          isMobile={isMobile}
          onClose={handleCloseTooltip}
        />
      )}
      <DetailModal detail={detailModal} onClose={handleCloseModal} t={t} />
    </>
  );
}
