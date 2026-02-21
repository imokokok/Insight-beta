'use client';

import React, { useMemo, useCallback, useRef, useState } from 'react';

import { Card, CardContent } from '@/components/ui';
import { Skeleton } from '@/components/ui';

import { RowDetailPanel } from './RowDetailPanel';
import {
  DEFAULT_CONTAINER_HEIGHT,
  HEADER_HEIGHT,
  OVERSCAN,
  DENSITY_CONFIG,
  DEFAULT_COLUMN_VISIBILITY,
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

export const VirtualTable = React.memo(function VirtualTable({
  data,
  isLoading,
  onExport,
  containerHeight = DEFAULT_CONTAINER_HEIGHT,
  expandable = true,
  renderExpanded,
}: VirtualTableProps) {
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
