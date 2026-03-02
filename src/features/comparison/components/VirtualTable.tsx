'use client';

import React, { useMemo, useCallback, useRef, useState } from 'react';

import { ChevronRight, TrendingUp, TrendingDown, Minus, Clock, Inbox } from 'lucide-react';

import { Card, CardContent } from '@/components/ui';
import { Skeleton, Badge } from '@/components/ui';
import { useIsMobile } from '@/hooks';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';
import { PROTOCOL_DISPLAY_NAMES } from '@/types/oracle';

import { RowDetailPanel } from './RowDetailPanel';
import {
  DEFAULT_CONTAINER_HEIGHT,
  HEADER_HEIGHT,
  OVERSCAN,
  DENSITY_CONFIG,
  DEFAULT_COLUMN_VISIBILITY,
  formatters,
  getDeviationColor,
  getLatencyColor,
  getSpreadVariant,
} from './types';
import { VirtualTableHeader } from './VirtualTableHeader';
import { VirtualTableRow } from './VirtualTableRow';
import { VirtualTableToolbar } from './VirtualTableToolbar';

import type {
  VirtualTableProps,
  TableRowData,
  SortField,
  SortDirection,
  ViewDensity,
  ColumnVisibility,
  VirtualTableSkeletonProps,
} from './types';

