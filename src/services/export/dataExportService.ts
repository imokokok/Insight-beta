/**
 * Data Export Service
 *
 * Provides data export functionality in multiple formats
 * for Oracle Monitor platform
 */

import { logger } from '@/shared/logger';

// ============================================================================
// Types
// ============================================================================

export type ExportFormat = 'json' | 'csv' | 'xlsx' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeMetadata?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, string | number | boolean>;
  columns?: string[];
}

export interface ExportResult {
  success: boolean;
  data: Buffer | string;
  filename: string;
  contentType: string;
  size: number;
  generatedAt: Date;
}

export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  dataSource: string;
  defaultColumns: string[];
  availableFilters: string[];
}

// ============================================================================
// Data Export Service
// ============================================================================

export class DataExportService {
  private static instance: DataExportService;
  private templates: Map<string, ExportTemplate> = new Map();

  private constructor() {
    this.initializeTemplates();
  }

  static getInstance(): DataExportService {
    if (!DataExportService.instance) {
      DataExportService.instance = new DataExportService();
    }
    return DataExportService.instance;
  }

  // ============================================================================
  // Templates
  // ============================================================================

  private initializeTemplates(): void {
    const templates: ExportTemplate[] = [
      {
        id: 'oracle-feeds',
        name: 'Oracle Price Feeds',
        description: 'Export all oracle price feed data',
        dataSource: 'priceFeeds',
        defaultColumns: ['symbol', 'price', 'timestamp', 'source', 'confidence'],
        availableFilters: ['symbol', 'source', 'dateRange'],
      },
      {
        id: 'protocol-stats',
        name: 'Protocol Statistics',
        description: 'Export protocol usage statistics',
        dataSource: 'protocolStats',
        defaultColumns: ['protocol', 'tvl', 'volume24h', 'users', 'timestamp'],
        availableFilters: ['protocol', 'dateRange'],
      },
      {
        id: 'performance-metrics',
        name: 'Performance Metrics',
        description: 'Export system performance metrics',
        dataSource: 'performance',
        defaultColumns: ['timestamp', 'responseTime', 'errorRate', 'throughput'],
        availableFilters: ['dateRange', 'metricType'],
      },
      {
        id: 'alerts-history',
        name: 'Alerts History',
        description: 'Export historical alerts data',
        dataSource: 'alerts',
        defaultColumns: ['id', 'type', 'severity', 'message', 'timestamp', 'status'],
        availableFilters: ['type', 'severity', 'status', 'dateRange'],
      },
      {
        id: 'anomalies',
        name: 'Anomaly Detections',
        description: 'Export detected anomalies',
        dataSource: 'anomalies',
        defaultColumns: ['id', 'type', 'symbol', 'severity', 'confidence', 'timestamp'],
        availableFilters: ['type', 'symbol', 'severity', 'dateRange'],
      },
    ];

    for (const template of templates) {
      this.templates.set(template.id, template);
    }
  }

  getTemplates(): ExportTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplate(id: string): ExportTemplate | undefined {
    return this.templates.get(id);
  }

  // ============================================================================
  // Export Methods
  // ============================================================================

