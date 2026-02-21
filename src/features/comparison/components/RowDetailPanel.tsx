'use client';

import React, { useMemo } from 'react';

import {
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Activity,
  Zap,
  Shield,
  ChevronUp,
} from 'lucide-react';

import { MiniChart } from '@/components/common/MiniChart';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import type { TableRowData } from '@/features/comparison/components/VirtualTable';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';
import { PROTOCOL_DISPLAY_NAMES } from '@/types/oracle';

export interface RowDetailPanelProps {
  row: TableRowData;
  onClose?: () => void;
  priceHistory?: number[];
}

const formatPrice = (price: number): string => {
  if (price >= 1000) return `$${price.toLocaleString()}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(4)}`;
};

const formatDeviation = (value: number): string => {
  const percentValue = Math.abs(value) * 100;
  if (percentValue < 0.01) return '<0.01%';
  return `${percentValue.toFixed(2)}%`;
};

const formatLatency = (ms: number): string => {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

const getDeviationColor = (deviation: number): string => {
  const abs = Math.abs(deviation);
  if (abs > 0.02) return 'text-red-600';
  if (abs > 0.01) return 'text-amber-600';
  if (abs > 0.005) return 'text-yellow-600';
  return 'text-emerald-600';
};

const getLatencyColor = (latency: number): string => {
  if (latency > 5000) return 'text-red-600';
  if (latency > 1000) return 'text-yellow-600';
  return 'text-emerald-600';
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active':
      return 'bg-emerald-500';
    case 'stale':
      return 'bg-amber-500';
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
};

export const RowDetailPanel = React.memo(function RowDetailPanel({
  row,
  onClose,
  priceHistory,
}: RowDetailPanelProps) {
  const { t } = useI18n();

  const mockPriceHistory = useMemo(() => {
    if (priceHistory && priceHistory.length > 0) return priceHistory;
    const basePrice = row.price;
    const history: number[] = [];
    for (let i = 0; i < 24; i++) {
      const variation = (Math.random() - 0.5) * basePrice * 0.02;
      history.push(basePrice + variation);
    }
    history.push(basePrice);
    return history;
  }, [priceHistory, row.price]);

  const trendData = useMemo(() => {
    const first = mockPriceHistory[0];
    const last = mockPriceHistory[mockPriceHistory.length - 1];
    if (first === undefined || last === undefined || first === 0) {
      return {
        direction: 'neutral' as const,
        percentage: '0.00',
      };
    }
    const change = ((last - first) / first) * 100;
    return {
      direction:
        change > 0.1 ? ('up' as const) : change < -0.1 ? ('down' as const) : ('neutral' as const),
      percentage: Math.abs(change).toFixed(2),
    };
  }, [mockPriceHistory]);

  return (
    <div className="border-t bg-muted/30 px-4 py-3">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="pb-2 pt-0">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Activity className="h-4 w-4 text-primary" />
              {t('comparison.table.price')} {t('comparison.realtime.trends') || 'Trend'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-0 pt-2">
            <div className="flex items-center gap-3">
              <MiniChart
                data={mockPriceHistory}
                width={150}
                height={50}
                showArea={true}
                color={
                  trendData.direction === 'up'
                    ? '#10b981'
                    : trendData.direction === 'down'
                      ? '#ef4444'
                      : '#6b7280'
                }
              />
              <div className="flex flex-col">
                <span className="text-lg font-semibold">{formatPrice(row.price)}</span>
                <span
                  className={cn(
                    'flex items-center gap-1 text-xs',
                    trendData.direction === 'up' && 'text-emerald-600',
                    trendData.direction === 'down' && 'text-red-600',
                    trendData.direction === 'neutral' && 'text-muted-foreground',
                  )}
                >
                  {trendData.direction === 'up' ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : trendData.direction === 'down' ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                  {trendData.percentage}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="pb-2 pt-0">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4 text-primary" />
              {t('comparison.table.protocol')}{' '}
              {t('comparison.realtime.protocolDetails') || 'Details'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-0 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">{t('comparison.table.protocol')}</p>
                <p className="text-sm font-medium capitalize">
                  {PROTOCOL_DISPLAY_NAMES[row.protocol as keyof typeof PROTOCOL_DISPLAY_NAMES] ||
                    row.protocol}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('comparison.table.status')}</p>
                <Badge
                  variant="outline"
                  className={cn(
                    'mt-0.5',
                    row.status === 'active' && 'border-emerald-500 bg-emerald-50 text-emerald-700',
                    row.status === 'stale' && 'border-amber-500 bg-amber-50 text-amber-700',
                    row.status === 'error' && 'border-red-500 bg-red-50 text-red-700',
                  )}
                >
                  <span className={cn('mr-1.5 h-2 w-2 rounded-full', getStatusColor(row.status))} />
                  {t(`comparison.status.${row.status}`)}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('comparison.table.deviation')}</p>
                <p className={cn('text-sm font-medium', getDeviationColor(row.deviation))}>
                  {row.deviation > 0 ? '+' : ''}
                  {formatDeviation(row.deviation)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('comparison.table.latency')}</p>
                <p className={cn('text-sm font-medium', getLatencyColor(row.latency))}>
                  <Clock className="mr-1 inline h-3 w-3" />
                  {formatLatency(row.latency)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="pb-2 pt-0">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Shield className="h-4 w-4 text-primary" />
              {t('comparison.table.confidence')} & {t('comparison.table.spread')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-0 pt-2">
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {t('comparison.table.confidence')}
                  </p>
                  <p className="text-sm font-medium">{(row.confidence * 100).toFixed(0)}%</p>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      row.confidence >= 0.9
                        ? 'bg-emerald-500'
                        : row.confidence >= 0.7
                          ? 'bg-amber-500'
                          : 'bg-red-500',
                    )}
                    style={{ width: `${row.confidence * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{t('comparison.table.spread')}</p>
                  <p className="text-sm font-medium">±{(row.spreadPercent * 100).toFixed(2)}%</p>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      row.spreadPercent <= 0.005
                        ? 'bg-emerald-500'
                        : row.spreadPercent <= 0.01
                          ? 'bg-amber-500'
                          : 'bg-red-500',
                    )}
                    style={{ width: `${Math.min(row.spreadPercent * 5000, 100)}%` }}
                  />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {t('comparison.table.lastUpdated') || 'Last Updated'}:{' '}
                {new Date(row.lastUpdated).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-3 flex justify-end">
        <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
          <ChevronUp className="mr-1 h-3 w-3" />
          {t('comparison.table.closeDetails') || 'Close Details'}
        </Button>
      </div>
    </div>
  );
});
