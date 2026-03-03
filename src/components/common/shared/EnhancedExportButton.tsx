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
import { cn } from '@/shared/utils';

export interface ExportData {
  data: unknown;
  filename: string;
}

interface ExportButtonProps {
  data: ExportData | ExportData[];
  formats?: ExportFormat[];
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showProgress?: boolean;
  className?: string;
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
}: ExportButtonProps) {
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
          // 对于 PNG/PDF，需要 DOM 元素
          const element = document.querySelector(`[data-export="${exportDataItem.filename}"]`);
          if (!element) {
            throw new Error('找不到要导出的元素');
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
          console.error('Export failed:', result.error);
        }
      } catch (error) {
        console.error('Export error:', error);
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
      console.error('Batch export failed:', error);
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

        <DropdownMenuContent align="end" className="w-56">
          {/* 单个导出选项 */}
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
            <DropdownMenuItem onClick={handleBatchExport} disabled={isExporting} className="gap-2">
              <Download className="h-4 w-4" />
              批量导出 ({data.length} 个项目)
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* 导出历史 */}
          {exportHistory.length > 0 && (
            <div className="px-2 py-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">最近导出</span>
                <button
                  onClick={clearHistory}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  清空
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
            <span className="text-sm text-foreground">正在导出...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ExportButton(props: ExportButtonProps) {
  return <EnhancedExportButton {...props} />;
}
