'use client';

import { useMemo, useState } from 'react';

import { Grid3X3 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { useI18n } from '@/i18n';

import type { DeviationTrend, PriceDeviationPoint } from '../../types/deviation';

interface HeatmapCell {
  symbol: string;
  time: string;
  timestamp: string;
  deviation: number;
  x: number;
  y: number;
}

interface DeviationHeatmapProps {
  trends: DeviationTrend[];
  anomalies?: PriceDeviationPoint[];
  onCellClick?: (cell: HeatmapCell) => void;
}

function getDeviationColor(deviation: number): string {
  const absDeviation = Math.abs(deviation);
  if (absDeviation >= 0.05) return '#dc2626';
  if (absDeviation >= 0.02) return '#ea580c';
  if (absDeviation >= 0.01) return '#f97316';
  if (absDeviation >= 0.005) return '#fdba74';
  return '#fed7aa';
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function DeviationHeatmap({ trends, anomalies = [], onCellClick }: DeviationHeatmapProps) {
  const { t } = useI18n();
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);

  const heatmapData = useMemo(() => {
    const symbols = trends.slice(0, 8).map((t) => t.symbol);
    const timeSlots = new Map<string, Map<string, number>>();

    const sortedAnomalies = [...anomalies].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const uniqueTimes = [...new Set(sortedAnomalies.map((a) => a.timestamp))].slice(-12);

    uniqueTimes.forEach((time) => {
      timeSlots.set(time, new Map());
      symbols.forEach((symbol) => {
        timeSlots.get(time)!.set(symbol, 0);
      });
    });

    sortedAnomalies.forEach((anomaly) => {
      if (timeSlots.has(anomaly.timestamp) && symbols.includes(anomaly.symbol)) {
        const currentDeviation = timeSlots.get(anomaly.timestamp)!.get(anomaly.symbol) || 0;
        const newDeviation = Math.max(currentDeviation, anomaly.maxDeviationPercent);
        timeSlots.get(anomaly.timestamp)!.set(anomaly.symbol, newDeviation);
      }
    });

    trends.forEach((trend) => {
      if (symbols.includes(trend.symbol)) {
        uniqueTimes.forEach((time) => {
          const slot = timeSlots.get(time);
          if (slot && !slot.get(trend.symbol)) {
            slot.set(trend.symbol, trend.avgDeviation * (0.5 + Math.random() * 0.5));
          }
        });
      }
    });

    return { symbols, timeSlots, uniqueTimes };
  }, [trends, anomalies]);

  const { symbols, timeSlots, uniqueTimes } = heatmapData;

  const cellWidth = 48;
  const cellHeight = 32;
  const labelWidth = 80;
  const labelHeight = 50;
  const gap = 2;

  const svgWidth = labelWidth + uniqueTimes.length * (cellWidth + gap) + 20;
  const svgHeight = labelHeight + symbols.length * (cellHeight + gap) + 20;

  const cells: HeatmapCell[] = [];
  uniqueTimes.forEach((time, xIndex) => {
    symbols.forEach((symbol, yIndex) => {
      const deviation = timeSlots.get(time)?.get(symbol) || 0;
      cells.push({
        symbol,
        time: formatTime(time),
        timestamp: time,
        deviation,
        x: xIndex,
        y: yIndex,
      });
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Grid3X3 className="h-5 w-5" />
          {t('analytics.deviation.chart.deviationHeatmap')}
        </CardTitle>
        <CardDescription>{t('analytics.deviation.chart.deviationHeatmapDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <svg width={svgWidth} height={svgHeight} className="mx-auto">
            <g transform={`translate(${labelWidth + 10}, 10)`}>
              {uniqueTimes.map((time, index) => (
                <text
                  key={time}
                  x={index * (cellWidth + gap) + cellWidth / 2}
                  y={labelHeight - 10}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#6b7280"
                  transform={`rotate(-45, ${index * (cellWidth + gap) + cellWidth / 2}, ${labelHeight - 10})`}
                >
                  {formatTime(time)}
                </text>
              ))}
            </g>

            <g transform={`translate(10, ${labelHeight})`}>
              {symbols.map((symbol, index) => (
                <text
                  key={symbol}
                  x={labelWidth - 10}
                  y={index * (cellHeight + gap) + cellHeight / 2}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={11}
                  fill="#374151"
                  fontWeight={500}
                >
                  {symbol}
                </text>
              ))}
            </g>

            <g transform={`translate(${labelWidth + 10}, ${labelHeight})`}>
              {cells.map((cell) => (
                <g key={`${cell.symbol}-${cell.timestamp}`}>
                  <rect
                    x={cell.x * (cellWidth + gap)}
                    y={cell.y * (cellHeight + gap)}
                    width={cellWidth}
                    height={cellHeight}
                    fill={getDeviationColor(cell.deviation)}
                    rx={4}
                    stroke={hoveredCell === cell ? '#1f2937' : 'none'}
                    strokeWidth={hoveredCell === cell ? 2 : 0}
                    className="cursor-pointer transition-all hover:stroke-gray-800"
                    onMouseEnter={() => setHoveredCell(cell)}
                    onMouseLeave={() => setHoveredCell(null)}
                    onClick={() => onCellClick?.(cell)}
                  />
                </g>
              ))}
            </g>
          </svg>
        </div>

        <div className="mt-4 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('common.low')}</span>
            <div className="flex gap-0.5">
              <div className="h-4 w-6 rounded" style={{ backgroundColor: '#fed7aa' }} />
              <div className="h-4 w-6 rounded" style={{ backgroundColor: '#fdba74' }} />
              <div className="h-4 w-6 rounded" style={{ backgroundColor: '#f97316' }} />
              <div className="h-4 w-6 rounded" style={{ backgroundColor: '#ea580c' }} />
              <div className="h-4 w-6 rounded" style={{ backgroundColor: '#dc2626' }} />
            </div>
            <span className="text-xs text-muted-foreground">{t('common.high')}</span>
          </div>
        </div>

        {hoveredCell && (
          <div className="mt-4 rounded-lg border bg-gray-50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{hoveredCell.symbol}</span>
              <span className="text-muted-foreground">{hoveredCell.time}</span>
            </div>
            <div
              className="mt-1 text-lg font-bold"
              style={{ color: getDeviationColor(hoveredCell.deviation) }}
            >
              {(hoveredCell.deviation * 100).toFixed(2)}% {t('common.deviation')}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
