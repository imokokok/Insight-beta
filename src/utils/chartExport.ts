export interface ExportOptions {
  filename?: string;
  watermark?: string;
  timestamp?: boolean;
}

function addWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  watermark: string,
): void {
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.font = '14px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#666';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(watermark, width - 10, height - 10);
  ctx.restore();
}

function addTimestamp(ctx: CanvasRenderingContext2D, _width: number, height: number): void {
  const timestamp = new Date().toISOString();
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.font = '12px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#999';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(timestamp, 10, height - 10);
  ctx.restore();
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateFilename(baseName: string, extension: string): string {
  const timestamp = new Date().toISOString().split('T')[0];
  return `${baseName}-${timestamp}.${extension}`;
}

export async function exportChartAsPNG(
  element: HTMLElement,
  options?: ExportOptions,
): Promise<void> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  const rect = element.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;

  canvas.width = rect.width * scale;
  canvas.height = rect.height * scale;
  ctx.scale(scale, scale);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, rect.width, rect.height);

  const svgData = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width: ${rect.width}px; height: ${rect.height}px;">
          ${element.innerHTML}
        </div>
      </foreignObject>
    </svg>
  `;

  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);

      if (options?.watermark) {
        addWatermark(ctx, rect.width, rect.height, options.watermark);
      }

      if (options?.timestamp !== false) {
        addTimestamp(ctx, rect.width, rect.height);
      }

      canvas.toBlob((blob) => {
        if (blob) {
          const filename = generateFilename(options?.filename || 'chart', 'png');
          downloadBlob(blob, filename);
          resolve();
        } else {
          reject(new Error('Failed to create PNG blob'));
        }
      }, 'image/png');

      URL.revokeObjectURL(url);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG for PNG export'));
    };

    img.src = url;
  });
}

export async function exportChartAsSVG(
  element: HTMLElement,
  options?: ExportOptions,
): Promise<void> {
  const rect = element.getBoundingClientRect();

  let svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width: ${rect.width}px; height: ${rect.height}px; background: #ffffff;">
          ${element.innerHTML}
        </div>
      </foreignObject>
  `;

  if (options?.watermark) {
    svgContent += `
      <text x="${rect.width - 10}" y="${rect.height - 10}" 
            text-anchor="end" 
            font-family="Inter, system-ui, sans-serif" 
            font-size="14" 
            fill="#666" 
            opacity="0.3">
        ${options.watermark}
      </text>
    `;
  }

  if (options?.timestamp !== false) {
    const timestamp = new Date().toISOString();
    svgContent += `
      <text x="10" y="${rect.height - 10}" 
            text-anchor="start" 
            font-family="Inter, system-ui, sans-serif" 
            font-size="12" 
            fill="#999" 
            opacity="0.5">
        ${timestamp}
      </text>
    `;
  }

  svgContent += '</svg>';

  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const filename = generateFilename(options?.filename || 'chart', 'svg');
  downloadBlob(blob, filename);
}

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportDataAsCSV(data: object[], filename: string): void {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const firstRow = data[0] as Record<string, unknown>;
  const headers = Object.keys(firstRow);
  const csvRows: string[] = [];

  csvRows.push(headers.map(escapeCSV).join(','));

  for (const row of data) {
    const values = headers.map((header) => escapeCSV((row as Record<string, unknown>)[header]));
    csvRows.push(values.join(','));
  }

  const csvContent = csvRows.join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  const finalFilename = generateFilename(filename, 'csv');
  downloadBlob(blob, finalFilename);
}

export function exportDataAsJSON(data: object, filename: string): void {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
  const finalFilename = generateFilename(filename, 'json');
  downloadBlob(blob, finalFilename);
}
