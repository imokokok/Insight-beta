'use client';

import React from 'react';

import { MoreHorizontal, TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/i18n';
import { PROTOCOL_DISPLAY_NAMES } from '@/lib/types/oracle';
import { cn } from '@/lib/utils';

import {
  createFormatters,
  getDeviationColor,
  getLatencyColor,
  getSpreadVariant,
} from './TableFormatters';
import { StatusBadge } from './TableStatusBadge';

export interface TableRowData {
  id: string;
  symbol: string;
  protocol: string;
  price: number;
  deviation: number;
  deviationPercent: number;
  spread: number;
  spreadPercent: number;
  latency: number;
  confidence: number;
  status: 'active' | 'stale' | 'error';
  lastUpdated: string;
}

interface VirtualTableRowProps {
  row: TableRowData;
  style: React.CSSProperties;
}

const formatters = createFormatters();

export const VirtualTableRow = React.memo(function VirtualTableRow({
  row,
  style,
}: VirtualTableRowProps) {
  const { t } = useI18n();

  return (
    <div
      className="hover:bg-muted/30 flex items-center border-b px-4 transition-colors"
      style={style}
    >
      <div className="w-[100px] truncate font-medium">{row.symbol}</div>
      <div className="flex-1 capitalize">
        {PROTOCOL_DISPLAY_NAMES[row.protocol as keyof typeof PROTOCOL_DISPLAY_NAMES]}
      </div>
      <div className="w-[120px] text-right font-mono">{formatters.price(row.price)}</div>
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
      <div className="w-[100px] text-right">
        <Badge variant={getSpreadVariant(row.spreadPercent)} className="text-xs">
          ±{row.spreadPercent.toFixed(2)}%
        </Badge>
      </div>
      <div className="w-[100px] text-right">
        <span className={cn('text-xs', getLatencyColor(row.latency))}>
          <Clock className="mr-1 inline h-3 w-3" />
          {formatters.latency(row.latency)}
        </span>
      </div>
      <div className="w-[80px] text-center">
        <StatusBadge status={row.status} />
      </div>
      <div className="w-[80px] text-right">
        <span className="text-muted-foreground text-xs">{(row.confidence * 100).toFixed(0)}%</span>
      </div>
      <div className="w-[50px]">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>{t('comparison.table.viewDetails')}</DropdownMenuItem>
            <DropdownMenuItem>{t('comparison.table.addToWatchlist')}</DropdownMenuItem>
            <DropdownMenuItem>{t('comparison.table.setAlert')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
