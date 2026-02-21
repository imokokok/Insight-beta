'use client';

import React from 'react';

import { ArrowUp, ArrowDown } from 'lucide-react';

import { Button } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

import type { VirtualTableHeaderProps, SortField, HeaderColumn } from './types';

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

export { VirtualTableHeader };
