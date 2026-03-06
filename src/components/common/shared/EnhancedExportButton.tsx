/**
 * Enhanced Export Button
 *
 * 增强的导出按钮组件
 * - 支持多种格式
 * - 批量导出
 * - 导出进度显示
 * - 导出历史记录
 */

'use client';

import type { RefObject } from 'react';
import { useState, useCallback } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Image,
  FileCheck,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  Badge,
} from '@/components/ui';
import { useI18n } from '@/i18n';
import {
  exportData,
  exportToPNG,
  exportToPDF,
  type ExportFormat,
  type ExportResult,
  globalExportQueue,
} from '@/lib/export/enhancedExport';
import { logger } from '@/shared/logger';
import { cn } from '@/shared/utils';
import {
  exportChartAsPNG,
  exportChartAsSVG,
  exportDataAsCSV,
  exportDataAsJSON,
} from '@/utils/chartExport';

import { DataFilter } from '../controls/filter';

export interface ExportData {
  data: unknown;
  filename: string;
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

import type { FilterField, FilterConfig } from '../controls/filter';

interface EnhancedExportButtonProps {
  data: ExportData | ExportData[];
  formats?: ExportFormat[];
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showProgress?: boolean;
  className?: string;
  filterFields?: FilterField[];
  filterStorageKey?: string;
  onFilterApply?: (config: FilterConfig) => void;
}

interface ExportHistoryItem {
  id: string;
  filename: string;
  format: ExportFormat;
  timestamp: Date;
  success: boolean;
}

export function EnhancedExportButton({
  data,
  formats = ['csv', 'json', 'excel', 'png', 'pdf'],
  variant = 'outline',
  size = 'sm',
  showProgress = true,
  className,
  filterFields,
  filterStorageKey = 'export-filter',
  onFilterApply,
}: EnhancedExportButtonProps) {
  const { t } = useI18n();
  const [isExporting, setIsExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>([]);

  const formatIcons = {
    csv: FileText,
    json: FileJson,
    excel: FileSpreadsheet,
    png: Image,
    pdf: FileCheck,
  };

  const formatLabels = {
    csv: 'CSV',
    json: 'JSON',
    excel: 'Excel',
    png: 'PNG',
    pdf: 'PDF',
  };

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      setIsExporting(true);

      try {
        const exportDataItem = Array.isArray(data) ? data[0] : data;
        if (!exportDataItem) return;

        let result: ExportResult;

        if (format === 'png' || format === 'pdf') {
          const element = document.querySelector(`[data-export="${exportDataItem.filename}"]`);
          if (!element) {
            throw new Error(t('common.exportElementNotFound'));
          }

          if (format === 'png') {
            result = await exportToPNG(element as HTMLElement, exportDataItem.filename);
          } else {
            result = await exportToPDF(element as HTMLElement, exportDataItem.filename);
          }
        } else {
          result = await exportData(exportDataItem.data, {
            filename: exportDataItem.filename,
            format,
            includeTimestamp: true,
          });
        }

        // 添加到历史记录
        const historyItem: ExportHistoryItem = {
          id: Date.now().toString(),
          filename: result.filename || exportDataItem.filename,
          format,
          timestamp: new Date(),
          success: result.success,
        };

        setExportHistory((prev) => [historyItem, ...prev.slice(0, 9)]);

        if (!result.success) {
          logger.error('Export failed', { error: result.error });
        }
      } catch (error) {
        logger.error('Export error', { error });
      } finally {
        setIsExporting(false);
      }
    },
    [data],
  );

  const handleBatchExport = useCallback(async () => {
    if (!Array.isArray(data)) return;

    setIsExporting(true);

    try {
      const promises = data.map(async (item) => {
        const result = await exportData(item.data, {
          filename: item.filename,
          format: 'json', // 批量导出默认使用 JSON
          includeTimestamp: true,
        });

        const historyItem: ExportHistoryItem = {
          id: Date.now().toString() + Math.random(),
          filename: result.filename || item.filename,
          format: 'json',
          timestamp: new Date(),
          success: result.success,
        };

        setExportHistory((prev) => [historyItem, ...prev.slice(0, 9)]);
        return result;
      });

      await Promise.all(promises);
    } catch (error) {
      logger.error('Batch export failed', { error });
    } finally {
      setIsExporting(false);
    }
  }, [data]);

  const clearHistory = useCallback(() => {
    setExportHistory([]);
  }, []);