const VirtualTableSkeleton = React.memo(function VirtualTableSkeleton({
  rowCount = 10,
}: VirtualTableSkeletonProps) {
  return (
    <Card className="w-full">
      <Card className="border-0 shadow-none">
        <div className="p-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
      </Card>
      <CardContent>
        <div className="space-y-2">
          {Array.from({ length: rowCount }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

const MobileCardSkeleton = React.memo(function MobileCardSkeleton({
  rowCount = 5,
}: {
  rowCount?: number;
}) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rowCount }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border/50 p-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
});

const MobileTableCard = React.memo(function MobileTableCard({
  row,
  isExpanded,
  onToggle,
}: {
  row: TableRowData;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { t } = useI18n();

  return (
    <div
      className={cn(
        'rounded-lg border border-border/50 bg-card',
        'transition-all duration-200 ease-in-out',
        'hover:border-border hover:shadow-sm',
        isExpanded && 'border-primary/30 shadow-md',
      )}
    >
      <div className="flex items-center justify-between p-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="min-w-[50px] text-xs text-muted-foreground">
              {t('comparison.table.symbol')}:
            </span>
            <span className="text-sm font-semibold text-foreground">{row.symbol}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="min-w-[50px] text-xs text-muted-foreground">
              {t('comparison.table.protocol')}:
            </span>
            <span className="text-sm font-medium capitalize text-foreground">
              {PROTOCOL_DISPLAY_NAMES[row.protocol as keyof typeof PROTOCOL_DISPLAY_NAMES]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="min-w-[50px] text-xs text-muted-foreground">
              {t('comparison.table.price')}:
            </span>
            <span className="font-mono text-sm text-foreground">{formatters.price(row.price)}</span>
          </div>
        </div>

        <button
          onClick={onToggle}
          className={cn(
            'ml-2 flex h-8 w-8 items-center justify-center rounded-full',
            'text-muted-foreground hover:bg-muted hover:text-foreground',
            'transition-all duration-200',
          )}
          aria-label={
            isExpanded ? t('comparison.table.closeDetails') : t('comparison.table.viewDetails')
          }
        >
          <ChevronRight
            className={cn('h-5 w-5 transition-transform duration-300', isExpanded && 'rotate-90')}
          />
        </button>
      </div>

      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="border-t border-border/30 bg-muted/20 px-3 py-2.5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {t('comparison.table.deviation')}:
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium',
                  getDeviationColor(row.deviation, { format: 'tailwind-with-bg' }),
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

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t('comparison.table.spread')}:</span>
              <Badge variant={getSpreadVariant(row.spreadPercent)} className="text-xs">
                ±{(row.spreadPercent * 100).toFixed(2)}%
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {t('comparison.table.latency')}:
              </span>
              <span className={cn('text-xs', getLatencyColor(row.latency))}>
                <Clock className="mr-1 inline h-3 w-3" />
                {formatters.latency(row.latency)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {t('comparison.table.confidence')}:
              </span>
              <span className="text-xs text-muted-foreground">
                {(row.confidence * 100).toFixed(0)}%
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t('comparison.table.status')}:</span>
              <Badge
                variant={
                  row.status === 'active'
                    ? 'default'
                    : row.status === 'stale'
                      ? 'secondary'
                      : 'destructive'
                }
                className={cn('text-xs', row.status === 'active' && 'bg-emerald-500')}
              >
                {t(`comparison.status.${row.status}`)}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

const MobileTableView = React.memo(function MobileTableView({
  data,
  isLoading = false,
  searchTerm,
  onSearchChange,
  onExport,
}: {
  data: TableRowData[];
  isLoading?: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onExport?: (format: 'json' | 'csv') => void;
}) {
  const { t } = useI18n();
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const handleToggleCard = useCallback((rowId: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  }, []);

  if (isLoading) {
    return <MobileCardSkeleton rowCount={5} />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Inbox className="mb-3 h-12 w-12 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{t('comparison.table.noData')}</p>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <VirtualTableToolbar
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        totalRecords={data.length}
        startIndex={0}
        endIndex={data.length}
        data={undefined}
        onExport={onExport}
        visibleColumns={DEFAULT_COLUMN_VISIBILITY}
        onVisibleColumnsChange={() => {}}
        density="comfortable"
        onDensityChange={() => {}}
      />
      <CardContent>
        <div className="space-y-3">
          {data.map((row) => (
            <MobileTableCard
              key={row.id}
              row={row}
              isExpanded={expandedCards.has(row.id)}
              onToggle={() => handleToggleCard(row.id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

export const VirtualTable = React.memo(function VirtualTable({
  data,
  isLoading,
  onExport,
  containerHeight = DEFAULT_CONTAINER_HEIGHT,
  expandable = true,
  renderExpanded,
}: VirtualTableProps) {
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('symbol');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [scrollTop, setScrollTop] = useState(0);
  const [visibleColumns, setVisibleColumns] = useState<ColumnVisibility>(DEFAULT_COLUMN_VISIBILITY);
  const [density, setDensity] = useState<ViewDensity>('comfortable');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const rowHeight = DENSITY_CONFIG[density].rowHeight;
  const expandedPanelHeight = 200;

  const tableData = useMemo<TableRowData[]>(() => {
    if (!data) return [];

    let totalRows = 0;
    for (const item of data) {
      totalRows += item.protocols.length;
    }

    const result: TableRowData[] = new Array(totalRows);
    let index = 0;

    for (const item of data) {
      for (const protocol of item.protocols) {
        result[index++] = {
          id: `${item.symbol}-${protocol.protocol}`,
          symbol: item.symbol,
          protocol: protocol.protocol,
          price: protocol.price,
          deviation: protocol.deviationFromConsensus,
          deviationPercent: protocol.deviationFromConsensus,
          spread: item.spread.absolute,
          spreadPercent: item.spread.percent,
          latency: protocol.latency,
          confidence: protocol.confidence,
          status: protocol.status,
          lastUpdated: protocol.timestamp,
        };
      }
    }

    return result;
  }, [data]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return tableData;

    const term = searchTerm.toLowerCase();
    return tableData.filter(
      (row) => row.symbol.toLowerCase().includes(term) || row.protocol.toLowerCase().includes(term),
    );
  }, [tableData, searchTerm]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'deviation':
          comparison = Math.abs(a.deviation) - Math.abs(b.deviation);
          break;
        case 'spread':
          comparison = a.spreadPercent - b.spreadPercent;
          break;
        case 'latency':
          comparison = a.latency - b.latency;
          break;
        case 'updated':
          comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortField, sortDirection]);

  const { virtualItems, totalHeight, startIndex, endIndex } = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
    const visibleCount = Math.ceil(containerHeight / rowHeight);
    const endIndex = Math.min(sortedData.length - 1, startIndex + visibleCount + OVERSCAN * 2);

    const virtualItems: Array<{
      index: number;
      data: TableRowData;
      style: React.CSSProperties;
      isExpanded?: boolean;
      panelStyle?: React.CSSProperties;
    }> = [];

    let currentTop = 0;
    for (let i = 0; i < sortedData.length; i++) {
      const row = sortedData[i];
      if (!row) continue;
      const isExpanded = expandedRows.has(row.id);

      if (i >= startIndex - OVERSCAN && i <= endIndex + OVERSCAN) {
        virtualItems.push({
          index: i,
          data: row,
          style: {
            position: 'absolute' as const,
            top: currentTop,
            height: rowHeight,
            left: 0,
            right: 0,
          },
          isExpanded,
          panelStyle: isExpanded
            ? {
                position: 'absolute' as const,
                top: currentTop + rowHeight,
                left: 0,
                right: 0,
                height: expandedPanelHeight,
              }
            : undefined,
        });
      }

      currentTop += rowHeight;
      if (isExpanded) {
        currentTop += expandedPanelHeight;
      }
    }

    return {
      virtualItems,
      totalHeight: currentTop,
      startIndex,
      endIndex,
    };
  }, [scrollTop, sortedData, rowHeight, containerHeight, expandedRows, expandedPanelHeight]);

  const scrollTimeoutRef = useRef<number | null>(null);
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (scrollTimeoutRef.current) {
      cancelAnimationFrame(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = requestAnimationFrame(() => {
      setScrollTop(e.currentTarget.scrollTop);
    });
  }, []);

  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDirection('asc');
      return field;
    });
  }, []);

  const handleVisibleColumnsChange = useCallback((columns: ColumnVisibility) => {
    setVisibleColumns(columns);
  }, []);

  const handleDensityChange = useCallback((newDensity: ViewDensity) => {
    setDensity(newDensity);
  }, []);

  const handleToggleExpand = useCallback((rowId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  }, []);

  if (isMobile) {
    return (
      <MobileTableView
        data={sortedData}
        isLoading={isLoading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onExport={onExport}
      />
    );
  }

  if (isLoading) {
    return <VirtualTableSkeleton />;
  }

  return (
    <Card className="w-full">
      <VirtualTableToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        totalRecords={sortedData.length}
        startIndex={startIndex}
        endIndex={endIndex}
        data={data}
        onExport={onExport}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={handleVisibleColumnsChange}
        density={density}
        onDensityChange={handleDensityChange}
      />

      <CardContent>
        <div
          ref={containerRef}
          className="virtual-list-container overflow-auto rounded-lg border"
          style={{
            height: containerHeight,
            contain: 'strict',
          }}
          onScroll={handleScroll}
        >
          <VirtualTableHeader
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            height={HEADER_HEIGHT}
            visibleColumns={visibleColumns}
          />

          <div style={{ height: totalHeight, position: 'relative', contain: 'layout style' }}>
            {virtualItems.map(({ data: row, style, isExpanded, panelStyle }) => {
              if (!row) return null;
              return (
                <React.Fragment key={row.id}>
                  <VirtualTableRow
                    row={row}
                    style={style}
                    visibleColumns={visibleColumns}
                    density={density}
                    isExpanded={isExpanded}
                    onToggleExpand={() => handleToggleExpand(row.id)}
                    expandable={expandable}
                  />
                  {isExpanded && panelStyle && (
                    <div style={panelStyle} className="absolute left-0 right-0 z-10">
                      {renderExpanded ? (
                        renderExpanded(row)
                      ) : (
                        <RowDetailPanel row={row} onClose={() => handleToggleExpand(row.id)} />
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export { VirtualTableSkeleton };
export type {
  VirtualTableProps,
  TableRowData,
  SortField,
  SortDirection,
  ViewDensity,
  ColumnVisibility,
};
