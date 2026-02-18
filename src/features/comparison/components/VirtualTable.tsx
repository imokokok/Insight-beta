'use client';

import React, { useMemo, useCallback, useRef, useState } from 'react';

import {
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Search,
  Download,
  Settings2,
  AlignJustify,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';
import { exportRealtimeToCSV } from '@/shared/utils/export';
import type { RealtimeComparisonItem } from '@/types/oracle';
import { PROTOCOL_DISPLAY_NAMES } from '@/types/oracle';

import { RowDetailPanel } from './RowDetailPanel';

export type SortField = 'symbol' | 'price' | 'deviation' | 'spread' | 'latency' | 'updated';
export type SortDirection = 'asc' | 'desc';
export type ViewDensity = 'compact' | 'comfortable';

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
  expandable?: boolean;
  renderExpanded?: (row: TableRowData) => React.ReactNode;
}

interface VirtualTableHeaderProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  height: number;
  visibleColumns: ColumnVisibility;
}

interface VirtualTableRowProps {
  row: TableRowData;
  style: React.CSSProperties;
  visibleColumns: ColumnVisibility;
  density: ViewDensity;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  expandable?: boolean;
}

interface VirtualTableToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  totalRecords: number;
  startIndex: number;
  endIndex: number;
  data?: RealtimeComparisonItem[];
  onExport?: (format: 'json' | 'csv') => void;
  visibleColumns: ColumnVisibility;
  onVisibleColumnsChange: (columns: ColumnVisibility) => void;
  density: ViewDensity;
  onDensityChange: (density: ViewDensity) => void;
}

interface VirtualTableSkeletonProps {
  rowCount?: number;
}

interface StatusBadgeProps {
  status: 'active' | 'stale' | 'error' | string;
}

interface ColumnVisibility {
  symbol: boolean;
  protocol: boolean;
  price: boolean;
  deviation: boolean;
  spread: boolean;
  latency: boolean;
  status: boolean;
  confidence: boolean;
}

const HEADER_HEIGHT = 48;
const DEFAULT_CONTAINER_HEIGHT = 600;
const OVERSCAN = 5;

const DENSITY_CONFIG = {
  compact: {
    rowHeight: 44,
    padding: 'py-2',
    fontSize: 'text-xs',
  },
  comfortable: {
    rowHeight: 60,
    padding: 'py-3',
    fontSize: 'text-sm',
  },
};

const DEFAULT_COLUMN_VISIBILITY: ColumnVisibility = {
  symbol: true,
  protocol: true,
  price: true,
  deviation: true,
  spread: true,
  latency: true,
  status: true,
  confidence: true,
};

interface HeaderColumn {
  field: SortField | null;
  label: string;
  width: string;
  align: 'left' | 'right' | 'center';
  sortable: boolean;
  columnKey: keyof ColumnVisibility;
}

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
  const abs = Math.abs(deviation);
  if (abs > 0.02) return 'text-red-600 bg-red-50';
  if (abs > 0.01) return 'text-amber-600 bg-amber-50';
  if (abs > 0.005) return 'text-yellow-600 bg-yellow-50';
  return 'text-emerald-600 bg-emerald-50';
}

export function getLatencyColor(latency: number): string {
  if (latency > 5000) return 'text-red-600';
  if (latency > 1000) return 'text-yellow-600';
  return 'text-emerald-600';
}

export function getSpreadVariant(spreadPercent: number): 'default' | 'secondary' | 'destructive' {
  if (spreadPercent > 0.01) return 'destructive';
  if (spreadPercent > 0.005) return 'secondary';
  return 'default';
}

const formatters = createFormatters();

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

