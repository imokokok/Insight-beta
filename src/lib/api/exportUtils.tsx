import React, { useState, useCallback } from 'react';
import { FileSpreadsheet, FileJson, FileText, Download, Loader2 } from 'lucide-react';

export type ExportFormat = 'csv' | 'json' | 'excel' | 'pdf';
export type ExportStatus = 'idle' | 'exporting' | 'success' | 'error';

interface ExportOptions {
  filename?: string;
  includeHeaders?: boolean;
  dateFormat?: string;
  fieldMappings?: Record<string, string>;
  maxRows?: number;
}

interface ExportResult {
  success: boolean;
  blob?: Blob;
  filename?: string;
  error?: string;
  recordCount: number;
}

interface ExportProgress {
  status: ExportStatus;
  progress: number;
  message?: string;
  result?: ExportResult;
}

class ExportManager {
  private abortController: AbortController | null = null;

  async exportToCSV<T extends Record<string, unknown>>(
    data: T[],
    options: ExportOptions = {},
  ): Promise<ExportResult> {
    try {
      const { includeHeaders = true, fieldMappings, maxRows } = options;
      const exportData = maxRows ? data.slice(0, maxRows) : data;

      if (exportData.length === 0) {
        return {
          success: false,
          error: 'No data to export',
          recordCount: 0,
        };
      }

      const firstRow = exportData[0] as Record<string, unknown>;
      const headers = Object.keys(firstRow).map((key) =>
        fieldMappings?.[key] || key
      );

      const escapeCSV = (value: unknown): string => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows = exportData.map((row) =>
        Object.keys(firstRow)
          .map((key) => escapeCSV(row[key]))
          .join(',')
      );

      const csvContent = includeHeaders
        ? [headers.join(','), ...rows].join('\n')
        : rows.join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const filename = options.filename || `export-${Date.now()}.csv`;

      return {
        success: true,
        blob,
        filename,
        recordCount: exportData.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export CSV',
        recordCount: 0,
      };
    }
  }

  async exportToJSON<T extends Record<string, unknown>>(
    data: T[],
    options: ExportOptions = {},
  ): Promise<ExportResult> {
    try {
      const { fieldMappings, maxRows } = options;
      const exportData = maxRows ? data.slice(0, maxRows) : data;

      if (exportData.length === 0) {
        return {
          success: false,
          error: 'No data to export',
          recordCount: 0,
        };
      }

      const mappedData = fieldMappings
        ? exportData.map((row) => {
            const mapped: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(row)) {
              mapped[fieldMappings[key] || key] = value;
            }
            return mapped;
          })
        : exportData;

      const jsonContent = JSON.stringify(mappedData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const filename = options.filename || `export-${Date.now()}.json`;

      return {
        success: true,
        blob,
        filename,
        recordCount: exportData.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export JSON',
        recordCount: 0,
      };
    }
  }

  async exportToExcel<T extends Record<string, unknown>>(
    data: T[],
    options: ExportOptions = {},
  ): Promise<ExportResult> {
    try {
      const { fieldMappings, maxRows, includeHeaders = true } = options;
      const exportData = maxRows ? data.slice(0, maxRows) : data;

      if (exportData.length === 0) {
        return {
          success: false,
          error: 'No data to export',
          recordCount: 0,
        };
      }

      const firstRow = exportData[0] as Record<string, unknown>;
      const headers = Object.keys(firstRow).map((key) =>
        fieldMappings?.[key] || key
      );

      const rows = exportData.map((row) =>
        Object.values(row).map((value) => {
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value);
          return String(value);
        })
      );

      const tsvContent = [
        includeHeaders ? headers.join('\t') : '',
        ...rows.map((row) => row.join('\t')),
      ]
        .filter((line) => line.length > 0)
        .join('\n');

      const blob = new Blob([tsvContent], {
        type: 'application/vnd.ms-excel',
      });
      const filename = options.filename || `export-${Date.now()}.xls`;

      return {
        success: true,
        blob,
        filename,
        recordCount: exportData.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export Excel',
        recordCount: 0,
      };
    }
  }

  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async export<T extends Record<string, unknown>>(
    data: T[],
    format: ExportFormat,
    options: ExportOptions = {},
  ): Promise<ExportResult> {
    switch (format) {
      case 'csv':
        return this.exportToCSV(data, options);
      case 'json':
        return this.exportToJSON(data, options);
      case 'excel':
        return this.exportToExcel(data, options);
      default:
        return {
          success: false,
          error: `Unsupported format: ${format}`,
          recordCount: 0,
        };
    }
  }

  abort(): void {
    this.abortController?.abort();
    this.abortController = null;
  }
}

