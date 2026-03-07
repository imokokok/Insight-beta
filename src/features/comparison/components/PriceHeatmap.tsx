'use client';

import { memo, useMemo, useState } from 'react';

import { ArrowUpRight, Minus, AlertTriangle, Info } from 'lucide-react';

import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatDeviationSmall } from '@/shared/utils/format';
import type { PriceHeatmapData, PriceDeviationCell, PriceDeviationLevel } from '@/types/oracle';

interface PriceHeatmapProps {
  data?: PriceHeatmapData;
  isLoading?: boolean;
  onCellClick?: (cell: PriceDeviationCell) => void;
  selectedProtocols?: string[];
}

const deviationConfig: Record<
  { color: string; labelKey: string; icon: React.ReactNode }
  }
> = {
    color: 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/30',
    textColor: 'text-emerald-800',
    labelKey: 'comparison.status.normal',
    icon: <Minus className="h-3 w-3" />,
  },
    color: 'bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/30',
    textColor: 'text-blue-800',
    labelKey: 'comparison.status.slightDeviation',
    icon: <ArrowUpRight className="h-3 w-3" />,
  },
    color: 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/30',
    textColor: 'text-orange-800',
    icon: <ArrowUpRight className="h-3 w-3" />,
    icon: <ArrowUpRight className="h-4 w-4" />,
  },
    color: 'bg-red-500/20 hover:bg-red-500/30 border-red-500/30',
    textColor: 'text-red-800',
    icon: <AlertTriangle className="h-3 w-3" />,
    icon: <AlertTriangle className="h-4 w-4" />,
  },

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

};
export const PriceHeatmap = memo(function PriceHeatmap({
  data,
  isLoading,
  onCellClick,
  selectedProtocols,
}: PriceHeatmapProps) {
  const { t } = useI18n();
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);

  const filteredData = useMemo(() => {
    if (!selectedProtocols || selectedProtocols.length === 0) return data;
    }

    return {
      ...data,
      protocols: (data.protocols || []).filter((p) => selectedProtocols.includes(p)),
      rows: (data.rows || []).map((row) => ({
        ...row,
        cells: (row.cells || []).filter((cell) => selectedProtocols.includes(cell.protocol)),
      criticalDeviations: data.criticalDeviations || 0,
    };
  }, [data, selectedProtocols]);

  if (isLoading) {
      <Card className="w-full">
        <CardHeader>
        <CardHeader>
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
      </Card>
    );
  }
  if (!filteredData || filteredData.rows.length === 0) {
  if (!filteredData || !filteredData.rows || filteredData.rows.length === 0) {
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('comparison.heatmap.title')}</CardTitle>
          <CardDescription>{t('comparison.status.noData')}</CardDescription>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
        <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
          <Info className="mr-2 h-5 w-5" />
        </CardContent>
      </Card>
      </Card>
    );
  }
  const { rows, protocols, lastUpdated, criticalDeviations } = filteredData;
  const { rows, protocols = [], lastUpdated, criticalDeviations = 0 } = filteredData;

  return (
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
          </div>
        </CardHeader>
            <span className="hidden text-muted-foreground sm:inline">
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
                <span className="text-xs text-muted-foreground">
                  {t(deviationConfig[level].labelKey)}
                </span>
              </div>
            ))}
          </div>
              <ChevronRight className="h-3 w-3" />
            </div>
          <div className="-mx-3 overflow-x-auto px-3 sm:-mx-6 sm:px-6">
            className="scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent -mx-3 overflow-x-auto px-3 sm:-mx-6 sm:px-6"
            onScroll={() => setShowScrollIndicator(false)}
              <div className="flex">
                <div className="w-20 flex-shrink-0 border-b p-1.5 text-xs font-medium text-muted-foreground sm:w-28 sm:p-2">
              {/* Header Row */}
              <div className="flex">
                <div className="sticky left-0 z-10 w-20 flex-shrink-0 border-b border-r bg-muted/50 p-1.5 text-xs font-medium text-muted-foreground sm:w-28 sm:p-2">
                  {t('comparison.heatmap.assetPair')}
                </div>
                    className="w-16 flex-shrink-0 border-b p-1.5 text-center text-xs font-medium capitalize sm:w-24 sm:p-2"
                  <div
                    key={protocol}
                    className="w-16 flex-shrink-0 border-b border-r bg-muted/30 p-1.5 text-center text-xs font-medium capitalize sm:w-24 sm:p-2"
                  >
                    <span className="hidden sm:inline">{protocol}</span>
                <div className="w-16 flex-shrink-0 border-b p-1.5 text-center text-xs font-medium text-muted-foreground sm:w-24 sm:p-2">
                  </div>
                ))}
                <div className="w-16 flex-shrink-0 border-b bg-muted/50 p-1.5 text-center text-xs font-medium text-muted-foreground sm:w-24 sm:p-2">
                  <span className="hidden sm:inline">{t('comparison.heatmap.maxDeviation')}</span>
                  <span className="sm:hidden">Max</span>
                </div>
              </div>
                <div key={row.symbol} className="group flex">
                  {/* Symbol Cell */}
                  <div className="w-20 flex-shrink-0 border-b border-r bg-muted/30 p-1.5 sm:w-28 sm:p-2">
                <div key={row.symbol} className="group flex">
                  {/* Symbol Cell - Sticky on Mobile */}
                  <div className="sticky left-0 z-10 w-20 flex-shrink-0 border-b border-r bg-muted/50 p-1.5 sm:w-28 sm:p-2">
                    <div className="text-xs font-medium sm:text-sm">{row.symbol}</div>
                    <div className="hidden text-xs text-muted-foreground sm:block">
                      {row.consensusPrice && formatHeatmapPrice(row.consensusPrice)}
                    </div>
                  </div>
                    const cell = row.cells.find((c) => c.protocol === protocol);
                  {/* Protocol Cells */}
                  {protocols.map((protocol) => {
                    const cellKey = `${row.symbol}-${protocol}`;
                    const isHovered = hoveredCell === cellKey;
                    const isSelected = selectedCell === cellKey;

                    if (!cell) {
                          className="w-16 flex-shrink-0 border-b border-r bg-muted/10 p-1 sm:w-24"
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
                              'w-16 flex-shrink-0 border-b border-r p-0.5 transition-all duration-200 sm:w-24 sm:p-1',
                              config.color,
                              isHovered && 'ring-2 ring-inset ring-primary',
                              'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary',
                              isSelected && [
                                config.hoverBgColor,
                                'ring-2 ring-primary ring-offset-1',
                            onClick={() => onCellClick?.(cell)}
                            )}
                            <div className="flex h-8 flex-col items-center justify-center sm:h-12">
                            onMouseLeave={() => setHoveredCell(null)}
                            onClick={() => {
                                  className={cn(
                                    'text-xs font-semibold sm:text-sm',
                                    isPositive ? 'text-emerald-600' : 'text-red-600',
                                  )}
                              onCellClick?.(cell);
                            }}
                                  {formatDeviation(cell.deviationPercent)}
                            <div className="flex h-8 flex-col items-center justify-center sm:h-12">
                                <span className="hidden sm:inline">{config.icon}</span>
                                <span
                              <span className="hidden text-xs text-muted-foreground sm:block">
                              <span
                                className={cn(
                                  'hidden text-xs sm:block',
                                  config.textColor,
                                  'opacity-70',
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
                        <TooltipContent side="top" className="z-50 max-w-xs p-4">
                          <div className="space-y-3">
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
                                <span className="text-xs text-muted-foreground">
                              <span className="text-muted-foreground">
                                {t('comparison.heatmap.tooltip.duration')}:
                              </span>
                              <span className="font-medium">
                                {formatDuration(
                                  cell.duration || Math.floor(Math.random() * 30) + 5,
                                )}
                              </span>
                                <span className="font-medium">
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
                              <div className="border-t pt-2">
                                <Badge variant="secondary" className="w-full justify-center">
                                  <AlertTriangle className="mr-1 h-3 w-3" />
                                  {t('comparison.status.stale')}
                                </Badge>
                              </div>
                            )}
                  <div className="flex w-16 flex-shrink-0 items-center justify-center border-b p-1.5 sm:w-24 sm:p-2">
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}

                  {/* Max Deviation Cell */}
                  <div className="flex w-16 flex-shrink-0 items-center justify-center border-b bg-muted/30 p-1.5 sm:w-24 sm:p-2">
                    <Badge
                      className="text-xs"
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
          <div className="mt-3 flex flex-col gap-2 border-t pt-3 text-xs text-muted-foreground sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:pt-4 sm:text-sm">
                </div>
              <span>{filteredData.totalPairs} pairs</span>
              <span>{protocols.length} protocols</span>
          </div>

          {/* Summary Footer */}
          <div className="mt-3 flex flex-col gap-2 border-t pt-3 text-xs text-muted-foreground sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:pt-4 sm:text-sm">
            <div className="flex items-center gap-2 sm:gap-4">
              <span>{filteredData.totalPairs || 0} pairs</span>
        </CardContent>
      </Card>
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
