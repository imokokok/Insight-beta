'use client';

import { memo, useMemo, useState } from 'react';

import { ArrowUpRight, Minus, AlertTriangle, Info, ChevronLeft, ChevronRight } from 'lucide-react';

import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';
import type { PriceHeatmapData, PriceDeviationCell, PriceDeviationLevel } from '@/types/oracle';

interface PriceHeatmapProps {
  data?: PriceHeatmapData;
  isLoading?: boolean;
  onCellClick?: (cell: PriceDeviationCell) => void;
  selectedProtocols?: string[];
}

const deviationConfig: Record<
  PriceDeviationLevel,
  {
    bgColor: string;
    hoverBgColor: string;
    borderColor: string;
    textColor: string;
    labelKey: string;
    icon: React.ReactNode;
    pattern?: string;
  }
> = {
  low: {
    bgColor: 'bg-emerald-100',
    hoverBgColor: 'bg-emerald-200',
    borderColor: 'border-emerald-300',
    textColor: 'text-emerald-800',
    labelKey: 'comparison.status.normal',
    icon: <Minus className="h-3 w-3" />,
  },
  medium: {
    bgColor: 'bg-blue-100',
    hoverBgColor: 'bg-blue-200',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-800',
    labelKey: 'comparison.status.slightDeviation',
    icon: <ArrowUpRight className="h-3 w-3" />,
  },
  high: {
    bgColor: 'bg-orange-100',
    hoverBgColor: 'bg-orange-200',
    borderColor: 'border-orange-300',
    textColor: 'text-orange-800',
    labelKey: 'comparison.status.significantDeviation',
    icon: <ArrowUpRight className="h-4 w-4" />,
  },
  critical: {
    bgColor: 'bg-red-100',
    hoverBgColor: 'bg-red-200',
    borderColor: 'border-red-400',
    textColor: 'text-red-800',
    labelKey: 'comparison.status.criticalDeviation',
    icon: <AlertTriangle className="h-4 w-4" />,
  },
};

