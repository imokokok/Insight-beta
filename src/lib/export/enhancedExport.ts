/**
 * Enhanced Export Utility
 *
 * 增强的数据导出工具
 * - 支持多种格式：CSV, JSON, Excel, PDF, PNG
 * - 批量导出支持
 * - 定时导出功能
 * - 导出队列管理
 */

'use client';

import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

import { logger } from '@/shared/logger';

export type ExportFormat = 'csv' | 'json' | 'excel' | 'pdf' | 'png';

export interface ExportOptions {
  filename: string;
  format: ExportFormat;
  includeTimestamp?: boolean;
  compress?: boolean;
}

export interface ExportResult {
  success: boolean;
  filename?: string;
  error?: string;
}

export interface BatchExportItem {
  data: unknown;
  filename: string;
  format: ExportFormat;
}

export interface BatchExportOptions {
  items: BatchExportItem[];
  zipFilename?: string;
  includeTimestamp?: boolean;
}

/**
 * 生成带时间戳的文件名
 */
export function generateFilename(
  baseName: string,
  extension: string,
  includeTimestamp = true,
): string {
  if (!includeTimestamp) {
    return `${baseName}.${extension}`;
  }

  const timestamp = new Date().toISOString().split('T')[0];
  return `${baseName}-${timestamp}.${extension}`;
}

/**
 * 将数据转换为 CSV 格式
 */
function convertToCSV(data: Record<string, unknown>[]): string {
  if (!data || data.length === 0) return '';

  const firstRow = data[0];
  if (!firstRow) return '';

  const headers = Object.keys(firstRow);
  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // 处理包含逗号或引号的值
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(','),
    ),
  ];

  return csvRows.join('\n');
}

/**
 * 导出为 CSV
 */
export async function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  includeTimestamp = true,
): Promise<ExportResult> {
  try {
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const finalFilename = generateFilename(filename, 'csv', includeTimestamp);
    saveAs(blob, finalFilename);
    return { success: true, filename: finalFilename };
  } catch (error) {
    logger.error('CSV export failed', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : '导出失败',
    };
  }
}

/**
 * 导出为 JSON
 */
export async function exportToJSON(
  data: unknown,
  filename: string,
  includeTimestamp = true,
  compress = false,
): Promise<ExportResult> {
  try {
    const jsonString = compress ? JSON.stringify(data) : JSON.stringify(data, null, 2);

    const blob = new Blob([jsonString], { type: 'application/json' });
    const finalFilename = generateFilename(filename, 'json', includeTimestamp);
    saveAs(blob, finalFilename);
    return { success: true, filename: finalFilename };
  } catch (error) {
    logger.error('JSON export failed', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : '导出失败',
    };
  }
}

/**
 * 导出为 Excel
 */
export async function exportToExcel(
  data: Record<string, unknown>[],
  filename: string,
  includeTimestamp = true,
  sheetName = 'Sheet1',
): Promise<ExportResult> {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const finalFilename = generateFilename(filename, 'xlsx', includeTimestamp);
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, finalFilename);
    return { success: true, filename: finalFilename };
  } catch (error) {
    logger.error('Excel export failed', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : '导出失败',
    };
  }
}

/**
 * 导出元素为 PNG
 */
export async function exportToPNG(
  element: HTMLElement | string,
  filename: string,
  includeTimestamp = true,
  options?: {
    scale?: number;
    backgroundColor?: string;
  },
): Promise<ExportResult> {
  try {
    const targetElement = typeof element === 'string' ? document.querySelector(element) : element;

    if (!targetElement) {
      throw new Error('Element not found');
    }

    const canvas = await html2canvas(targetElement as HTMLElement, {
      scale: options?.scale || 2,
      backgroundColor: options?.backgroundColor || '#ffffff',
      useCORS: true,
      logging: false,
    });

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
      }, 'image/png');
    });

    const finalFilename = generateFilename(filename, 'png', includeTimestamp);
    saveAs(blob, finalFilename);
    return { success: true, filename: finalFilename };
  } catch (error) {
    logger.error('PNG export failed', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : '导出失败',
    };
  }
}

/**
 * 导出元素为 PDF
 */