export const exportManager = new ExportManager();

interface UseExportOptions<T extends Record<string, unknown>> {
  data: T[];
  filename?: string;
  onSuccess?: (result: ExportResult) => void;
  onError?: (error: string) => void;
}

interface UseExportReturn {
  exportToCSV: (options?: ExportOptions) => Promise<ExportResult | null>;
  exportToJSON: (options?: ExportOptions) => Promise<ExportResult | null>;
  exportToExcel: (options?: ExportOptions) => Promise<ExportResult | null>;
  export: (format: ExportFormat, options?: ExportOptions) => Promise<ExportResult | null>;
  progress: ExportProgress;
  download: (result: ExportResult) => void;
}

export function useExport<T extends Record<string, unknown>>({
  data,
  filename,
  onSuccess,
  onError,
}: UseExportOptions<T>): UseExportReturn {
  const [progress, setProgress] = useState<ExportProgress>({
    status: 'idle',
    progress: 0,
  });

  const updateProgress = useCallback(
    (status: ExportStatus, progressPercent: number, message?: string, result?: ExportResult) => {
      setProgress({
        status,
        progress: progressPercent,
        message,
        result,
      });

      if (status === 'success' && result) {
        onSuccess?.(result);
      } else if (status === 'error' && result?.error) {
        onError?.(result.error);
      }
    },
    [onSuccess, onError]
  );

  const exportToCSV = useCallback(
    async (options: ExportOptions = {}): Promise<ExportResult | null> => {
      try {
        updateProgress('exporting', 0, 'Preparing CSV export...');
        const result = await exportManager.exportToCSV(data, {
          ...options,
          filename: options.filename || filename,
        });

        if (result.success) {
          updateProgress('success', 100, 'CSV export complete', result);
        } else {
          updateProgress('error', 0, 'CSV export failed', result);
        }

        return result;
      } catch (error) {
        const errorResult: ExportResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          recordCount: 0,
        };
        updateProgress('error', 0, 'Export failed', errorResult);
        return errorResult;
      }
    },
    [data, filename, updateProgress]
  );

  const exportToJSON = useCallback(
    async (options: ExportOptions = {}): Promise<ExportResult | null> => {
      try {
        updateProgress('exporting', 0, 'Preparing JSON export...');
        const result = await exportManager.exportToJSON(data, {
          ...options,
          filename: options.filename || filename,
        });

        if (result.success) {
          updateProgress('success', 100, 'JSON export complete', result);
        } else {
          updateProgress('error', 0, 'JSON export failed', result);
        }

        return result;
      } catch (error) {
        const errorResult: ExportResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          recordCount: 0,
        };
        updateProgress('error', 0, 'Export failed', errorResult);
        return errorResult;
      }
    },
    [data, filename, updateProgress]
  );

  const exportToExcel = useCallback(
    async (options: ExportOptions = {}): Promise<ExportResult | null> => {
      try {
        updateProgress('exporting', 0, 'Preparing Excel export...');
        const result = await exportManager.exportToExcel(data, {
          ...options,
          filename: options.filename || filename,
        });

        if (result.success) {
          updateProgress('success', 100, 'Excel export complete', result);
        } else {
          updateProgress('error', 0, 'Excel export failed', result);
        }

        return result;
      } catch (error) {
        const errorResult: ExportResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          recordCount: 0,
        };
        updateProgress('error', 0, 'Export failed', errorResult);
        return errorResult;
      }
    },
    [data, filename, updateProgress]
  );

  const exportFormat = useCallback(
    async (format: ExportFormat, options: ExportOptions = {}): Promise<ExportResult | null> => {
      try {
        updateProgress('exporting', 0, `Preparing ${format.toUpperCase()} export...`);
        const result = await exportManager.export(data, format, {
          ...options,
          filename: options.filename || filename,
        });

        if (result.success) {
          updateProgress('success', 100, `${format.toUpperCase()} export complete`, result);
        } else {
          updateProgress('error', 0, `${format.toUpperCase()} export failed`, result);
        }

        return result;
      } catch (error) {
        const errorResult: ExportResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          recordCount: 0,
        };
        updateProgress('error', 0, 'Export failed', errorResult);
        return errorResult;
      }
    },
    [data, filename, updateProgress]
  );

  const download = useCallback((result: ExportResult) => {
    if (result.blob && result.filename) {
      exportManager.downloadBlob(result.blob, result.filename);
    }
  }, []);

  return {
    exportToCSV,
    exportToJSON,
    exportToExcel,
    export: exportFormat,
    progress,
    download,
  };
}

