'use client';

import React, { useMemo, useCallback, useRef, useState } from 'react';

import {
  ArrowUpDown,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Search,
  Download,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/i18n';
import { statusColors } from '@/lib/constants/colors';
import type { RealtimeComparisonItem } from '@/lib/types/oracle';
import { PROTOCOL_DISPLAY_NAMES } from '@/lib/types/oracle';
import { cn } from '@/lib/utils';
import { exportRealtimeToCSV } from '@/lib/utils/export';

// ============================================================================
// Types
// ============================================================================

export type SortField = 'symbol' | 'price' | 'deviation' | 'spread' | 'latency' | 'updated';
export type SortDirection = 'asc' | 'desc';

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

interface VirtualTableProps {
  data?: RealtimeComparisonItem[];
  isLoading?: boolean;
  onExport?: (format: 'json' | 'csv') => void;
  rowHeight?: number;
  containerHeight?: number;
}

interface VirtualTableHeaderProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  height: number;
}

interface VirtualTableRowProps {
  row: TableRowData;
  style: React.CSSProperties;
}

interface VirtualTableToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  totalRecords: number;
  startIndex: number;
  endIndex: number;
  data?: RealtimeComparisonItem[];
  onExport?: (format: 'json' | 'csv') => void;
}

interface VirtualTableSkeletonProps {
  rowCount?: number;
}

interface StatusBadgeProps {
  status: 'active' | 'stale' | 'error' | string;
}

// ============================================================================
// Constants
// ============================================================================

const HEADER_HEIGHT = 48;
const DEFAULT_ROW_HEIGHT = 52;
const DEFAULT_CONTAINER_HEIGHT = 600;
const OVERSCAN = 5;

interface HeaderColumn {
  field: SortField | null;
  label: string;
  width: string;
  align: 'left' | 'right' | 'center';
  sortable: boolean;
}

// ============================================================================
// Formatters
// ============================================================================

export interface TableFormatters {
  price: (price: number) => string;
  deviation: (value: number) => string;
  latency: (ms: number) => string;
}

export function createFormatters(): TableFormatters {
  return {
    price: (price: number) => {
      if (price >= 1000) return `$${price.toLocaleString()}`;
      if (price >= 1) return `$${price.toFixed(2)}`;
      return `$${price.toFixed(4)}`;
    },
    deviation: (value: number) => {
      // value 是小数形式 (如 0.01 = 1%)，转换为百分比显示
      const percentValue = Math.abs(value) * 100;
      if (percentValue < 0.01) return '<0.01%';
      return `${percentValue.toFixed(2)}%`;
    },
    latency: (ms: number) => {
      if (ms < 1000) return `${ms.toFixed(0)}ms`;
      return `${(ms / 1000).toFixed(1)}s`;
    },
  };
}

export function getDeviationColor(deviation: number): string {
  // deviation 是小数形式 (如 0.01 = 1%)
  const abs = Math.abs(deviation);
  if (abs > 0.02) return 'text-red-600 bg-red-50';
  if (abs > 0.01) return 'text-orange-600 bg-orange-50';
  if (abs > 0.005) return 'text-yellow-600 bg-yellow-50';
  return 'text-emerald-600 bg-emerald-50';
}

export function getLatencyColor(latency: number): string {
  if (latency > 5000) return 'text-red-600';
  if (latency > 1000) return 'text-yellow-600';
  return 'text-emerald-600';
}

export function getSpreadVariant(spreadPercent: number): 'default' | 'secondary' | 'destructive' {
  // spreadPercent 是小数形式 (如 0.01 = 1%)
  if (spreadPercent > 0.01) return 'destructive';
  if (spreadPercent > 0.005) return 'secondary';
  return 'default';
}

const formatters = createFormatters();

// ============================================================================
// Sub-components
// ============================================================================