  return (
    <div className={cn('relative', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            disabled={isExporting || globalExportQueue.isBusy()}
            className="gap-2"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {t('common.export')}
            {exportHistory.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {exportHistory.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className={cn('w-80', filterFields && 'w-[420px]')}>
          {filterFields && (
            <>
              <DropdownMenuLabel>{t('common.exportMenu.options')}</DropdownMenuLabel>
              <div className="px-2 py-1">
                <DataFilter
                  fields={filterFields}
                  storageKey={filterStorageKey}
                  onApply={onFilterApply}
                />
              </div>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuLabel>{t('common.exportMenu.formats')}</DropdownMenuLabel>
          {formats.map((format) => {
            const Icon = formatIcons[format];
            return (
              <DropdownMenuItem
                key={format}
                onClick={() => handleExport(format)}
                disabled={isExporting}
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                {formatLabels[format]}
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator />

          {/* 批量导出 */}
          {Array.isArray(data) && data.length > 1 && (
            <>
              <DropdownMenuLabel>{t('common.exportMenu.batchExport')}</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={handleBatchExport}
                disabled={isExporting}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {t('common.exportMenu.batchExportItems', { count: data.length })}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuSeparator />

          {exportHistory.length > 0 && (
            <div className="px-2 py-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {t('common.exportMenu.recentExports')}
                </span>
                <button
                  onClick={clearHistory}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {t('common.clearAll')}
                </button>
              </div>
              <div className="space-y-1">
                {exportHistory.slice(0, 5).map((item) => {
                  const Icon = formatIcons[item.format];
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate text-xs">{item.filename}</span>
                      </div>
                      {item.success ? (
                        <Check className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5 text-error" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 导出进度提示 */}
      <AnimatePresence>
        {showProgress && isExporting && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute right-0 top-full mt-2 flex items-center gap-2 rounded-lg border border-border bg-card p-3 shadow-lg"
          >
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-foreground">{t('common.exporting')}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ExportButton(props: ExportButtonProps | EnhancedExportButtonProps) {
  if ('chartRef' in props || 'config' in props) {
    return <LegacyExportButton {...props} />;
  }
  return <EnhancedExportButton {...props} />;
}

function LegacyExportButton<T = unknown>(props: ExportButtonProps<T>) {
  const { t } = useI18n();
  const [isExporting, setIsExporting] = useState(false);

  const hasConfig = 'config' in props;

  const handleChartExport = useCallback(
    async (format: 'png' | 'svg' | 'csv' | 'json') => {
      const {
        chartRef,
        data,
        filename = 'chart',
        watermark = 'Insight Beta',
        showTimestamp = true,
      } = props as ChartExportButtonProps;

      setIsExporting(true);

      try {
        switch (format) {
          case 'png':
            if (!chartRef.current) throw new Error(t('common.chartElementNotFound'));
            await exportChartAsPNG(chartRef.current, {
              filename,
              watermark,
              timestamp: showTimestamp,
            });
            break;
          case 'svg':
            if (!chartRef.current) throw new Error(t('common.chartElementNotFound'));
            await exportChartAsSVG(chartRef.current, {
              filename,
              watermark,
              timestamp: showTimestamp,
            });
            break;
          case 'csv':
            if (!data || data.length === 0) throw new Error(t('common.noDataAvailableForCSV'));
            exportDataAsCSV(data, filename);
            break;
          case 'json':
            if (!data || data.length === 0) throw new Error(t('common.noDataAvailableForJSON'));
            exportDataAsJSON(data, filename);
            break;
        }
      } catch (error) {
        logger.error('Export failed', { error });
      } finally {
        setIsExporting(false);
      }
    },
    [props],
  );

  const handleDataExport = useCallback(
    async (format: 'json' | 'csv' | 'excel') => {
      const { data, config } = props as DataExportButtonProps<T>;
      if (!data) return;

      setIsExporting(true);

      try {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `${config.filenamePrefix}-${timestamp}`;

        switch (format) {
          case 'json':
            downloadFile(JSON.stringify(data, null, 2), `${filename}.json`, 'application/json');
            break;
          case 'csv':
            downloadFile(config.generateCSV(data), `${filename}.csv`, 'text/csv;charset=utf-8');
            break;
          case 'excel':
            downloadFile(config.generateExcel(data), `${filename}.xls`, 'application/vnd.ms-excel');
            break;
        }
      } catch (error) {
        logger.error('Export failed', { error });
      } finally {
        setIsExporting(false);
      }
    },
    [props],
  );

  if (hasConfig) {
    const { data, disabled, className } = props as DataExportButtonProps<T>;
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
            {t('common.export')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={() => handleDataExport('json')}
            disabled={!hasData || isExporting}
            className="cursor-pointer"
          >
            <FileJson className="mr-2 h-4 w-4" /> JSON
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleDataExport('csv')}
            disabled={!hasData || isExporting}
            className="cursor-pointer"
          >
            <FileText className="mr-2 h-4 w-4" /> CSV
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleDataExport('excel')}
            disabled={!hasData || isExporting}
            className="cursor-pointer"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const { chartRef, data, disabled, className } = props as ChartExportButtonProps;
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
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {t('common.export')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => handleChartExport('png')}
          disabled={!hasChart || isExporting}
          className="cursor-pointer"
        >
          <Image className="mr-2 h-4 w-4" /> {t('common.exportAsPNG')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleChartExport('svg')}
          disabled={!hasChart || isExporting}
          className="cursor-pointer"
        >
          <Image className="mr-2 h-4 w-4" /> {t('common.exportAsSVG')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleChartExport('csv')}
          disabled={!hasData || isExporting}
          className="cursor-pointer"
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" /> {t('common.exportAsCSV')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleChartExport('json')}
          disabled={!hasData || isExporting}
          className="cursor-pointer"
        >
          <FileJson className="mr-2 h-4 w-4" /> {t('common.exportAsJSON')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
