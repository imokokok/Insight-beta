export type ExportFormat = "csv" | "xlsx" | "json";

export interface ExportOptions {
  filename?: string;
  format?: ExportFormat;
  headers?: string[];
  dateFormat?: string;
  numberFormat?: "decimal" | "currency" | "percentage";
}

export function exportData<T extends Record<string, unknown>>(
  data: T[],
  options: ExportOptions = {},
): void {
  const {
    filename = `export-${Date.now()}`,
    format = "csv",
    headers,
  } = options;

  switch (format) {
    case "csv":
      exportToCSV(data, { filename, headers });
      break;
    case "xlsx":
      exportToExcel(data, { filename, headers });
      break;
    case "json":
      exportToJSON(data, { filename });
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  options: { filename: string; headers?: string[] },
): void {
  if (data.length === 0) {
    throw new Error("No data to export");
  }

  const headers = options.headers || Object.keys(data[0]);
  const csvRows: string[] = [];

  csvRows.push(headers.join(","));

  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header];
      return formatCSVValue(value);
    });
    csvRows.push(values.join(","));
  }

  const csvContent = csvRows.join("\n");
  downloadFile(csvContent, `${options.filename}.csv`, "text/csv;charset=utf-8;");
}

function formatCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  options: { filename: string; headers?: string[] },
): void {
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
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  downloadFile(csvContent, `${options.filename}.csv`, "text/csv;charset=utf-8;");
}

function exportToJSON<T extends Record<string, unknown>>(
  data: T[],
  options: { filename: string },
): void {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, `${options.filename}.json`, "application/json;charset=utf-8;");
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  return `${prefix}-${timestamp}.${format}`;
}