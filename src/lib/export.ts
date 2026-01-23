export type ExportFormat = "csv" | "xlsx" | "json";

export interface ExportOptions {
  filename?: string;
  format?: ExportFormat;
  headers?: string[];
  dateFormat?: string;
  numberFormat?: "decimal" | "currency" | "percentage";
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

export async function exportData<T extends Record<string, unknown>>(
  data: T[],
  options: ExportOptions = {},
): Promise<ExportResult> {
  const {
    filename = `export-${Date.now()}`,
    format = "csv",
    headers,
    onProgress,
    compress = false,
    includeTimestamp = true,
    batchSize = DEFAULT_BATCH_SIZE,
  } = options;

  if (!Array.isArray(data)) {
    return {
      success: false,
      filename: "",
      size: 0,
      recordCount: 0,
      error: "Data must be an array",
    };
  }

  if (data.length === 0) {
    return {
      success: false,
      filename: "",
      size: 0,
      recordCount: 0,
      error: "No data to export",
    };
  }

  try {
    const effectiveBatchSize = Math.min(batchSize, MAX_BATCH_SIZE);
    const totalBatches = Math.ceil(data.length / effectiveBatchSize);
    let processedBatches = 0;

    const processBatch = async (
      batchData: T[],
      batchIndex: number,
    ): Promise<string> => {
      const batchHeaders = headers || Object.keys(batchData[0]);
      const batchFilename = `${filename}_batch_${batchIndex}`;

      let content: string;

      switch (format) {
        case "csv":
          content = await exportToCSV(batchData, {
            filename: batchFilename,
            headers: batchHeaders,
          });
          break;
        case "xlsx":
          content = await exportToExcel(batchData, {
            filename: batchFilename,
            headers: batchHeaders,
          });
          break;
        case "json":
          content = await exportToJSON(batchData, {
            filename: batchFilename,
          });
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      processedBatches++;
      if (onProgress) {
        onProgress((processedBatches / totalBatches) * 100);
      }

      return content;
    };

    let finalContent: string;
    const finalFilename = includeTimestamp
      ? `${filename}_${new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5)}`
      : filename;

    if (data.length <= effectiveBatchSize) {
      finalContent = await processBatch(data, 0);
    } else {
      const batches: string[] = [];

      for (let i = 0; i < data.length; i += effectiveBatchSize) {
        const batchData = data.slice(i, i + effectiveBatchSize);
        const batchContent = await processBatch(batchData, Math.floor(i / effectiveBatchSize));
        batches.push(batchContent);
      }

      finalContent = batches.join("\n");
    }

    const finalExtension = format === "xlsx" ? "csv" : format;
    const finalFilenameWithExt = `${finalFilename}.${finalExtension}`;

    let downloadContent = finalContent;
    let downloadSize = finalContent.length;

    if (compress && finalContent.length > 1024) {
      try {
        const compressed = await compressContent(finalContent);
        downloadContent = compressed;
        downloadSize = compressed.length;
      } catch (error) {
        console.warn("Compression failed, using uncompressed content", error);
      }
    }

    const mimeType = getMimeType(format);
    downloadFile(downloadContent, finalFilenameWithExt, mimeType);

    const result: ExportResult = {
      success: true,
      filename: finalFilenameWithExt,
      size: downloadSize,
      recordCount: data.length,
    };

    saveToExportHistory(result);

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown export error";
    return {
      success: false,
      filename: "",
      size: 0,
      recordCount: 0,
      error: errorMessage,
    };
  }
}

async function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  options: { filename: string; headers?: string[] },
): Promise<string> {
  if (data.length === 0) {
    throw new Error("No data to export");
  }

  const headers = options.headers || Object.keys(data[0]);
  const csvRows: string[] = [headers.join(",")];

  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header];
      return formatCSVValue(value);
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}

function formatCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