  async exportData(data: unknown[], options: ExportOptions): Promise<ExportResult> {
    const startTime = Date.now();
    const filename = options.filename || `export-${Date.now()}`;

    try {
      let result: ExportResult;

      switch (options.format) {
        case 'json':
          result = await this.exportToJSON(data, filename, options);
          break;
        case 'csv':
          result = await this.exportToCSV(data, filename, options);
          break;
        case 'xlsx':
          result = await this.exportToXLSX(data, filename, options);
          break;
        case 'pdf':
          result = await this.exportToPDF(data, filename, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      logger.info('Data export completed', {
        format: options.format,
        filename: result.filename,
        size: result.size,
        duration: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      logger.error('Data export failed', { error, format: options.format });
      throw error;
    }
  }

  // ============================================================================
  // JSON Export
  // ============================================================================

  private async exportToJSON(
    data: unknown[],
    filename: string,
    options: ExportOptions,
  ): Promise<ExportResult> {
    const exportData = options.includeMetadata
      ? {
          metadata: {
            exportedAt: new Date().toISOString(),
            recordCount: data.length,
            filters: options.filters,
            dateRange: options.dateRange,
          },
          data,
        }
      : data;

    const jsonString = JSON.stringify(exportData, null, 2);

    return {
      success: true,
      data: jsonString,
      filename: `${filename}.json`,
      contentType: 'application/json',
      size: Buffer.byteLength(jsonString, 'utf8'),
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // CSV Export
  // ============================================================================

  private async exportToCSV(
    data: unknown[],
    filename: string,
    options: ExportOptions,
  ): Promise<ExportResult> {
    if (data.length === 0) {
      return {
        success: true,
        data: '',
        filename: `${filename}.csv`,
        contentType: 'text/csv',
        size: 0,
        generatedAt: new Date(),
      };
    }

    // Get columns
    const columns = options.columns || this.inferColumns(data[0]);

    // Build CSV
    const rows: string[] = [];

    // Header
    rows.push(columns.join(','));

    // Data rows
    for (const item of data) {
      const row = columns.map((col) => {
        const value = this.getNestedValue(item, col);
        return this.escapeCSVValue(value);
      });
      rows.push(row.join(','));
    }

    const csvString = rows.join('\n');

    return {
      success: true,
      data: csvString,
      filename: `${filename}.csv`,
      contentType: 'text/csv',
      size: Buffer.byteLength(csvString, 'utf8'),
      generatedAt: new Date(),
    };
  }

  private inferColumns(item: unknown): string[] {
    if (item && typeof item === 'object') {
      return Object.keys(item as Record<string, unknown>);
    }
    return ['value'];
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    const parts = path.split('.');
    let value: unknown = obj;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private escapeCSVValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue = String(value);

    // Escape quotes and wrap in quotes if needed
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }

  // ============================================================================
  // XLSX Export
  // ============================================================================

  private async exportToXLSX(
    data: unknown[],
    filename: string,
    options: ExportOptions,
  ): Promise<ExportResult> {
    // For now, we'll create a simple XLSX-like format
    // In production, you'd use a library like xlsx or exceljs

    // Create a simple XML-based Excel format
    const columns = options.columns || (data.length > 0 ? this.inferColumns(data[0]) : []);

    let xlsxContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xlsxContent += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet">\n';
    xlsxContent += '  <Worksheet ss:Name="Sheet1">\n';
    xlsxContent += '    <Table>\n';

    // Header row
    xlsxContent += '      <Row>\n';
    for (const col of columns) {
      xlsxContent += `        <Cell><Data ss:Type="String">${this.escapeXml(col)}</Data></Cell>\n`;
    }
    xlsxContent += '      </Row>\n';

    // Data rows
    for (const item of data) {
      xlsxContent += '      <Row>\n';
      for (const col of columns) {
        const value = this.getNestedValue(item, col);
        const type = typeof value === 'number' ? 'Number' : 'String';
        xlsxContent += `        <Cell><Data ss:Type="${type}">${this.escapeXml(String(value ?? ''))}</Data></Cell>\n`;
      }
      xlsxContent += '      </Row>\n';
    }

    xlsxContent += '    </Table>\n';
    xlsxContent += '  </Worksheet>\n';
    xlsxContent += '</Workbook>';

    return {
      success: true,
      data: xlsxContent,
      filename: `${filename}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: Buffer.byteLength(xlsxContent, 'utf8'),
      generatedAt: new Date(),
    };
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // ============================================================================
  // PDF Export
  // ============================================================================

  private async exportToPDF(
    data: unknown[],
    filename: string,
    options: ExportOptions,
  ): Promise<ExportResult> {
    // For now, create a simple HTML-based PDF
    // In production, you'd use a library like puppeteer or pdfkit

    const columns = options.columns || (data.length > 0 ? this.inferColumns(data[0]) : []);

    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${filename}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .header { margin-bottom: 20px; }
    .timestamp { color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${filename}</h1>
    <p class="timestamp">Generated: ${new Date().toLocaleString()}</p>
    <p>Total Records: ${data.length}</p>
  </div>
  <table>
    <thead>
      <tr>
        ${columns.map((col) => `<th>${col}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
`;

    for (const item of data) {
      html += '      <tr>\n';
      for (const col of columns) {
        const value = this.getNestedValue(item, col);
        html += `        <td>${value ?? ''}</td>\n`;
      }
      html += '      </tr>\n';
    }

    html += `
    </tbody>
  </table>
</body>
</html>
`;

    return {
      success: true,
      data: html,
      filename: `${filename}.pdf.html`,
      contentType: 'text/html',
      size: Buffer.byteLength(html, 'utf8'),
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // Batch Export
  // ============================================================================

  async exportBatch(
    requests: Array<{
      data: unknown[];
      options: ExportOptions;
    }>,
  ): Promise<ExportResult[]> {
    const results: ExportResult[] = [];

    for (const request of requests) {
      try {
        const result = await this.exportData(request.data, request.options);
        results.push(result);
      } catch (error) {
        logger.error('Batch export item failed', { error });
        throw error;
      }
    }

    return results;
  }

  // ============================================================================
  // Validation
  // ============================================================================

  validateExportOptions(options: ExportOptions): string[] {
    const errors: string[] = [];

    if (!options.format) {
      errors.push('Format is required');
    } else if (!['json', 'csv', 'xlsx', 'pdf'].includes(options.format)) {
      errors.push(`Invalid format: ${options.format}`);
    }

    if (options.dateRange) {
      if (options.dateRange.start > options.dateRange.end) {
        errors.push('Start date must be before end date');
      }
    }

    return errors;
  }
}

// Export singleton instance
export const dataExportService = DataExportService.getInstance();