export async function exportToPDF(
  element: HTMLElement | string,
  filename: string,
  includeTimestamp = true,
  options?: {
    orientation?: 'portrait' | 'landscape';
    unit?: 'mm' | 'in' | 'px';
    format?: 'a4' | 'letter' | 'legal';
  },
): Promise<ExportResult> {
  try {
    const targetElement = typeof element === 'string' ? document.querySelector(element) : element;

    if (!targetElement) {
      throw new Error('Element not found');
    }

    const canvas = await html2canvas(targetElement as HTMLElement, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({
      orientation: options?.orientation || 'portrait',
      unit: options?.unit || 'mm',
      format: options?.format || 'a4',
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // 如果内容超过一页，添加新页面
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const finalFilename = generateFilename(filename, 'pdf', includeTimestamp);
    pdf.save(finalFilename);
    return { success: true, filename: finalFilename };
  } catch (error) {
    logger.error('PDF export failed', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : '导出失败',
    };
  }
}

/**
 * 通用导出函数
 */
export async function exportData(data: unknown, options: ExportOptions): Promise<ExportResult> {
  const { filename, format, includeTimestamp = true, compress = false } = options;

  switch (format) {
    case 'csv':
      return exportToCSV(data as Record<string, unknown>[], filename, includeTimestamp);
    case 'json':
      return exportToJSON(data, filename, includeTimestamp, compress);
    case 'excel':
      return exportToExcel(data as Record<string, unknown>[], filename, includeTimestamp);
    case 'png':
      throw new Error('PNG export requires HTMLElement. Use exportToPNG directly.');
    case 'pdf':
      throw new Error('PDF export requires HTMLElement. Use exportToPDF directly.');
    default:
      return { success: false, error: '不支持的导出格式' };
  }
}

/**
 * 批量导出
 */
export async function batchExport(options: BatchExportOptions): Promise<ExportResult[]> {
  const { items, includeTimestamp = true } = options;

  // 如果只有一个项目，直接导出
  if (items.length === 1) {
    const item = items[0]!;
    return [
      await exportData(item.data, {
        filename: item.filename,
        format: item.format,
        includeTimestamp,
      }),
    ];
  }

  // 多个项目需要打包成 ZIP
  const results: ExportResult[] = [];

  try {
    // 注意：实际项目中需要引入 jszip 库
    // import JSZip from 'jszip';
    // const zip = new JSZip();

    for (const item of items) {
      const result = await exportData(item.data, {
        filename: item.filename,
        format: item.format,
        includeTimestamp: false, // ZIP 内文件不加时间戳
      });
      results.push(result);

      // 如果实现了 ZIP，这里添加文件到 zip
      // if (result.success && result.filename) {
      //   zip.file(result.filename, blob);
      // }
    }

    // 生成 ZIP 文件
    // const zipBlob = await zip.generateAsync({ type: 'blob' });
    // const finalZipName = generateFilename(zipFilename, 'zip', includeTimestamp);
    // saveAs(zipBlob, finalZipName);

    console.warn('ZIP export requires jszip package. Install with: npm install jszip');
  } catch (error) {
    logger.error('Batch export failed', { error });
    results.push({
      success: false,
      error: error instanceof Error ? error.message : '批量导出失败',
    });
  }

  return results;
}

/**
 * 导出队列管理
 */
export class ExportQueue {
  private queue: Array<() => Promise<ExportResult>> = [];
  private isProcessing = false;
  private maxConcurrent = 3;
  private currentProcessing = 0;

  add(task: () => Promise<ExportResult>): void {
    this.queue.push(task);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0 && this.currentProcessing < this.maxConcurrent) {
      const task = this.queue.shift();
      if (task) {
        this.currentProcessing++;
        task().finally(() => {
          this.currentProcessing--;
          if (this.queue.length > 0) {
            this.processQueue();
          } else if (this.currentProcessing === 0) {
            this.isProcessing = false;
          }
        });
      }
    }
  }

  clear(): void {
    this.queue = [];
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  isBusy(): boolean {
    return this.isProcessing || this.currentProcessing > 0;
  }
}

// 全局导出队列实例
export const globalExportQueue = new ExportQueue();

/**
 * 定时导出
 */
export interface ScheduledExportConfig {
  dataFetcher: () => Promise<unknown>;
  filename: string;
  format: ExportFormat;
  interval: number; // 毫秒
  maxOccurrences?: number; // 最大执行次数，undefined 表示无限
}

export class ScheduledExport {
  private intervalId: NodeJS.Timeout | null = null;
  private occurrences = 0;
  private config: ScheduledExportConfig;

  constructor(config: ScheduledExportConfig) {
    this.config = config;
  }

  start(): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(async () => {
      try {
        const data = await this.config.dataFetcher();
        await exportData(data, {
          filename: this.config.filename,
          format: this.config.format,
          includeTimestamp: true,
        });

        this.occurrences++;

        if (this.config.maxOccurrences && this.occurrences >= this.config.maxOccurrences) {
          this.stop();
        }
      } catch (error) {
        logger.error('Scheduled export failed', { error });
      }
    }, this.config.interval);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  isRunning(): boolean {
    return this.intervalId !== null;
  }

  getOccurrences(): number {
    return this.occurrences;
  }
}

/**
 * 创建定时导出
 */
export function createScheduledExport(config: ScheduledExportConfig): ScheduledExport {
  return new ScheduledExport(config);
}