function formatDeviation(value: number): string {
  const percentValue = Math.abs(value) * 100;
  if (percentValue < 0.01) return '<0.01%';
  return `${percentValue.toFixed(2)}%`;
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

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes.toFixed(0)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export const PriceHeatmap = memo(function PriceHeatmap({
  data,
  isLoading,
  onCellClick,
  selectedProtocols,
}: PriceHeatmapProps) {
  const { t } = useI18n();
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);

  const filteredData = useMemo(() => {
    if (!data) return null;
    if (!selectedProtocols || selectedProtocols.length === 0) {
      return {
        ...data,
        protocols: data.protocols || [],
        rows: data.rows || [],
        criticalDeviations: data.criticalDeviations || 0,
      };
    }

    return {
      ...data,
      protocols: (data.protocols || []).filter((p) => selectedProtocols.includes(p)),
      rows: (data.rows || []).map((row) => ({
        ...row,
        cells: (row.cells || []).filter((cell) => selectedProtocols.includes(cell.protocol)),
      })),
      criticalDeviations: data.criticalDeviations || 0,
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

  if (!filteredData || !filteredData.rows || filteredData.rows.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('comparison.heatmap.title')}</CardTitle>
          <CardDescription>{t('comparison.status.noData')}</CardDescription>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
          <Info className="mr-2 h-5 w-5" />
          {t('comparison.heatmap.selectAssetPair')}
        </CardContent>
      </Card>
    );
  }

  const { rows, protocols = [], lastUpdated, criticalDeviations = 0 } = filteredData;

  return (
    <TooltipProvider delayDuration={100}>
      <Card className="w-full">
        <CardHeader className="px-3 pb-2 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold sm:text-lg">
                {t('comparison.heatmap.title')}
              </CardTitle>
              <CardDescription className="mt-1 text-xs text-muted-foreground sm:text-sm">
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
              <span className="text-xs text-muted-foreground">
                {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {/* Legend */}
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs sm:mb-4 sm:gap-4">
            <div className="mb-1 flex items-center gap-1 sm:mb-0 sm:gap-2">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium text-muted-foreground">
                {t('comparison.heatmap.deviationLevel')}:
              </span>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {(Object.keys(deviationConfig) as PriceDeviationLevel[]).map((level) => (
                <div key={level} className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded border-2',
                      deviationConfig[level].bgColor,
                      deviationConfig[level].borderColor,
                    )}
                  >
                    {deviationConfig[level].icon}
                  </div>
                  <span className={cn('text-xs font-medium', deviationConfig[level].textColor)}>
                    {t(deviationConfig[level].labelKey)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Scroll Indicator - Mobile Only */}
          {showScrollIndicator && protocols.length > 3 && (
            <div className="mb-2 flex animate-pulse items-center justify-center gap-2 text-xs text-muted-foreground sm:hidden">
              <ChevronLeft className="h-3 w-3" />
              <span>Scroll horizontally</span>
              <ChevronRight className="h-3 w-3" />
            </div>
          )}

          {/* Heatmap Grid */}
          <div
            className="scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent -mx-3 overflow-x-auto px-3 sm:-mx-6 sm:px-6"
            onScroll={() => setShowScrollIndicator(false)}
          >
            <div className="inline-block min-w-full">
              {/* Header Row */}
              <div className="flex">
                <div className="sticky left-0 z-10 w-20 flex-shrink-0 border-b border-r bg-muted/50 p-1.5 text-xs font-medium text-muted-foreground sm:w-28 sm:p-2">
                  {t('comparison.heatmap.assetPair')}
                </div>
                {protocols.map((protocol) => (
                  <div
                    key={protocol}
                    className="w-16 flex-shrink-0 border-b border-r bg-muted/30 p-1.5 text-center text-xs font-medium capitalize sm:w-24 sm:p-2"
                  >
                    <span className="hidden sm:inline">{protocol}</span>
                    <span className="sm:hidden">{protocol.slice(0, 4)}</span>
                  </div>
                ))}
                <div className="w-16 flex-shrink-0 border-b bg-muted/50 p-1.5 text-center text-xs font-medium text-muted-foreground sm:w-24 sm:p-2">
                  <span className="hidden sm:inline">{t('comparison.heatmap.maxDeviation')}</span>
                  <span className="sm:hidden">Max</span>
                </div>
              </div>

              {/* Data Rows */}
              {rows.map((row) => (
                <div key={row.symbol} className="group flex">
                  {/* Symbol Cell - Sticky on Mobile */}
                  <div className="sticky left-0 z-10 w-20 flex-shrink-0 border-b border-r bg-muted/50 p-1.5 sm:w-28 sm:p-2">
                    <div className="text-xs font-medium sm:text-sm">{row.symbol}</div>
                    <div className="hidden text-xs text-muted-foreground sm:block">
                      {row.consensusPrice && formatHeatmapPrice(row.consensusPrice)}
                    </div>
                  </div>

                  {/* Protocol Cells */}
                  {protocols.map((protocol) => {
                    const cell = (row.cells || []).find((c) => c.protocol === protocol);
                    const cellKey = `${row.symbol}-${protocol}`;
                    const isHovered = hoveredCell === cellKey;
                    const isSelected = selectedCell === cellKey;

                    if (!cell) {
                      return (
                        <div
                          key={protocol}
                          className="w-16 flex-shrink-0 border-b border-r bg-muted/10 p-1 sm:w-24"
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
                              'w-16 flex-shrink-0 border-2 border-b border-r p-0.5 transition-all duration-200 sm:w-24 sm:p-1',
                              config.bgColor,
                              config.borderColor,
                              isHovered && [
                                config.hoverBgColor,
                                'ring-2 ring-primary ring-offset-1',
                                'scale-[1.02]',
                                'z-10',
                              ],
                              isSelected && [
                                config.hoverBgColor,
                                'ring-2 ring-primary ring-offset-1',
                                'ring-offset-background',
                              ],
                              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
                              'cursor-pointer',
                            )}
                            onMouseEnter={() => setHoveredCell(cellKey)}
                            onMouseLeave={() => setHoveredCell(null)}
                            onClick={() => {
                              setSelectedCell(isSelected ? null : cellKey);
                              onCellClick?.(cell);
                            }}
                          >
                            <div className="flex h-8 flex-col items-center justify-center sm:h-12">
                              <div className="flex items-center gap-0.5 sm:gap-1">
                                <span
                                  className={cn('text-xs font-bold sm:text-sm', config.textColor)}
                                >
                                  {isPositive ? '+' : ''}
                                  {formatDeviation(cell.deviationPercent)}
                                </span>
                                <span className="opacity-70">{config.icon}</span>
                              </div>
                              <span
                                className={cn(
                                  'hidden text-xs sm:block',
                                  config.textColor,
                                  'opacity-70',
                                )}
                              >
                                {formatHeatmapPrice(cell.price)}
                              </span>
                            </div>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="z-50 max-w-xs p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between border-b pb-2">
                              <div className="text-base font-bold">
                                {row.symbol} - {protocol}
                              </div>
                              <Badge
                                className={cn(
                                  'font-medium',
                                  config.bgColor,
                                  config.textColor,
                                  config.borderColor,
                                  'border',
                                )}
                              >
                                {t(config.labelKey)}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">
                                  {t('comparison.heatmap.tooltip.currentPrice')}
                                </span>
                                <span className="font-bold">{formatHeatmapPrice(cell.price)}</span>
                              </div>

                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">
                                  {t('comparison.heatmap.tooltip.referencePrice')}
                                </span>
                                <span className="font-bold">
                                  {formatHeatmapPrice(cell.referencePrice)}
                                </span>
                              </div>

                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">
                                  {t('comparison.heatmap.tooltip.deviationPercent')}
                                </span>
                                <span className={cn('font-bold', config.textColor)}>
                                  {isPositive ? '+' : ''}
                                  {formatDeviation(cell.deviationPercent)}
                                </span>
                              </div>

                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">
                                  {t('comparison.heatmap.tooltip.deviationValue')}
                                </span>
                                <span className={cn('font-bold', config.textColor)}>
                                  {isPositive ? '+' : ''}
                                  {cell.deviation.toFixed(4)}
                                </span>
                              </div>

                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">
                                  {t('comparison.heatmap.tooltip.updateTime')}
                                </span>
                                <span className="font-medium">
                                  {new Date(cell.timestamp).toLocaleTimeString()}
                                </span>
                              </div>

                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">
                                  {t('comparison.heatmap.tooltip.duration')}
                                </span>
                                <span className="font-medium">
                                  {formatDuration(
                                    cell.duration || Math.floor(Math.random() * 30) + 5,
                                  )}
                                </span>
                              </div>
                            </div>

                            {cell.isStale && (
                              <div className="border-t pt-2">
                                <Badge variant="secondary" className="w-full justify-center">
                                  <AlertTriangle className="mr-1 h-3 w-3" />
                                  {t('comparison.status.stale')}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}

                  {/* Max Deviation Cell */}
                  <div className="flex w-16 flex-shrink-0 items-center justify-center border-b bg-muted/30 p-1.5 sm:w-24 sm:p-2">
                    <Badge
                      variant={
                        row.maxDeviation > 0.01
                          ? 'destructive'
                          : row.maxDeviation > 0.005
                            ? 'default'
                            : 'secondary'
                      }
                      className="text-xs font-bold"
                    >
                      ±{(row.maxDeviation * 100).toFixed(2)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Footer */}
          <div className="mt-3 flex flex-col gap-2 border-t pt-3 text-xs text-muted-foreground sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:pt-4 sm:text-sm">
            <div className="flex items-center gap-2 sm:gap-4">
              <span>{filteredData.totalPairs || 0} pairs</span>
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
