'use client';

import React, { useMemo, useCallback, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/i18n';

import type { RealtimeComparisonItem } from '@/lib/types/oracle';
import { VirtualTableToolbar } from './VirtualTableToolbar';
import { VirtualTableHeader, type SortField, type SortDirection } from './VirtualTableHeader';
import { VirtualTableRow, type TableRowData } from './VirtualTableRow';
import { VirtualTableSkeleton } from './VirtualTableSkeleton';

interface VirtualTableProps {
  data?: RealtimeComparisonItem[];
  isLoading?: boolean;
  onExport?: (format: 'json' | 'csv') => void;
  rowHeight?: number;
  containerHeight?: number;
}

const HEADER_HEIGHT = 48;
const DEFAULT_ROW_HEIGHT = 52;
const DEFAULT_CONTAINER_HEIGHT = 600;
const OVERSCAN = 5;

export const VirtualTable = React.memo(function VirtualTable({
  data,
  isLoading,
  onExport,
  rowHeight = DEFAULT_ROW_HEIGHT,
  containerHeight = DEFAULT_CONTAINER_HEIGHT,
}: VirtualTableProps) {
  // i18n hook for future use
  useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('symbol');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 转换数据为表格格式 - 使用 for 循环优化性能
  const tableData = useMemo<TableRowData[]>(() => {
    if (!data) return [];

    // 预分配数组容量避免动态扩容
    let totalRows = 0;
    for (const item of data) {
      totalRows += item.protocols.length;
    }

    const result: TableRowData[] = new Array(totalRows);
    let index = 0;

    // 使用 for 循环代替 flatMap + map 提高性能
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

  // 筛选数据
  const filteredData = useMemo(() => {
    if (!searchTerm) return tableData;

    const term = searchTerm.toLowerCase();
    return tableData.filter(
      (row) => row.symbol.toLowerCase().includes(term) || row.protocol.toLowerCase().includes(term),
    );
  }, [tableData, searchTerm]);

  // 排序数据
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

  // 虚拟滚动计算
  const { virtualItems, totalHeight, startIndex, endIndex } = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
    const visibleCount = Math.ceil(containerHeight / rowHeight);
    const endIndex = Math.min(sortedData.length - 1, startIndex + visibleCount + OVERSCAN * 2);

    const virtualItems = [];
    for (let i = startIndex; i <= endIndex; i++) {
      virtualItems.push({
        index: i,
        data: sortedData[i],
        style: {
          position: 'absolute' as const,
          top: i * rowHeight,
          height: rowHeight,
          left: 0,
          right: 0,
        },
      });
    }

    return {
      virtualItems,
      totalHeight: sortedData.length * rowHeight,
      startIndex,
      endIndex,
    };
  }, [scrollTop, sortedData, rowHeight, containerHeight]);

  // 滚动处理 - 使用 requestAnimationFrame 节流
  const scrollTimeoutRef = useRef<number | null>(null);
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (scrollTimeoutRef.current) {
      cancelAnimationFrame(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = requestAnimationFrame(() => {
      setScrollTop(e.currentTarget.scrollTop);
    });
  }, []);

  // 排序处理
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
      />

      <CardContent>
        {/* 虚拟滚动表格 */}
        <div
          ref={containerRef}
          className="virtual-list-container overflow-auto rounded-lg border"
          style={{ height: containerHeight }}
          onScroll={handleScroll}
        >
          <VirtualTableHeader
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            height={HEADER_HEIGHT}
          />

          {/* 虚拟列表容器 */}
          <div style={{ height: totalHeight, position: 'relative' }}>
            {virtualItems.map(({ data: row, style }) => {
              if (!row) return null;
              return <VirtualTableRow key={row.id} row={row} style={style} />;
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
