'use client';

import React from 'react';

import {
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';
import { PROTOCOL_DISPLAY_NAMES } from '@/types/oracle';

import {
  DENSITY_CONFIG,
  formatters,
  getDeviationColor,
  getLatencyColor,
  getSpreadVariant,
} from './types';

import type { VirtualTableRowProps, StatusBadgeProps } from './types';

const StatusBadge = React.memo(function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useI18n();

  switch (status) {
    case 'active':
      return (
        <Badge variant="default" className={cn('bg-emerald-500', 'text-xs')}>
          {t('comparison.status.active')}
        </Badge>
      );
    case 'stale':
      return (
        <Badge variant="secondary" className={cn('bg-amber-500/10', 'text-amber-600', 'text-xs')}>
          {t('comparison.status.stale')}
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="destructive" className="text-xs">
          {t('comparison.status.error')}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs">
          {t('comparison.status.unknown')}
        </Badge>
      );
  }
});

const VirtualTableRow = React.memo(function VirtualTableRow({
  row,
  style,
  visibleColumns,
  density,
  isExpanded,
  onToggleExpand,
  expandable,
}: VirtualTableRowProps) {
  const { t } = useI18n();
  const densityConfig = DENSITY_CONFIG[density];

  return (
    <div
      className={cn(
        'flex items-center border-b px-4 transition-colors hover:bg-muted/30',
        densityConfig.padding,
        densityConfig.fontSize,
        isExpanded && 'bg-muted/40',
      )}
      style={{ ...style, contain: 'layout style', contentVisibility: 'auto' }}
    >
      {expandable && (
        <div className="w-[30px] flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand?.();
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      )}
      {visibleColumns.symbol && <div className="w-[100px] truncate font-medium">{row.symbol}</div>}
      {visibleColumns.protocol && (
        <div className="flex-1 capitalize">
          {PROTOCOL_DISPLAY_NAMES[row.protocol as keyof typeof PROTOCOL_DISPLAY_NAMES]}
        </div>
      )}
      {visibleColumns.price && (
        <div className="w-[120px] text-right font-mono">{formatters.price(row.price)}</div>
      )}
      {visibleColumns.deviation && (
        <div className="w-[120px] text-right">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium',
              getDeviationColor(row.deviation),
            )}
          >
            {row.deviation > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : row.deviation < 0 ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {formatters.deviation(row.deviation)}
          </span>
        </div>
      )}
      {visibleColumns.spread && (
        <div className="w-[100px] text-right">
          <Badge variant={getSpreadVariant(row.spreadPercent)} className="text-xs">
            ±{(row.spreadPercent * 100).toFixed(2)}%
          </Badge>
        </div>
      )}
      {visibleColumns.latency && (
        <div className="w-[100px] text-right">
          <span className={cn('text-xs', getLatencyColor(row.latency))}>
            <Clock className="mr-1 inline h-3 w-3" />
            {formatters.latency(row.latency)}
          </span>
        </div>
      )}
      {visibleColumns.status && (
        <div className="w-[80px] text-center">
          <StatusBadge status={row.status} />
        </div>
      )}
      {visibleColumns.confidence && (
        <div className="w-[80px] text-right">
          <span className="text-xs text-muted-foreground">
            {(row.confidence * 100).toFixed(0)}%
          </span>
        </div>
      )}
      <div className="w-[50px]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onToggleExpand}>
              {isExpanded ? t('comparison.table.closeDetails') : t('comparison.table.viewDetails')}
            </DropdownMenuItem>
            <DropdownMenuItem>{t('comparison.table.setAlert')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

export { VirtualTableRow, StatusBadge };
