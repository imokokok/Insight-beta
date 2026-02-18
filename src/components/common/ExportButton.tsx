'use client';

import { useState, useCallback } from 'react';
import type { RefObject } from 'react';

import { Download, FileImage, FileJson, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';
import {
  exportChartAsPNG,
  exportChartAsSVG,
  exportDataAsCSV,
  exportDataAsJSON,
} from '@/utils/chartExport';

type ExportFormat = 'png' | 'svg' | 'csv' | 'json';

export interface ExportButtonProps {
  chartRef: RefObject<HTMLElement | null>;
  data?: object[];
  filename?: string;
  className?: string;
  watermark?: string;
  showTimestamp?: boolean;
  disabled?: boolean;
}

export function ExportButton({
  chartRef,
  data,
  filename = 'chart',
  className,
  watermark = 'Insight Beta',
  showTimestamp = true,
  disabled = false,
}: ExportButtonProps) {
  const { t } = useI18n();
  const [isExporting, setIsExporting] = useState(false);
  const [currentFormat, setCurrentFormat] = useState<ExportFormat | null>(null);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
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
    [chartRef, data, filename, watermark, showTimestamp, t],
  );

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
          onClick={() => handleExport('png')}
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
          onClick={() => handleExport('svg')}
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
          onClick={() => handleExport('csv')}
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
          onClick={() => handleExport('json')}
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
