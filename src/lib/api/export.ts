import { logger } from '@/lib/logger';

export type ExportFormat = 'csv' | 'xlsx' | 'json';

export interface ExportOptions {
  filename?: string;
  format?: ExportFormat;
  headers?: string[];
  dateFormat?: string;
  numberFormat?: 'decimal' | 'currency' | 'percentage';
  onProgress?: (progress: number) => void;
  compress?: boolean;
  includeTimestamp?: boolean;
  batchSize?: number;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  size: number;
  recordCount: number;
  error?: string;
}

export interface ExportHistory {
  id: string;
  filename: string;
  format: ExportFormat;
  timestamp: string;
  recordCount: number;
  size: number;
}

const MAX_BATCH_SIZE = 10000;
const DEFAULT_BATCH_SIZE = 5000;
const MAX_EXPORT_RECORDS = 100000;

export async function exportData<T extends Record<string, unknown>>(
  data: T[],
  options: ExportOptions = {},
): Promise<ExportResult> {
  const {
    filename = `export-${Date.now()}`,
    format = 'csv',
    headers,
    onProgress,
    compress = false,
    includeTimestamp = true,
    batchSize = DEFAULT_BATCH_SIZE,
  } = options;

  // Validate input
  if (!Array.isArray(data)) {
    return {
      success: false,
      filename: '',
      size: 0,
      recordCount: 0,
      error: 'Data must be an array',
    };
  }

  if (data.length > MAX_EXPORT_RECORDS) {
    return {
      success: false,
      filename: '',
      size: 0,
      recordCount: 0,
      error: `Maximum ${MAX_EXPORT_RECORDS} records allowed`,
    };
  }

  try {
    // Process data in batches
    const effectiveBatchSize = Math.min(batchSize, MAX_BATCH_SIZE);
    const batches: T[][] = [];

    for (let i = 0; i < data.length; i += effectiveBatchSize) {
      batches.push(data.slice(i, i + effectiveBatchSize));
    }

    // Convert to format
    let content = '';
    const totalBatches = batches.length;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]!;

      if (format === 'csv') {
        content += convertToCSV(batch, headers, i === 0);
      } else if (format === 'json') {
        content += convertToJSON(batch, i === 0, i === batches.length - 1);
      }

      // Report progress
      if (onProgress) {
        onProgress(Math.round(((i + 1) / totalBatches) * 100));
      }
    }

    // Add timestamp if requested
    let finalFilename = filename;
    if (includeTimestamp) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      finalFilename = `${filename}_${timestamp}`;
    }

    // Add extension
    finalFilename += `.${format}`;

    // Compress if requested
    let finalContent = content;
    let downloadSize = content.length;

    if (compress && typeof window !== 'undefined') {
      try {
        const compressed = await compressContent(content);
        finalContent = compressed;
        finalFilename += '.gz';
        downloadSize = compressed.length;
      } catch (error) {
        logger.warn('Compression failed, using uncompressed content', { error });
      }
    }

    // Create download
    if (typeof window !== 'undefined') {
      createDownload(finalContent, finalFilename);
    }

    // Save to history
    if (typeof window !== 'undefined') {
      saveExportHistory({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        filename: finalFilename,
        format,
        timestamp: new Date().toISOString(),
        recordCount: data.length,
        size: downloadSize,
      });
    }

    return {
      success: true,
      filename: finalFilename,
      size: downloadSize,
      recordCount: data.length,
    };
  } catch (error) {
    return {
      success: false,
      filename: '',
      size: 0,
      recordCount: 0,
      error: error instanceof Error ? error.message : 'Export failed',
    };
  }
}

function convertToCSV<T extends Record<string, unknown>>(
  data: T[],
  headers?: string[],
  includeHeader: boolean = true,
): string {
  if (data.length === 0) return '';

  const keys = headers || Object.keys(data[0] || {});
  let csv = '';

  if (includeHeader) {
    csv += keys.join(',') + '\n';
  }

  for (const row of data) {
    const values = keys.map((key) => {
      const value = row[key];
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      // Escape values containing commas or quotes
      if (stringValue.includes(',') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csv += values.join(',') + '\n';
  }

  return csv;
}

function convertToJSON<T extends Record<string, unknown>>(
  data: T[],
  isFirst: boolean,
  isLast: boolean,
): string {
  let json = '';

  if (isFirst) {
    json += '[\n';
  }

  for (let i = 0; i < data.length; i++) {
    json += JSON.stringify(data[i], null, 2);
    if (!isLast || i < data.length - 1) {
      json += ',\n';
    }
  }

  if (isLast) {
    json += '\n]';
  }

  return json;
}

async function compressContent(content: string): Promise<string> {
  // Simple compression using TextEncoder and Uint8Array
  // In a real implementation, you might use a library like pako
  // For now, just return the content as-is
  // TODO: Implement proper compression
  return content;
}

function createDownload(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getExportHistory(): ExportHistory[] {
  if (typeof window === 'undefined') return [];

  try {
    const history = localStorage.getItem('exportHistory');
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
}

function saveExportHistory(entry: ExportHistory): void {
  try {
    const history = getExportHistory();

    const updatedHistory = [entry, ...history].slice(0, 50);
    localStorage.setItem('exportHistory', JSON.stringify(updatedHistory));
  } catch (error) {
    logger.warn('Failed to save export history', { error });
  }
}

export function clearExportHistory(): void {
  try {
    localStorage.removeItem('exportHistory');
  } catch (error) {
    logger.warn('Failed to clear export history', { error });
  }
}

export function validateExportData<T extends Record<string, unknown>>(
  data: T[],
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(data)) {
    errors.push('Data must be an array');
    return { valid: false, errors };
  }

  if (data.length === 0) {
    errors.push('Data array is empty');
    return { valid: false, errors };
  }

  if (data.length > MAX_EXPORT_RECORDS) {
    errors.push(`Maximum ${MAX_EXPORT_RECORDS} records allowed`);
  }

  // Check first item for structure
  const firstItem = data[0];
  if (!firstItem || typeof firstItem !== 'object') {
    errors.push('Data items must be objects');
    return { valid: false, errors };
  }

  // Check for circular references
  try {
    JSON.stringify(data);
  } catch {
    errors.push('Data contains circular references');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Generate export filename based on type and format
 * @param type - Export type
 * @param format - Export format
 * @returns Generated filename
 */
export function generateExportFilename(type: string, format: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${type}_${timestamp}.${format}`;
}