const StatusBadge = React.memo(function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useI18n();

  switch (status) {
    case 'active':
      return (
        <Badge
          variant="default"
          className={cn(statusColors.active.dot, 'text-xs')}
          role="status"
          aria-label={t('status.active')}
        >
          {t('comparison.status.active')}
        </Badge>
      );
    case 'stale':
      return (
        <Badge
          variant="secondary"
          className={cn(statusColors.stale.bg, statusColors.stale.text, 'text-xs')}
          role="status"
          aria-label={t('status.stale')}
        >
          {t('comparison.status.stale')}
        </Badge>
      );
    case 'error':
      return (
        <Badge
          variant="destructive"
          className="text-xs"
          role="status"
          aria-label={t('status.error')}
        >
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

const VirtualTableHeader = React.memo(function VirtualTableHeader({
  onSort,
  height,
}: VirtualTableHeaderProps) {
  const { t } = useI18n();

  const columns: HeaderColumn[] = [
    {
      field: 'symbol',
      label: t('comparison.table.assetPair'),
      width: 'w-[100px]',
      align: 'left',
      sortable: true,
    },
    {
      field: null,
      label: t('comparison.table.protocol'),
      width: 'flex-1',
      align: 'left',
      sortable: false,
    },
    {
      field: 'price',
      label: t('comparison.table.price'),
      width: 'w-[120px]',
      align: 'right',
      sortable: true,
    },
    {
      field: 'deviation',
      label: t('comparison.table.deviation'),
      width: 'w-[120px]',
      align: 'right',
      sortable: true,
    },
    {
      field: 'spread',
      label: t('comparison.table.spread'),
      width: 'w-[100px]',
      align: 'right',
      sortable: true,
    },
    {
      field: 'latency',
      label: t('comparison.table.latency'),
      width: 'w-[100px]',
      align: 'right',
      sortable: true,
    },
    {
      field: null,
      label: t('comparison.table.status'),
      width: 'w-[80px]',
      align: 'center',
      sortable: false,
    },
    {
      field: null,
      label: t('comparison.table.confidence'),
      width: 'w-[80px]',
      align: 'right',
      sortable: false,
    },
    { field: null, label: '', width: 'w-[50px]', align: 'left', sortable: false },
  ];

  return (
    <div
      className="bg-muted/95 supports-[backdrop-filter]:bg-muted/60 sticky top-0 z-10 border-b backdrop-blur"
      style={{ height }}
    >
      <div className="flex h-full items-center px-4 text-sm font-medium">
        {columns.map((col, index) => (
          <div
            key={index}
            className={`${col.width} ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}
          >
            {col.sortable && col.field ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSort(col.field as SortField)}
                className="h-8 font-medium"
              >
                {col.label}
                <ArrowUpDown className="ml-2 h-3 w-3" />
              </Button>
            ) : (
              col.label
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

const VirtualTableRow = React.memo(function VirtualTableRow({ row, style }: VirtualTableRowProps) {
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
          ±{(row.spreadPercent * 100).toFixed(2)}%
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

const VirtualTableToolbar = React.memo(function VirtualTableToolbar({
  searchTerm,
  onSearchChange,
  totalRecords,
  startIndex,
  endIndex,
  data,
  onExport,
}: VirtualTableToolbarProps) {
  const { t } = useI18n();

  return (
    <CardHeader className="pb-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">{t('comparison.table.title')}</CardTitle>
          <CardDescription className="text-muted-foreground mt-1 text-sm">
            {t('comparison.table.description')}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
            <Input
              placeholder={t('comparison.table.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-64 pl-9"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="outline" size="sm">
                <Download className="mr-1 h-4 w-4" />
                {t('comparison.controls.export')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => data && exportRealtimeToCSV(data)}>
                {t('comparison.controls.exportCSV')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport?.('json')}>
                {t('comparison.controls.exportJSON')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="text-muted-foreground mt-4 flex items-center gap-4 text-sm">
        <span>
          {t('comparison.table.total')}: <strong className="text-foreground">{totalRecords}</strong>{' '}
          {t('comparison.table.records')}
        </span>
        <span>
          {t('comparison.table.showing')}:{' '}
          <strong className="text-foreground">
            {startIndex + 1} - {Math.min(endIndex + 1, totalRecords)}
          </strong>
        </span>
        {searchTerm && (
          <span>
            {t('comparison.table.search')}:{' '}
            <strong className="text-foreground">&quot;{searchTerm}&quot;</strong>
          </span>
        )}
      </div>
    </CardHeader>
  );
});

const VirtualTableSkeleton = React.memo(function VirtualTableSkeleton({
  rowCount = 10,
}: VirtualTableSkeletonProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
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

// ============================================================================
// Main Component
// ============================================================================

export const VirtualTable = React.memo(function VirtualTable({
  data,
  isLoading,
  onExport,
  rowHeight = DEFAULT_ROW_HEIGHT,
  containerHeight = DEFAULT_CONTAINER_HEIGHT,
}: VirtualTableProps) {
  useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('symbol');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 转换数据为表格格式
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

  // 滚动处理
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

export {
  VirtualTableHeader,
  VirtualTableRow,
  VirtualTableToolbar,
  VirtualTableSkeleton,
  StatusBadge,
};
export type { VirtualTableProps };
