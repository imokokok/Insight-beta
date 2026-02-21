'use client';

import { useState, useCallback } from 'react';
import type { RefObject } from 'react';

import { Download, FileImage, FileJson, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';
import {
  exportChartAsPNG,
  exportChartAsSVG,
  exportDataAsCSV,
  exportDataAsJSON,
} from '@/utils/chartExport';

type ChartExportFormat = 'png' | 'svg' | 'csv' | 'json';
type DataExportFormat = 'json' | 'csv' | 'excel';

export function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ExportConfig<T> {
  filenamePrefix: string;
  generateCSV: (data: T) => string;
  generateExcel: (data: T) => string;
}

export interface ChartExportButtonProps {
  chartRef: RefObject<HTMLElement | null>;
  data?: object[];
  filename?: string;
  className?: string;
  watermark?: string;
  showTimestamp?: boolean;
  disabled?: boolean;
}

export interface DataExportButtonProps<T> {
  data: T | null;
  config: ExportConfig<T>;
  disabled?: boolean;
  className?: string;
}

export type ExportButtonProps<T = unknown> = ChartExportButtonProps | DataExportButtonProps<T>;

function hasConfig<T>(props: ExportButtonProps<T>): props is DataExportButtonProps<T> {
  return 'config' in props;
}

export function ExportButton<T = unknown>(props: ExportButtonProps<T>) {
  const { t } = useI18n();
  const [isExporting, setIsExporting] = useState(false);
  const [currentFormat, setCurrentFormat] = useState<ChartExportFormat | DataExportFormat | null>(
    null,
  );

  const handleChartExport = useCallback(
    async (format: ChartExportFormat, chartProps: ChartExportButtonProps) => {
      const {
        chartRef,
        data,
        filename = 'chart',
        watermark = 'Insight Beta',
        showTimestamp = true,
      } = chartProps;

      setIsExporting(true);
      setCurrentFormat(format);

      try {
        switch (format) {
          case 'png':
            if (!chartRef.current) {
              throw new Error('Chart element not found');
            }
            await exportChartAsPNG(chartRef.current, {
              filename,
              watermark,
              timestamp: showTimestamp,
            });
            break;

          case 'svg':
            if (!chartRef.current) {
              throw new Error('Chart element not found');
            }
            await exportChartAsSVG(chartRef.current, {
              filename,
              watermark,
              timestamp: showTimestamp,
            });
            break;

          case 'csv':
            if (!data || data.length === 0) {
              throw new Error('No data available for CSV export');
            }
            exportDataAsCSV(data, filename);
            break;

          case 'json':
            if (!data || data.length === 0) {
              throw new Error('No data available for JSON export');
            }
            exportDataAsJSON(data, filename);
            break;
        }

        toast.success(t('common.exportSuccess'));
      } catch (error) {
        toast.error(t('common.exportFailed'), {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        setIsExporting(false);
        setCurrentFormat(null);
      }
    },
    [t],
  );

  const handleDataExport = useCallback(
    async (format: DataExportFormat, dataProps: DataExportButtonProps<T>) => {
      const { data, config } = dataProps;

      if (!data) return;

      setIsExporting(true);
      setCurrentFormat(format);

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

        toast.success(t('common.exportSuccess'));
      } catch (error) {
        toast.error(t('common.exportFailed'), {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        setIsExporting(false);
        setCurrentFormat(null);
      }
    },
    [t],
  );

  if (hasConfig(props)) {
    const { data, disabled, className } = props;
    const hasData = !!data;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || !hasData || isExporting}
            className={cn(className)}
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isExporting ? t('common.exporting') : t('common.export')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={() => handleDataExport('json', props)}
            disabled={!hasData || isExporting}
            className="cursor-pointer"
          >
            {currentFormat === 'json' && isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileJson className="mr-2 h-4 w-4" />
            )}
            JSON
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleDataExport('csv', props)}
            disabled={!hasData || isExporting}
            className="cursor-pointer"
          >
            {currentFormat === 'csv' && isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            CSV
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleDataExport('excel', props)}
            disabled={!hasData || isExporting}
            className="cursor-pointer"
          >
            {currentFormat === 'excel' && isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="mr-2 h-4 w-4" />
            )}
            Excel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const { chartRef, data, disabled, className } = props;
  const hasChart = !!chartRef?.current;
  const hasData = !!data && data.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isExporting}
          className={cn(className)}
        >
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('common.exporting')}
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              {t('common.export')}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => handleChartExport('png', props)}
          disabled={!hasChart || isExporting}
          className="cursor-pointer"
        >
          {currentFormat === 'png' && isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileImage className="mr-2 h-4 w-4" />
          )}
          {t('common.exportAsPNG')}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleChartExport('svg', props)}
          disabled={!hasChart || isExporting}
          className="cursor-pointer"
        >
          {currentFormat === 'svg' && isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileImage className="mr-2 h-4 w-4" />
          )}
          {t('common.exportAsSVG')}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleChartExport('csv', props)}
          disabled={!hasData || isExporting}
          className="cursor-pointer"
        >
          {currentFormat === 'csv' && isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="mr-2 h-4 w-4" />
          )}
          {t('common.exportAsCSV')}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleChartExport('json', props)}
          disabled={!hasData || isExporting}
          className="cursor-pointer"
        >
          {currentFormat === 'json' && isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileJson className="mr-2 h-4 w-4" />
          )}
          {t('common.exportAsJSON')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