interface ExportButtonProps {
  data: Array<Record<string, unknown>>;
  filename?: string;
  disabled?: boolean;
  className?: string;
  showLabels?: boolean;
  onExportStart?: () => void;
  onExportComplete?: (result: ExportResult) => void;
  onExportError?: (error: string) => void;
}

export function ExportButton({
  data,
  filename,
  disabled = false,
  className = '',
  showLabels = true,
  onExportStart,
  onExportComplete,
  onExportError,
}: ExportButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const {
    export: performExport,
    progress,
    download,
  } = useExport({
    data,
    filename,
    onSuccess: (result) => {
      setIsExporting(false);
      download(result);
      onExportComplete?.(result);
    },
    onError: (error) => {
      setIsExporting(false);
      onExportError?.(error);
    },
  });

  const handleExport = async (format: ExportFormat) => {
    if (isExporting || disabled) return;

    setShowMenu(false);
    setIsExporting(true);
    onExportStart?.();

    await performExport(format);
  };

  const formatOptions: Array<{ format: ExportFormat; label: string; icon: React.ReactNode; extension: string }> = [
    {
      format: 'csv',
      label: 'Export as CSV',
      icon: <FileText className="h-4 w-4" />,
      extension: '.csv',
    },
    {
      format: 'json',
      label: 'Export as JSON',
      icon: <FileJson className="h-4 w-4" />,
      extension: '.json',
    },
    {
      format: 'excel',
      label: 'Export as Excel',
      icon: <FileSpreadsheet className="h-4 w-4" />,
      extension: '.xls',
    },
  ];

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={disabled || isExporting}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        aria-expanded={showMenu}
        aria-haspopup="true"
      >
        {isExporting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {showLabels && <span>Exporting...</span>}
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            {showLabels && <span>Export</span>}
          </>
        )}
      </button>

      {showMenu && !isExporting && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 z-20 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 animate-in fade-in zoom-in duration-100">
            {formatOptions.map((option) => (
              <button
                key={option.format}
                onClick={() => handleExport(option.format)}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {option.icon}
                <span>{option.label}</span>
                <span className="ml-auto text-xs text-gray-400">{option.extension}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {progress.status === 'error' && (
        <div className="absolute right-0 top-full mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 max-w-xs">
          Export failed: {progress.result?.error || 'Unknown error'}
        </div>
      )}
    </div>
  );
}

export function formatExportSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
