'use client';

import { useMemo } from 'react';
import { Activity, Flame, Snowflake } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

export interface HeatmapCell {
  id: string;
  symbol: string;
  protocol: string;
  price: number;
  deviation: number;
  deviationPercent: number;
  volume24h?: number;
  lastUpdate: Date;
}

interface PriceHeatmapProps {
  data: HeatmapCell[];
  loading?: boolean;
  className?: string;
  onCellClick?: (cell: HeatmapCell) => void;
}

export function PriceHeatmap({ data, loading, className, onCellClick }: PriceHeatmapProps) {
  const { t } = useI18n();

  const stats = useMemo(() => {
    const totalCells = data.length;
    const hotCells = data.filter(c => Math.abs(c.deviationPercent) > 2).length;
    const coldCells = data.filter(c => Math.abs(c.deviationPercent) < 0.5).length;
    const avgDeviation = data.length > 0
      ? data.reduce((sum, c) => sum + Math.abs(c.deviationPercent), 0) / data.length
      : 0;

    return { totalCells, hotCells, coldCells, avgDeviation };
  }, [data]);

  const getDeviationColor = (deviation: number) => {
    const absDeviation = Math.abs(deviation);
    if (absDeviation < 0.5) return 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800';
    if (absDeviation < 1) return 'bg-blue-100 hover:bg-blue-200 text-blue-800';
    if (absDeviation < 2) return 'bg-amber-100 hover:bg-amber-200 text-amber-800';
    if (absDeviation < 5) return 'bg-orange-100 hover:bg-orange-200 text-orange-800';
    return 'bg-rose-100 hover:bg-rose-200 text-rose-800';
  };

  const getDeviationLabel = (deviation: number) => {
    const absDeviation = Math.abs(deviation);
    if (absDeviation < 0.5) return t('dashboard:heatmap.stable');
    if (absDeviation < 1) return t('dashboard:heatmap.slight');
    if (absDeviation < 2) return t('dashboard:heatmap.moderate');
    if (absDeviation < 5) return t('dashboard:heatmap.high');
    return t('dashboard:heatmap.extreme');
  };

  // Group data by symbol
  const groupedData = useMemo(() => {
    const groups: Record<string, HeatmapCell[]> = {};
    data.forEach(cell => {
      if (!groups[cell.symbol]) {
        groups[cell.symbol] = [];
      }
      groups[cell.symbol].push(cell);
    });
    return groups;
  }, [data]);

  const symbols = Object.keys(groupedData).slice(0, 10); // Limit to 10 symbols

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            {t('dashboard:heatmap.title')}
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Flame className="h-3 w-3 text-rose-500" />
              {stats.hotCells} {t('dashboard:heatmap.hot')}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Snowflake className="h-3 w-3 text-emerald-500" />
              {stats.coldCells} {t('dashboard:heatmap.cold')}
            </Badge>
            <Badge variant="outline">
              {t('dashboard:heatmap.avg')}: {stats.avgDeviation.toFixed(2)}%
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <TooltipProvider>
          <div className="space-y-2">
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">{t('dashboard:heatmap.legend')}:</span>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-emerald-100" />
                <span>&lt;0.5%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-blue-100" />
                <span>0.5-1%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-amber-100" />
                <span>1-2%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-orange-100" />
                <span>2-5%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-rose-100" />
                <span>&gt;5%</span>
              </div>
            </div>

            {/* Heatmap Grid */}
            <div className="grid gap-1">
              {symbols.map(symbol => (
                <div key={symbol} className="flex items-center gap-2">
                  <div className="w-20 text-sm font-medium truncate">{symbol}</div>
                  <div className="flex-1 flex gap-1">
                    {groupedData[symbol].map(cell => (
                      <Tooltip key={cell.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => onCellClick?.(cell)}
                            className={cn(
                              'flex-1 h-10 rounded transition-all hover:scale-105',
                              getDeviationColor(cell.deviationPercent)
                            )}
                          >
                            <div className="flex h-full flex-col items-center justify-center">
                              <span className="text-xs font-bold">
                                {Math.abs(cell.deviationPercent).toFixed(1)}%
                              </span>
                              <span className="text-[10px] opacity-70">{cell.protocol.slice(0, 3)}</span>
                            </div>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <p className="font-medium">{cell.symbol} - {cell.protocol}</p>
                            <p className="text-sm">{t('dashboard:heatmap.price')}: ${cell.price.toFixed(4)}</p>
                            <p className="text-sm">{t('dashboard:heatmap.deviation')}: {cell.deviationPercent.toFixed(2)}%</p>
                            <p className="text-xs text-muted-foreground">
                              {getDeviationLabel(cell.deviationPercent)}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
