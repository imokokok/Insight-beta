'use client';

import { useState, useCallback } from 'react';

import { Download, FileJson, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui';
import { useI18n } from '@/i18n';

type ExportFormat = 'json' | 'csv' | 'excel';

export interface ExportConfig<T> {
  filenamePrefix: string;
  generateCSV: (data: T) => string;
  generateExcel: (data: T) => string;
}

export interface ExportButtonProps<T> {
  data: T | null;
  config: ExportConfig<T>;
  disabled?: boolean;
}

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportButton<T>({ data, config, disabled }: ExportButtonProps<T>) {
  const { t } = useI18n();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (!data) return;

      setIsExporting(true);

      try {
        await new Promise((resolve) => setTimeout(resolve, 100));

        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `${config.filenamePrefix}-${timestamp}`;

        switch (format) {
          case 'json': {
            const content = JSON.stringify(data, null, 2);
            downloadFile(content, `${filename}.json`, 'application/json');
            break;
          }
          case 'csv': {
            const content = config.generateCSV(data);
            downloadFile(content, `${filename}.csv`, 'text/csv;charset=utf-8');
            break;
          }
          case 'excel': {
            const content = config.generateExcel(data);
            downloadFile(content, `${filename}.xls`, 'application/vnd.ms-excel');
            break;
          }
        }
      } finally {
        setIsExporting(false);
      }
    },
    [data, config],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || !data || isExporting}>
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {isExporting ? t('common.exporting') : t('common.export')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('json')} className="cursor-pointer">
          <FileJson className="mr-2 h-4 w-4" />
          JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('csv')} className="cursor-pointer">
          <FileText className="mr-2 h-4 w-4" />
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('excel')} className="cursor-pointer">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { escapeCSV, escapeXML, downloadFile };