const VirtualTableHeader = React.memo(function VirtualTableHeader({
  sortField,
  sortDirection,
  onSort,
  height,
  visibleColumns,
}: VirtualTableHeaderProps) {
  const { t } = useI18n();

  const columns: HeaderColumn[] = [
    {
      field: 'symbol',
      label: t('comparison.table.assetPair'),
      width: 'w-[100px]',
      align: 'left',
      sortable: true,
      columnKey: 'symbol',
    },
    {
      field: null,
      label: t('comparison.table.protocol'),
      width: 'flex-1',
      align: 'left',
      sortable: false,
      columnKey: 'protocol',
    },
    {
      field: 'price',
      label: t('comparison.table.price'),
      width: 'w-[120px]',
      align: 'right',
      sortable: true,
      columnKey: 'price',
    },
    {
      field: 'deviation',
      label: t('comparison.table.deviation'),
      width: 'w-[120px]',
      align: 'right',
      sortable: true,
      columnKey: 'deviation',
    },
    {
      field: 'spread',
      label: t('comparison.table.spread'),
      width: 'w-[100px]',
      align: 'right',
      sortable: true,
      columnKey: 'spread',
    },
    {
      field: 'latency',
      label: t('comparison.table.latency'),
      width: 'w-[100px]',
      align: 'right',
      sortable: true,
      columnKey: 'latency',
    },
    {
      field: null,
      label: t('comparison.table.status'),
      width: 'w-[80px]',
      align: 'center',
      sortable: false,
      columnKey: 'status',
    },
    {
      field: null,
      label: t('comparison.table.confidence'),
      width: 'w-[80px]',
      align: 'right',
      sortable: false,
      columnKey: 'confidence',
    },
  ];

  const visibleColumnsList = columns.filter((col) => visibleColumns[col.columnKey]);

  return (
    <div
      className="sticky top-0 z-10 border-b bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/60"
      style={{ height, contain: 'layout style' }}
    >
      <div className="flex h-full items-center px-4 text-sm font-medium">
        {visibleColumnsList.map((col, index) => (
          <div
            key={index}
            className={`${col.width} ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}
          >
            {col.sortable && col.field ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSort(col.field as SortField)}
                className={cn(
                  'h-8 font-medium',
                  sortField === col.field && 'bg-primary/10 text-primary',
                )}
              >
                {col.label}
                {sortField === col.field ? (
                  sortDirection === 'asc' ? (
                    <ArrowUp className="ml-2 h-3 w-3" />
                  ) : (
                    <ArrowDown className="ml-2 h-3 w-3" />
                  )
                ) : null}
              </Button>
            ) : (
              col.label
            )}
          </div>
        ))}
        <div className="w-[50px]" />
      </div>
    </div>
  );
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

const VirtualTableToolbar = React.memo(function VirtualTableToolbar({
  searchTerm,
  onSearchChange,
  totalRecords,
  startIndex,
  endIndex,
  data,
  onExport,
  visibleColumns,
  onVisibleColumnsChange,
  density,
  onDensityChange,
}: VirtualTableToolbarProps) {
  const { t } = useI18n();

  const handleColumnToggle = (columnKey: keyof ColumnVisibility) => {
    onVisibleColumnsChange({
      ...visibleColumns,
      [columnKey]: !visibleColumns[columnKey],
    });
  };

  const handleSelectAll = () => {
    onVisibleColumnsChange(DEFAULT_COLUMN_VISIBILITY);
  };

  const handleDeselectAll = () => {
    const allHidden: ColumnVisibility = {
      symbol: false,
      protocol: false,
      price: false,
      deviation: false,
      spread: false,
      latency: false,
      status: false,
      confidence: false,
    };
    onVisibleColumnsChange(allHidden);
  };

  const columnOptions: { key: keyof ColumnVisibility; label: string }[] = [
    { key: 'symbol', label: t('comparison.table.assetPair') },
    { key: 'protocol', label: t('comparison.table.protocol') },
    { key: 'price', label: t('comparison.table.price') },
    { key: 'deviation', label: t('comparison.table.deviation') },
    { key: 'spread', label: t('comparison.table.spread') },
    { key: 'latency', label: t('comparison.table.latency') },
    { key: 'status', label: t('comparison.table.status') },
    { key: 'confidence', label: t('comparison.table.confidence') },
  ];

  return (
    <CardHeader className="pb-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">{t('comparison.table.title')}</CardTitle>
          <CardDescription className="mt-1 text-sm text-muted-foreground">
            {t('comparison.table.description')}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('comparison.table.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-64 pl-9"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="mr-1 h-4 w-4" />
                {t('comparison.table.columnConfig')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>{t('comparison.table.visibleColumns')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columnOptions.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.key}
                  checked={visibleColumns[option.key]}
                  onCheckedChange={() => handleColumnToggle(option.key)}
                >
                  {option.label}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <div className="flex gap-1 px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 flex-1 text-xs"
                  onClick={handleSelectAll}
                >
                  {t('comparison.table.selectAll')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 flex-1 text-xs"
                  onClick={handleDeselectAll}
                >
                  {t('comparison.table.deselectAll')}
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <AlignJustify className="mr-1 h-4 w-4" />
                {density === 'compact'
                  ? t('comparison.table.densityCompact')
                  : t('comparison.table.densityComfortable')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onDensityChange('compact')}>
                <span className={cn(density === 'compact' && 'font-semibold')}>
                  {t('comparison.table.densityCompact')}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDensityChange('comfortable')}>
                <span className={cn(density === 'comfortable' && 'font-semibold')}>
                  {t('comparison.table.densityComfortable')}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
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

      <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
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

export {
  VirtualTableHeader,
  VirtualTableRow,
  VirtualTableToolbar,
  VirtualTableSkeleton,
  StatusBadge,
};
export type { VirtualTableProps };
