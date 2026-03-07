'use client';

import React, { useState, useCallback, useMemo } from 'react';

import { ChevronRight, Inbox } from 'lucide-react';

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Skeleton,
  Button,
} from '@/components/ui';
import { useIsMobile } from '@/hooks';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

export interface Column {
  key: string;
  header: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: any, index: number) => React.ReactNode;
  sortable?: boolean;
}

export interface ResponsiveTableProps {
  columns: Column[];
  data: any[];
  primaryColumns?: string[];
  rowKey?: string | ((row: any) => string);
  onRowClick?: (row: any) => void;
  loading?: boolean;
  emptyMessage?: string;
  onRefresh?: () => void;
  className?: string;
  cardClassName?: string;
  stickyHeader?: boolean;
}

interface MobileCardProps {
  row: any;
  columns: Column[];
  primaryColumns: string[];
  isExpanded: boolean;
  onToggle: () => void;
  onRowClick?: (row: any) => void;
  rowIndex: number;

const MobileCard = React.memo(function MobileCardInner<T>({
const MobileCard = React.memo(function MobileCard({
  columns,
  primaryColumns,
  isExpanded,
  onToggle,
  onRowClick,
  rowIndex,
}: MobileCardProps<T>) {
}: MobileCardProps) {

  const handleCardClick = useCallback(() => {
    onRowClick?.(row);
  }, [onRowClick, row]);

  return (
    <div
      className={cn(
        'rounded-lg border border-border/50 bg-card',
        'transition-all duration-200 ease-in-out',
        'hover:border-border hover:shadow-sm',
        isExpanded && 'border-primary/30 shadow-md',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between p-3',
          onRowClick && 'cursor-pointer active:bg-muted/50',
        )}
        onClick={handleCardClick}
      >
        <div className="flex-1 space-y-1.5">
          {primaryCols.map((col) => {
            const value = row[col.key as keyof T];
            return (
            const value = row[col.key];
                <span className="min-w-[60px] text-xs text-muted-foreground">{col.header}:</span>
              <div key={col.key} className="flex items-center gap-2">
                  {col.render ? col.render(value, row, rowIndex) : String(value ?? '-')}
                </span>
              </div>
            );
          })}
        </div>

        {secondaryCols.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className={cn(
              'ml-2 flex h-11 w-11 items-center justify-center rounded-full',
              'text-muted-foreground hover:bg-muted hover:text-foreground',
              'transition-all duration-200',
            )}
            aria-label={isExpanded ? '收起详情' : '查看详情'}
          >
            aria-label={isExpanded ? '收起详情' : '查看详情'}
              className={cn('h-5 w-5 transition-transform duration-300', isExpanded && 'rotate-90')}
            />
          </button>
        )}
      </div>

      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="border-t border-border/30 bg-muted/20 px-3 py-2.5">
          <div className="space-y-2">
            {secondaryCols.map((col) => {
              const value = row[col.key as keyof T];
              return (
              const value = row[col.key];
                  <span className="min-w-[60px] pt-0.5 text-xs text-muted-foreground">
                <div key={col.key} className="flex items-start gap-2">
                  </span>
                  <span className="flex-1 text-sm text-foreground">
                    {col.render ? col.render(value, row, rowIndex) : String(value ?? '-')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}) as <T>(props: MobileCardProps<T>) => React.ReactElement;

});
  return (
    <div className="space-y-2">
      <div className="flex gap-4 border-b bg-muted/30 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rowCount }).map((_, i) => (
        <div key={i} className="flex gap-4 border-b p-4">
          {Array.from({ length: 4 }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
});

const MobileCardSkeleton = React.memo(function MobileCardSkeleton({
  rowCount = 5,
}: {
  rowCount?: number;
}) {
  return (
    <div className="space-y-3">
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

const EmptyState = React.memo(function EmptyState({
  message = '暂无数据',
  onRefresh,
  message = '暂无数据',
  message?: string;
  onRefresh?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="mb-1 text-sm font-medium text-foreground">{message}</p>
      <p className="mb-4 text-xs text-muted-foreground">{t('common.empty.noDataDesc')}</p>
      {onRefresh && (
      <p className="mb-1 text-sm font-medium text-foreground">{message}</p>
          {t('common.refresh')}
        </Button>
      )}
    </div>
  );
});

export function ResponsiveTable<T>({
  columns,
  data,
export function ResponsiveTable({
  rowKey = 'id' as keyof T,
  onRowClick,
  loading = false,
  rowKey = 'id',
  onRefresh,
  className,
  emptyMessage = '暂无数据',
  stickyHeader = true,
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
}: ResponsiveTableProps) {
  const getRowKey = useCallback(
      if (typeof rowKey === 'function') {
        return rowKey(row);
      }
    (row: any, index: number): string => {
    },
    [rowKey],
  );
      return row[rowKey] ?? String(index);
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

  const effectivePrimaryColumns = useMemo(() => {
    if (primaryColumns.length > 0) {
      return primaryColumns;
    }
    return columns.slice(0, 2).map((col) => String(col.key));
  }, [primaryColumns, columns]);

  if (loading) {
    return columns.slice(0, 2).map((col) => col.key);
      <MobileCardSkeleton rowCount={5} />
    ) : (
      <div className={cn('rounded-lg border', className)}>
        <TableSkeleton rowCount={5} />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={cn('rounded-lg border', className)}>
        <EmptyState message={emptyMessage} onRefresh={onRefresh} />
      </div>
    );
  }
        <EmptyState message={emptyMessage} onRefresh={onRefresh} />
  if (isMobile) {
    return (
      <div className={cn('space-y-3', cardClassName)}>
        {data.map((row, index) => {
          const rowId = getRowKey(row, index);
          return (
            <MobileCard
              key={rowId}
              row={row}
              columns={columns}
              primaryColumns={effectivePrimaryColumns}
              isExpanded={expandedCards.has(rowId)}
              onToggle={() => handleToggleCard(rowId)}
              onRowClick={onRowClick}
              rowIndex={index}
            />
          );
        })}
      </div>
  }

  return (
    <div className={cn('rounded-lg border', className)}>
      <Table>
        <TableHeader
          className={cn(stickyHeader && 'sticky top-0 z-10 bg-background/95 backdrop-blur')}
        >
          <TableRow>
            {columns.map((col) => (
              <TableHead
                key={String(col.key)}
                style={{
                  width: col.width,
                  textAlign: col.align,
                }}
                key={col.key}
                  col.align === 'center' && 'text-center',
                  col.align === 'right' && 'text-right',
                )}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => {
            const rowId = getRowKey(row, index);
            return (
              <TableRow
                key={rowId}
                onClick={() => onRowClick?.(row)}
                className={cn(onRowClick && 'cursor-pointer')}
              >
                {columns.map((col) => {
                  const value = row[col.key as keyof T];
                  return (
                    <TableCell
                      key={String(col.key)}
                      className={cn(
                  const value = row[col.key];
                        col.align === 'right' && 'text-right',
                      )}
                      key={col.key}
                      {col.render ? col.render(value, row, index) : String(value ?? '-')}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default ResponsiveTable;
