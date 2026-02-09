'use client';

import { memo, useMemo, useState } from 'react';

import { ArrowUpRight, Minus, AlertTriangle, Info } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useI18n } from '@/i18n';
import type { PriceHeatmapData, PriceDeviationCell, PriceDeviationLevel } from '@/lib/types/oracle';
import { cn } from '@/lib/utils';

interface PriceHeatmapProps {
  data?: PriceHeatmapData;
  isLoading?: boolean;
  onCellClick?: (cell: PriceDeviationCell) => void;
  selectedProtocols?: string[];
}

const deviationConfig: Record<
  PriceDeviationLevel,
  { color: string; labelKey: string; icon: React.ReactNode }
> = {
  low: {
    color: 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/30',
    labelKey: 'comparison.status.normal',
    icon: <Minus className="h-3 w-3" />,
  },
  medium: {
    color: 'bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/30',
    labelKey: 'comparison.status.slightDeviation',
    icon: <ArrowUpRight className="h-3 w-3" />,
  },
  high: {
    color: 'bg-orange-500/20 hover:bg-orange-500/30 border-orange-500/30',
    labelKey: 'comparison.status.significantDeviation',
    icon: <ArrowUpRight className="h-3 w-3" />,
  },
  critical: {
    color: 'bg-red-500/20 hover:bg-red-500/30 border-red-500/30',
    labelKey: 'comparison.status.criticalDeviation',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
};

function formatDeviation(value: number): string {
  const absValue = Math.abs(value);
  if (absValue < 0.01) return '<0.01%';
  return `${absValue.toFixed(2)}%`;
}

function formatHeatmapPrice(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}k`;
  }
  if (value >= 1) {
    return `$${value.toFixed(2)}`;
  }
  return `$${value.toFixed(4)}`;
}

export const PriceHeatmap = memo(function PriceHeatmap({
  data,
  isLoading,
  onCellClick,
  selectedProtocols,
}: PriceHeatmapProps) {
  const { t } = useI18n();
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const filteredData = useMemo(() => {
    if (!data) return null;
    if (!selectedProtocols || selectedProtocols.length === 0) return data;

    return {
      ...data,
      protocols: data.protocols.filter((p) => selectedProtocols.includes(p)),
      rows: data.rows.map((row) => ({
        ...row,
        cells: row.cells.filter((cell) => selectedProtocols.includes(cell.protocol)),
      })),
    };
  }, [data, selectedProtocols]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-2">
                <Skeleton className="h-12 w-24" />
                {Array.from({ length: 6 }).map((_, j) => (
                  <Skeleton key={j} className="h-12 w-20" />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!filteredData || filteredData.rows.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('comparison.heatmap.title')}</CardTitle>
          <CardDescription>{t('comparison.status.noData')}</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground flex h-64 items-center justify-center">
          <Info className="mr-2 h-5 w-5" />
          {t('comparison.heatmap.selectAssetPair')}
        </CardContent>
      </Card>
    );
  }

  const { rows, protocols, lastUpdated, criticalDeviations } = filteredData;

  return (
    <TooltipProvider delayDuration={100}>
      <Card className="w-full">
        <CardHeader className="px-3 pb-2 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold sm:text-lg">
                {t('comparison.heatmap.title')}
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-1 text-xs sm:text-sm">
                {t('comparison.heatmap.description')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {criticalDeviations > 0 && (
                <Badge variant="destructive" className="gap-1 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  {criticalDeviations}
                </Badge>
              )}
              <span className="text-muted-foreground text-xs">
                {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {/* Legend */}
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs sm:mb-4 sm:gap-4">
            <span className="text-muted-foreground hidden sm:inline">
              {t('comparison.heatmap.deviationLevel')}
            </span>
            {(Object.keys(deviationConfig) as PriceDeviationLevel[]).map((level) => (
              <div key={level} className="flex items-center gap-1 sm:gap-1.5">
                <div
                  className={cn(
                    'h-2.5 w-2.5 rounded border sm:h-3 sm:w-3',
                    deviationConfig[level].color,
                  )}
                />
                <span className="text-muted-foreground text-xs">
                  {t(deviationConfig[level].labelKey)}
                </span>
              </div>
            ))}
          </div>

          {/* Heatmap Grid */}
          <div className="-mx-3 overflow-x-auto px-3 sm:-mx-6 sm:px-6">
            <div className="inline-block min-w-full">
              {/* Header Row */}
              <div className="flex">
                <div className="text-muted-foreground w-20 flex-shrink-0 border-b p-1.5 text-xs font-medium sm:w-28 sm:p-2">
                  {t('comparison.heatmap.assetPair')}
                </div>
                {protocols.map((protocol) => (
                  <div
                    key={protocol}
                    className="w-16 flex-shrink-0 border-b p-1.5 text-center text-xs font-medium capitalize sm:w-24 sm:p-2"
                  >
                    <span className="hidden sm:inline">{protocol}</span>
                    <span className="sm:hidden">{protocol.slice(0, 4)}</span>
                  </div>
                ))}
                <div className="text-muted-foreground w-16 flex-shrink-0 border-b p-1.5 text-center text-xs font-medium sm:w-24 sm:p-2">
                  <span className="hidden sm:inline">{t('comparison.heatmap.maxDeviation')}</span>
                  <span className="sm:hidden">Max</span>
                </div>
              </div>

              {/* Data Rows */}
              {rows.map((row) => (
                <div key={row.symbol} className="group flex">
                  {/* Symbol Cell */}
                  <div className="bg-muted/30 w-20 flex-shrink-0 border-b border-r p-1.5 sm:w-28 sm:p-2">
                    <div className="text-xs font-medium sm:text-sm">{row.symbol}</div>
                    <div className="text-muted-foreground hidden text-xs sm:block">
                      {formatHeatmapPrice(row.consensusPrice)}
                    </div>
                  </div>

                  {/* Protocol Cells */}
                  {protocols.map((protocol) => {
                    const cell = row.cells.find((c) => c.protocol === protocol);
                    const cellKey = `${row.symbol}-${protocol}`;
                    const isHovered = hoveredCell === cellKey;

                    if (!cell) {
                      return (
                        <div
                          key={protocol}
                          className="bg-muted/10 w-16 flex-shrink-0 border-b border-r p-1 sm:w-24"
                        />
                      );
                    }

                    const config = deviationConfig[cell.deviationLevel];
                    const isPositive = cell.deviation >= 0;

                    return (
                      <Tooltip key={protocol}>
                        <TooltipTrigger asChild>
                          <button
                            className={cn(
                              'w-16 flex-shrink-0 border-b border-r p-0.5 transition-all duration-200 sm:w-24 sm:p-1',
                              config.color,
                              isHovered && 'ring-primary ring-2 ring-inset',
                              'focus:ring-primary focus:outline-none focus:ring-2 focus:ring-inset',
                            )}
                            onMouseEnter={() => setHoveredCell(cellKey)}
                            onMouseLeave={() => setHoveredCell(null)}
                            onClick={() => onCellClick?.(cell)}
                          >
                            <div className="flex h-8 flex-col items-center justify-center sm:h-12">
                              <div className="flex items-center gap-0.5 sm:gap-1">
                                <span
                                  className={cn(
                                    'text-xs font-semibold sm:text-sm',
                                    isPositive ? 'text-emerald-600' : 'text-red-600',
                                  )}
                                >
                                  {isPositive ? '+' : ''}
                                  {formatDeviation(cell.deviationPercent)}
                                </span>
                                <span className="hidden sm:inline">{config.icon}</span>
                              </div>
                              <span className="text-muted-foreground hidden text-xs sm:block">
                                {formatHeatmapPrice(cell.price)}
                              </span>
                            </div>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs p-3">
                          <div className="space-y-2">
                            <div className="font-semibold">
                              {row.symbol} - {protocol}
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                              <span className="text-muted-foreground">
                                {t('comparison.heatmap.tooltip.currentPrice')}:
                              </span>
                              <span className="font-medium">{formatHeatmapPrice(cell.price)}</span>

                              <span className="text-muted-foreground">
                                {t('comparison.heatmap.tooltip.referencePrice')}:
                              </span>
                              <span className="font-medium">
                                {formatHeatmapPrice(cell.referencePrice)}
                              </span>

                              <span className="text-muted-foreground">
                                {t('comparison.heatmap.tooltip.deviationValue')}:
                              </span>
                              <span
                                className={cn(
                                  'font-medium',
                                  isPositive ? 'text-emerald-600' : 'text-red-600',
                                )}
                              >
                                {isPositive ? '+' : ''}
                                {cell.deviation.toFixed(4)}
                              </span>

                              <span className="text-muted-foreground">
                                {t('comparison.heatmap.tooltip.deviationPercent')}:
                              </span>
                              <span
                                className={cn(
                                  'font-medium',
                                  isPositive ? 'text-emerald-600' : 'text-red-600',
                                )}
                              >
                                {isPositive ? '+' : ''}
                                {formatDeviation(cell.deviationPercent)}
                              </span>

                              <span className="text-muted-foreground">
                                {t('comparison.heatmap.tooltip.updateTime')}:
                              </span>
                              <span className="font-medium">
                                {new Date(cell.timestamp).toLocaleTimeString()}
                              </span>

                              {cell.isStale && (
                                <>
                                  <span className="text-muted-foreground">
                                    {t('comparison.heatmap.tooltip.status')}:
                                  </span>
                                  <Badge variant="secondary" className="text-xs">
                                    {t('comparison.status.stale')}
                                  </Badge>
                                </>
                              )}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}

                  {/* Max Deviation Cell */}
                  <div className="flex w-16 flex-shrink-0 items-center justify-center border-b p-1.5 sm:w-24 sm:p-2">
                    <Badge
                      variant={
                        row.maxDeviation > 1
                          ? 'destructive'
                          : row.maxDeviation > 0.5
                            ? 'default'
                            : 'secondary'
                      }
                      className="text-xs"
                    >
                      ±{row.maxDeviation.toFixed(2)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Footer */}
          <div className="text-muted-foreground mt-3 flex flex-col gap-2 border-t pt-3 text-xs sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:pt-4 sm:text-sm">
            <div className="flex items-center gap-2 sm:gap-4">
              <span>{filteredData.totalPairs} pairs</span>
              <span>{protocols.length} protocols</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>{t('comparison.heatmap.clickForDetails')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
});
