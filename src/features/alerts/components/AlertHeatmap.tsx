'use client';

import { useMemo, useState } from 'react';

import { Grid3X3, Info } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useI18n } from '@/i18n/LanguageProvider';
import { cn } from '@/shared/utils';

import type { AlertHeatmapCell } from '../hooks/useAlertHistory';
import type { AlertSource, AlertSeverity } from '../types';

interface AlertHeatmapProps {
  data: AlertHeatmapCell[];
  loading?: boolean;
  className?: string;
}

const sourceLabels: Record<AlertSource, string> = {
  price_anomaly: 'Price Anomaly',
  cross_chain: 'Cross Chain',
  security: 'Security',
};

const severityColors: Record<AlertSeverity, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#f97316',
  low: '#fdba74',
  info: '#93c5fd',
  warning: '#fcd34d',
  emergency: '#7f1d1d',
};

function getCellColor(count: number, severity: AlertSeverity): string {
  if (count === 0) return '#f3f4f6';
  return severityColors[severity] || '#fdba74';
}

function getCellOpacity(count: number): number {
  if (count === 0) return 0.3;
  return Math.min(0.4 + count * 0.15, 1);
}

export function AlertHeatmap({ data, loading, className }: AlertHeatmapProps) {
  const { t } = useI18n();
  const [hoveredCell, setHoveredCell] = useState<AlertHeatmapCell | null>(null);

  const heatmapGrid = useMemo(() => {
    const sources: AlertSource[] = ['price_anomaly', 'cross_chain', 'security'];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    const grid: Map<string, AlertHeatmapCell> = new Map();

    data.forEach((cell) => {
      const key = `${cell.source}-${cell.hour}`;
      const existing = grid.get(key);
      if (existing) {
        existing.count += cell.count;
        if (
          cell.severity === 'critical' ||
          (existing.severity !== 'critical' && cell.severity === 'high')
        ) {
          existing.severity = cell.severity;
        }
      } else {
        grid.set(key, { ...cell });
      }
    });

    return { sources, hours, grid };
  }, [data]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-2 h-4 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const { sources, hours, grid } = heatmapGrid;
  const cellWidth = 28;
  const cellHeight = 32;
  const labelWidth = 100;
  const labelHeight = 30;
  const gap = 2;

  const svgWidth = labelWidth + hours.length * (cellWidth + gap) + 20;
  const svgHeight = labelHeight + sources.length * (cellHeight + gap) + 20;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5" />
              {t('alerts.analysis.heatmap')}
            </CardTitle>
            <CardDescription>{t('alerts.analysis.heatmapDesc')}</CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 cursor-help text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">{t('alerts.analysis.heatmapTooltip')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <svg width={svgWidth} height={svgHeight} className="mx-auto">
            <g transform={`translate(${labelWidth + 10}, 10)`}>
              {hours
                .filter((_, i) => i % 3 === 0)
                .map((hour) => (
                  <text
                    key={hour}
                    x={hour * (cellWidth + gap) + cellWidth / 2}
                    y={labelHeight - 10}
                    textAnchor="middle"
                    fontSize={10}
                    fill="#6b7280"
                  >
                    {hour}:00
                  </text>
                ))}
            </g>

            <g transform={`translate(10, ${labelHeight})`}>
              {sources.map((source, index) => (
                <text
                  key={source}
                  x={labelWidth - 10}
                  y={index * (cellHeight + gap) + cellHeight / 2}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={11}
                  fill="#374151"
                  fontWeight={500}
                >
                  {sourceLabels[source]}
                </text>
              ))}
            </g>

            <g transform={`translate(${labelWidth + 10}, ${labelHeight})`}>
              <TooltipProvider>
                {sources.map((source, yIndex) =>
                  hours.map((hour, xIndex) => {
                    const key = `${source}-${hour}`;
                    const cell = grid.get(key);
                    const count = cell?.count || 0;
                    const severity = cell?.severity || 'low';
                    const color = getCellColor(count, severity);
                    const opacity = getCellOpacity(count);

                    return (
                      <Tooltip key={key}>
                        <TooltipTrigger asChild>
                          <rect
                            x={xIndex * (cellWidth + gap)}
                            y={yIndex * (cellHeight + gap)}
                            width={cellWidth}
                            height={cellHeight}
                            fill={color}
                            fillOpacity={opacity}
                            rx={4}
                            className={cn(
                              'cursor-pointer transition-all',
                              hoveredCell?.source === source && hoveredCell?.hour === hour
                                ? 'stroke-gray-800 stroke-2'
                                : 'stroke-none',
                            )}
                            onMouseEnter={() =>
                              setHoveredCell(
                                cell || { source, hour, day: 0, count: 0, severity: 'low' },
                              )
                            }
                            onMouseLeave={() => setHoveredCell(null)}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs">
                            <p className="font-medium">{sourceLabels[source]}</p>
                            <p className="text-muted-foreground">Hour: {hour}:00</p>
                            <p className="font-bold" style={{ color }}>
                              {count} alerts
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }),
                )}
              </TooltipProvider>
            </g>
          </svg>
        </div>

        <div className="mt-4 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('common.low')}</span>
            <div className="flex gap-0.5">
              <div className="h-4 w-6 rounded bg-gray-100" />
              <div
                className="h-4 w-6 rounded"
                style={{ backgroundColor: severityColors.low, opacity: 0.5 }}
              />
              <div
                className="h-4 w-6 rounded"
                style={{ backgroundColor: severityColors.medium, opacity: 0.7 }}
              />
              <div
                className="h-4 w-6 rounded"
                style={{ backgroundColor: severityColors.high, opacity: 0.85 }}
              />
              <div
                className="h-4 w-6 rounded"
                style={{ backgroundColor: severityColors.critical }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{t('common.high')}</span>
          </div>
        </div>

        {hoveredCell && hoveredCell.count > 0 && (
          <div className="mt-4 rounded-lg border bg-gray-50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{sourceLabels[hoveredCell.source]}</span>
              <span className="text-muted-foreground">{hoveredCell.hour}:00</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="text-lg font-bold"
                style={{ color: getCellColor(hoveredCell.count, hoveredCell.severity) }}
              >
                {hoveredCell.count} alerts
              </span>
              <span
                className="rounded px-2 py-0.5 text-xs"
                style={{
                  backgroundColor: severityColors[hoveredCell.severity] + '20',
                  color: severityColors[hoveredCell.severity],
                }}
              >
                {hoveredCell.severity}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
