'use client';

import React from 'react';

import { Search, Download, Settings2, AlignJustify } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';
import { exportRealtimeToCSV } from '@/shared/utils/export';

import { DEFAULT_COLUMN_VISIBILITY } from './types';

import type { VirtualTableToolbarProps, ColumnVisibility } from './types';

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

export { VirtualTableToolbar };