async function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  options: { filename: string; headers?: string[] },
): Promise<string> {
  if (data.length === 0) {
    throw new Error("No data to export");
  }

  const headers = options.headers || Object.keys(data[0]);
  const worksheetData = [headers];

  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header];
      return value === null || value === undefined ? "" : String(value);
    });
    worksheetData.push(values);
  }

  const csvContent = worksheetData
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");

  return csvContent;
}

async function exportToJSON<T extends Record<string, unknown>>(
  data: T[],
  options: { filename: string },
): Promise<string> {
  return JSON.stringify(data, null, 2);
}

function downloadFile(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getMimeType(format: ExportFormat): string {
  switch (format) {
    case "csv":
      return "text/csv;charset=utf-8;";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8;";
    case "json":
      return "application/json;charset=utf-8;";
    default:
      return "text/plain;charset=utf-8;";
  }
}

async function compressContent(content: string): Promise<string> {
  if (typeof CompressionStream === "undefined") {
    return content;
  }

  try {
    const stream = new CompressionStream("gzip");
    const writer = stream.writable.getWriter();
    await writer.write(new TextEncoder().encode(content));
    await writer.close();

    const compressed = await new Response(stream.readable).arrayBuffer();
    return new TextDecoder().decode(compressed);
  } catch {
    return content;
  }
}

export function formatValueForExport(
  value: unknown,
  format: "decimal" | "currency" | "percentage" = "decimal",
  locale: string = "en-US",
): string {
  if (value === null || value === undefined) {
    return "";
  }

  const numValue = Number(value);

  if (!Number.isFinite(numValue)) {
    return String(value);
  }

  switch (format) {
    case "decimal":
      return numValue.toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    case "currency":
      return numValue.toLocaleString(locale, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    case "percentage":
      return `${(numValue * 100).toFixed(2)}%`;
    default:
      return String(value);
  }
}

export function generateExportFilename(
  prefix: string,
  format: ExportFormat,
  includeTimestamp: boolean = true,
): string {
  if (!includeTimestamp) {
    return `${prefix}.${format}`;
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, -5);

  return `${prefix}-${timestamp}.${format}`;
}

export function getExportHistory(): ExportHistory[] {
  try {
    const history = localStorage.getItem("exportHistory");
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
}

function saveToExportHistory(result: ExportResult): void {
  try {
    const history = getExportHistory();
    const entry: ExportHistory = {
      id: `export-${Date.now()}`,
      filename: result.filename,
      format: result.filename.split(".").pop() as ExportFormat,
      timestamp: new Date().toISOString(),
      recordCount: result.recordCount,
      size: result.size,
    };

    const updatedHistory = [entry, ...history].slice(0, 50);
    localStorage.setItem("exportHistory", JSON.stringify(updatedHistory));
  } catch (error) {
    console.warn("Failed to save export history", error);
  }
}

export function clearExportHistory(): void {
  try {
    localStorage.removeItem("exportHistory");
  } catch (error) {
    console.warn("Failed to clear export history", error);
  }
}

export function validateExportData<T extends Record<string, unknown>>(
  data: T[],
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(data)) {
    errors.push("Data must be an array");
    return { valid: false, errors };
  }

  if (data.length === 0) {
    errors.push("Data array is empty");
    return { valid: false, errors };
  }

  const firstItem = data[0];
  if (typeof firstItem !== "object" || firstItem === null) {
    errors.push("Data items must be objects");
    return { valid: false, errors };
  }

  const keys = Object.keys(firstItem);
  if (keys.length === 0) {
    errors.push("Data items must have at least one property");
    return { valid: false, errors };
  }

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (typeof item !== "object" || item === null) {
      errors.push(`Item at index ${i} is not an object`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function estimateExportSize(
  recordCount: number,
  format: ExportFormat,
  averageRecordSize: number = 100,
): number {
  const baseSize = recordCount * averageRecordSize;

  switch (format) {
    case "csv":
      return Math.round(baseSize * 1.1);
    case "xlsx":
      return Math.round(baseSize * 1.5);
    case "json":
      return Math.round(baseSize * 1.3);
    default:
      return baseSize;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
