'use client';

import React from 'react';

import { Search, Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/i18n';
import type { RealtimeComparisonItem } from '@/lib/types/oracle';
import { exportRealtimeToCSV } from '@/lib/utils/export';

interface VirtualTableToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  totalRecords: number;
  startIndex: number;
  endIndex: number;
  data?: RealtimeComparisonItem[];
  onExport?: (format: 'json' | 'csv') => void;
}

export const VirtualTableToolbar = React.memo(function VirtualTableToolbar({
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

      {/* 统计信息 */}
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
