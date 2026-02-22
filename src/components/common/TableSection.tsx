'use client';

import { memo } from 'react';

import { cn } from '@/shared/utils';

export interface TableSectionColumn<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T, index: number) => React.ReactNode;
}

export interface TableSectionProps<T> {
  columns: TableSectionColumn<T>[];
  data: T[];
  title?: string;
  description?: string;
  className?: string;
  rowKey?: keyof T | ((item: T) => string);
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  bordered?: boolean;
}

export function TableSection<T extends Record<string, unknown>>({
  columns,
  data,
  title,
  description,
  className,
  rowKey,
  onRowClick,
  emptyMessage = '暂无数据',
  striped = false,
  hoverable = true,
  compact = false,
  bordered = false,
}: TableSectionProps<T>) {
  const getRowKey = (item: T, index: number): string => {
    if (rowKey) {
      if (typeof rowKey === 'function') {
        return rowKey(item);
      }
      return String(item[rowKey as keyof T]);
    }
    return String(index);
  };

  const getCellValue = (item: T, column: TableSectionColumn<T>, index: number): React.ReactNode => {
    if (column.render) {
      return column.render(item, index);
    }
    const key = column.key as keyof T;
    const value = item[key];
    if (value === null || value === undefined) {
      return '-';
    }
    return String(value);
  };

  return (
    <div className={cn('rounded-xl border border-border/30 bg-card/30', className)}>
      {(title || description) && (
        <div className="border-b border-border/30 px-4 py-3">
          {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/30 bg-muted/30">
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    'px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    compact ? 'py-2' : 'py-3',
                  )}
                  style={{ width: column.width }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, rowIndex) => (
                <tr
                  key={getRowKey(item, rowIndex)}
                  className={cn(
                    striped && rowIndex % 2 === 1 && 'bg-muted/20',
                    hoverable && 'transition-colors hover:bg-muted/30',
                    bordered && 'border-b border-border/20 last:border-b-0',
                    onRowClick && 'cursor-pointer',
                    compact ? 'text-sm' : '',
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((column, colIndex) => (
                    <td
                      key={String(column.key)}
                      className={cn(
                        'px-4 text-foreground',
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right',
                        compact ? 'py-2' : 'py-3',
                        colIndex === 0 && 'font-medium',
                      )}
                    >
                      {getCellValue(item, column, rowIndex)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export interface DataPanelProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  noPadding?: boolean;
}

export const DataPanel = memo(function DataPanel({
  title,
  description,
  children,
  className,
  action,
  noPadding = false,
}: DataPanelProps) {
  return (
    <div className={cn('rounded-xl border border-border/30 bg-card/30', className)}>
      {(title || description || action) && (
        <div className="flex items-start justify-between border-b border-border/30 px-4 py-3">
          <div>
            {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={cn(!noPadding && 'p-4')}>{children}</div>
    </div>
  );
});

export default TableSection;
