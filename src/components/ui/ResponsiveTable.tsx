'use client';

import React, { useState, useCallback, useMemo } from 'react';

import { motion, AnimatePresence } from 'framer-motion';

import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/shared/utils';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './Table';

export interface ColumnDef<T = Record<string, unknown>> {
  key: keyof T | string;
  header: string;
  priority: 'primary' | 'secondary' | 'tertiary';
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
}

export interface ResponsiveTableProps<T = Record<string, unknown>> {
  columns: ColumnDef<T>[];
  data: T[];
  breakpoint?: 'sm' | 'md' | 'lg';
  cardTitleField?: keyof T | string;
  cardSubtitleField?: keyof T | string;
  onRowClick?: (row: T) => void;
  className?: string;
  emptyMessage?: string;
  rowKeyField?: keyof T | string;
}

const BREAKPOINT_VALUES: Record<'sm' | 'md' | 'lg', number> = {
  sm: 640,
  md: 768,
  lg: 1024,
};

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    className={cn('h-4 w-4 transition-transform duration-200', expanded && 'rotate-180')}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

interface CardItemProps<T = Record<string, unknown>> {
  row: T;
  columns: ColumnDef<T>[];
  cardTitleField?: keyof T | string;
  cardSubtitleField?: keyof T | string;
  onRowClick?: (row: T) => void;
  rowKey: string;
}

function CardItem<T = Record<string, unknown>>({
  row,
  columns,
  cardTitleField,
  cardSubtitleField,
  onRowClick,
  rowKey,
}: CardItemProps<T>) {
  const [isExpanded, setIsExpanded] = useState(false);

  const primaryColumns = useMemo(
    () => columns.filter((col) => col.priority === 'primary'),
    [columns],
  );

  const secondaryColumns = useMemo(
    () => columns.filter((col) => col.priority === 'secondary'),
    [columns],
  );

  const tertiaryColumns = useMemo(
    () => columns.filter((col) => col.priority === 'tertiary'),
    [columns],
  );

  const titleColumn = cardTitleField
    ? columns.find((col) => col.key === cardTitleField)
    : primaryColumns[0];

  const subtitleColumn = cardSubtitleField
    ? columns.find((col) => col.key === cardSubtitleField)
    : null;

  const handleCardClick = useCallback(() => {
    if (onRowClick) {
      onRowClick(row);
    }
  }, [onRowClick, row]);

  const handleExpandClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  }, []);

  const hasExpandableContent = tertiaryColumns.length > 0;

  const renderCellValue = (col: ColumnDef<T>): React.ReactNode => {
    const value = (row as Record<string, unknown>)[col.key as string];
    if (col.render) {
      return col.render(value, row);
    }
    if (value === null || value === undefined) {
      return '-';
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return '-';
  };

  return (
    <motion.div
      key={rowKey}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'glass-card rounded-xl border border-white/60 p-4 transition-all duration-300',
        'hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5',
        onRowClick && 'cursor-pointer',
      )}
      onClick={handleCardClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {titleColumn && (
            <div className="mb-1 truncate text-base font-semibold text-foreground">
              {renderCellValue(titleColumn)}
            </div>
          )}
          {subtitleColumn && (
            <div className="mb-2 truncate text-sm text-muted-foreground">
              {renderCellValue(subtitleColumn)}
            </div>
          )}
        </div>
        {hasExpandableContent && (
          <button
            onClick={handleExpandClick}
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
              'bg-muted/50 text-muted-foreground transition-colors',
              'hover:bg-muted hover:text-foreground',
            )}
            aria-label={isExpanded ? '收起详情' : '展开详情'}
          >
            <ChevronIcon expanded={isExpanded} />
          </button>
        )}
      </div>

      {primaryColumns.length > 1 && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {primaryColumns
            .filter((col) => col.key !== cardTitleField && col.key !== cardSubtitleField)
            .map((col) => (
              <div key={String(col.key)} className="min-w-0">
                <div className="mb-0.5 text-xs font-medium text-muted-foreground">{col.header}</div>
                <div className={cn('truncate text-sm text-foreground', col.className)}>
                  {renderCellValue(col)}
                </div>
              </div>
            ))}
        </div>
      )}

      {secondaryColumns.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {secondaryColumns.map((col) => (
            <div key={String(col.key)} className="min-w-0">
              <div className="mb-0.5 text-xs font-medium text-muted-foreground">{col.header}</div>
              <div className={cn('truncate text-sm text-foreground', col.className)}>
                {renderCellValue(col)}
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence initial={false}>
        {isExpanded && tertiaryColumns.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-3 border-t border-border/50 pt-3">
              <div className="mb-2 text-xs font-medium text-muted-foreground">详细信息</div>
              <div className="grid grid-cols-2 gap-3">
                {tertiaryColumns.map((col) => (
                  <div key={String(col.key)} className="min-w-0">
                    <div className="mb-0.5 text-xs text-muted-foreground">{col.header}</div>
                    <div className={cn('truncate text-sm text-foreground', col.className)}>
                      {renderCellValue(col)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function ResponsiveTable<T = Record<string, unknown>>({
  columns,
  data,
  breakpoint = 'md',
  cardTitleField,
  cardSubtitleField,
  onRowClick,
  className,
  emptyMessage = '暂无数据',
  rowKeyField = 'id',
}: ResponsiveTableProps<T>) {
  const breakpointValue = BREAKPOINT_VALUES[breakpoint];
  const isMobile = !useMediaQuery(`(min-width: ${breakpointValue}px)`);

  const sortedColumns = useMemo(
    () =>
      [...columns].sort((a, b) => {
        const priorityOrder = { primary: 0, secondary: 1, tertiary: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }),
    [columns],
  );

  const getRowKey = useCallback(
    (row: T, index: number) => {
      return (row as Record<string, unknown>)[rowKeyField as string] ?? index;
    },
    [rowKeyField],
  );

  if (!data || data.length === 0) {
    return (
      <div
        className={cn('flex items-center justify-center py-12 text-muted-foreground', className)}
      >
        {emptyMessage}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className={cn('space-y-3', className)}>
        <AnimatePresence mode="popLayout">
          {data.map((row, index) => (
            <CardItem
              key={String(getRowKey(row, index))}
              row={row}
              columns={columns}
              cardTitleField={cardTitleField}
              cardSubtitleField={cardSubtitleField}
              onRowClick={onRowClick}
              rowKey={String(getRowKey(row, index))}
            />
          ))}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {sortedColumns.map((col) => (
              <TableHead key={String(col.key)} className={col.className}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow
              key={String(getRowKey(row, index))}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'cursor-pointer' : undefined}
            >
              {sortedColumns.map((col) => {
                const value = (row as Record<string, unknown>)[col.key as string];
                const cellContent: React.ReactNode = col.render
                  ? col.render(value, row)
                  : value === null || value === undefined
                    ? '-'
                    : typeof value === 'string' ||
                        typeof value === 'number' ||
                        typeof value === 'boolean'
                      ? String(value)
                      : '-';
                return (
                  <TableCell key={String(col.key)} className={col.className}>
                    {cellContent}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default ResponsiveTable;
