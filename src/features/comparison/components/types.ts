import type { RealtimeComparisonItem } from '@/types/oracle';

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

export interface VirtualTableProps {
  data?: RealtimeComparisonItem[];
  isLoading?: boolean;
  onExport?: (format: 'json' | 'csv') => void;
  rowHeight?: number;
  containerHeight?: number;
  expandable?: boolean;
  renderExpanded?: (row: TableRowData) => React.ReactNode;
}

export interface VirtualTableHeaderProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  height: number;
  visibleColumns: ColumnVisibility;
}

export interface VirtualTableRowProps {
  row: TableRowData;
  style: React.CSSProperties;
  visibleColumns: ColumnVisibility;
  density: ViewDensity;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  expandable?: boolean;
}

export interface VirtualTableToolbarProps {
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

export interface VirtualTableSkeletonProps {
  rowCount?: number;
}

export interface StatusBadgeProps {
  status: 'active' | 'stale' | 'error' | string;
}

export interface ColumnVisibility {
  symbol: boolean;
  protocol: boolean;
  price: boolean;
  deviation: boolean;
  spread: boolean;
  latency: boolean;
  status: boolean;
  confidence: boolean;
}

export interface HeaderColumn {
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

export const HEADER_HEIGHT = 48;
export const DEFAULT_CONTAINER_HEIGHT = 600;
export const OVERSCAN = 5;

export const DENSITY_CONFIG = {
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
} as const;

export const DEFAULT_COLUMN_VISIBILITY: ColumnVisibility = {
  symbol: true,
  protocol: true,
  price: true,
  deviation: true,
  spread: true,
  latency: true,
  status: true,
  confidence: true,
};

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

export const formatters = createFormatters();
