'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';
import { useI18n } from '@/i18n';

export type SortField = 'symbol' | 'price' | 'deviation' | 'spread' | 'latency' | 'updated';
export type SortDirection = 'asc' | 'desc';

interface VirtualTableHeaderProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  height: number;
}

interface HeaderColumn {
  field: SortField | null;
  label: string;
  width: string;
  align: 'left' | 'right' | 'center';
  sortable: boolean;
}

export const VirtualTableHeader = React.memo(function VirtualTableHeader({
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
