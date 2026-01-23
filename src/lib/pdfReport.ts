import { logger } from "@/lib/logger";

export interface ReportSection {
  title: string;
  content: string | ReportSection[];
  tables?: ReportTable[];
  charts?: ReportChart[];
}

export interface ReportTable {
  headers: string[];
  rows: (string | number)[][];
  caption?: string;
  style?: "default" | "striped" | "bordered";
}

export interface ReportChart {
  type: "bar" | "line" | "pie";
  title: string;
  data: unknown;
  caption?: string;
  width?: string;
  height?: string;
}

export interface ReportConfig {
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
  sections: ReportSection[];
  includeTableOfContents?: boolean;
  includePageNumbers?: boolean;
  theme?: "light" | "dark" | "blue" | "green";
  pageSize?: "A4" | "Letter" | "Legal";
  orientation?: "portrait" | "landscape";
  logo?: string;
  watermark?: string;
}

export interface ReportMetadata {
  generatedAt: string;
  generatedBy: string;
  version: string;
  instanceId?: string;
  template?: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  config: Partial<ReportConfig>;
  isDefault?: boolean;
}

export interface ReportGenerationOptions {
  onProgress?: (progress: number) => void;
  timeout?: number;
  quality?: "low" | "medium" | "high";
  compress?: boolean;
}

const CACHE_TIMEOUT = 300000; // 5 minutes

class ReportCache {
  private cache: Map<string, { html: string; timestamp: number }> = new Map();

  set(key: string, html: string): void {
    this.cache.set(key, { html, timestamp: Date.now() });
    this.cleanup();
  }

  get(key: string): string | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > CACHE_TIMEOUT) {
      this.cache.delete(key);
      return null;
    }

    return cached.html;
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > CACHE_TIMEOUT) {
        this.cache.delete(key);
      }
    }
  }
}

export class PDFReportGenerator {
  private config: ReportConfig;
  private metadata: ReportMetadata;
  private cache: ReportCache;
  private template: ReportTemplate | null = null;

  constructor(
    config: ReportConfig,
    metadata: Partial<ReportMetadata> = {},
    template?: ReportTemplate,
  ) {
    this.config = {
      theme: "light",
      pageSize: "A4",
      orientation: "portrait",
      includeTableOfContents: true,
      includePageNumbers: true,
      ...config,
    };
    this.metadata = {
      generatedAt: new Date().toISOString(),
      generatedBy: "Insight Oracle Monitor",
      version: "1.0.0",
      ...metadata,
    };
    this.cache = new ReportCache();
    this.template = template || null;
  }

  setTemplate(template: ReportTemplate): void {
    this.template = template;
    this.config = { ...this.config, ...template.config };
  }

  getTemplate(): ReportTemplate | null {
    return this.template;
  }

  generateHTML(options?: ReportGenerationOptions): string {
    const cacheKey = this.getCacheKey();
    const cached = this.cache.get(cacheKey);

    if (cached) {
      logger.info("Using cached HTML report", { cacheKey });
      return cached;
    }

    if (options?.onProgress) {
      options.onProgress(10);
    }

    const sectionsHTML = this.config.sections
      .map((section) => this.renderSection(section, options))
      .join("\n");

    if (options?.onProgress) {
      options.onProgress(50);
    }

    const tocHTML = this.config.includeTableOfContents
      ? this.renderTableOfContents()
      : "";

    const html = this.renderDocument(sectionsHTML, tocHTML);

    this.cache.set(cacheKey, html);

    if (options?.onProgress) {
      options.onProgress(100);
    }

    return html;
  }

  private getCacheKey(): string {
    return `${this.config.title}-${this.metadata.instanceId || "default"}-${JSON.stringify(this.config.sections)}`;
  }

  private renderDocument(sectionsHTML: string, tocHTML: string): string {
    const theme = this.getThemeStyles();
    const pageSize = this.getPageSizeStyles();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.config.title}</title>
  <style>
    @page {
      ${pageSize}
      margin: 2cm;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      ${theme.body}
    }

    .header {
      text-align: center;
      margin-bottom: 2cm;
      border-bottom: 2px solid ${theme.primary};
      padding-bottom: 1cm;
    }

    .header h1 {
      font-size: 24pt;
      color: ${theme.primary};
      margin: 0;
    }

    .header .subtitle {
      font-size: 14pt;
      color: ${theme.textSecondary};
      margin-top: 0.5cm;
    }

    .header .metadata {
      font-size: 10pt;
      color: ${theme.textTertiary};
      margin-top: 0.5cm;
    }

    .logo {
      max-width: 150px;
      max-height: 80px;
      margin-bottom: 1cm;
    }

    .toc {
      margin: 1cm 0;
      padding: 1cm;
      background: ${theme.background};
      border-radius: 8px;
    }

    .toc h2 {
      margin-top: 0;
      color: ${theme.primary};
    }

    .toc ul {
      list-style: none;
      padding-left: 0;
    }

    .toc li {
      margin: 0.5cm 0;
      padding-left: 1cm;
    }

    .section {
      margin: 1cm 0;
      page-break-after: always;
    }

    .section h2 {
      color: ${theme.primary};
      border-bottom: 1px solid ${theme.border};
      padding-bottom: 0.3cm;
      margin-top: 0;
    }

    .subsection h3 {
      color: ${theme.textSecondary};
      margin-top: 0.8cm;
    }

    .content {
      margin: 0.5cm 0;
      text-align: justify;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0.5cm 0;
      font-size: 10pt;
    }

    table th {
      background: ${theme.primary};
      color: white;
      padding: 0.3cm;
      text-align: left;
      font-weight: bold;
    }

    table td {
      border: 1px solid ${theme.border};
      padding: 0.3cm;
    }

    table.striped tr:nth-child(even) {
      background: ${theme.striped};
    }

    table.bordered td {
      border: 2px solid ${theme.border};
    }

    .chart-container {
      margin: 1cm 0;
      text-align: center;
      page-break-inside: avoid;
    }

    .chart-container img {
      max-width: 100%;
      height: auto;
    }

    .chart-caption {
      font-size: 10pt;
      color: ${theme.textSecondary};
      margin-top: 0.3cm;
      font-style: italic;
    }

    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 9pt;
      color: ${theme.textTertiary};
      padding: 0.5cm;
      border-top: 1px solid ${theme.border};
    }

    .page-number {
      position: fixed;
      bottom: 0;
      right: 2cm;
      font-size: 9pt;
      color: ${theme.textTertiary};
    }

    .highlight {
      background: ${theme.highlight};
      padding: 0.2cm 0.4cm;
      border-radius: 4px;
      border-left: 3px solid ${theme.warning};
    }

    .critical {
      background: ${theme.critical};
      padding: 0.2cm 0.4cm;
      border-radius: 4px;
      border-left: 3px solid ${theme.error};
    }

    .success {
      background: ${theme.success};
      padding: 0.2cm 0.4cm;
      border-radius: 4px;
      border-left: 3px solid ${theme.successBorder};
    }

    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 100px;
      color: ${theme.watermark};
      opacity: 0.1;
      pointer-events: none;
      z-index: -1;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  ${this.config.logo ? `<img src="${this.config.logo}" class="logo" alt="Logo" />` : ""}
  ${this.config.watermark ? `<div class="watermark">${this.config.watermark}</div>` : ""}
  <div class="header">
    <h1>${this.config.title}</h1>
    ${this.config.subtitle ? `<div class="subtitle">${this.config.subtitle}</div>` : ""}
    <div class="metadata">
      Generated: ${new Date(this.metadata.generatedAt).toLocaleString()}<br/>
      ${this.metadata.instanceId ? `Instance: ${this.metadata.instanceId}<br/>` : ""}
      ${this.config.author ? `Author: ${this.config.author}` : ""}
      ${this.metadata.template ? `Template: ${this.metadata.template}` : ""}
    </div>
  </div>

  ${tocHTML}

  ${sectionsHTML}

  ${this.config.includePageNumbers ? '<div class="page-number">Page <span class="page-number"></span></div>' : ""}
</body>
</html>
    `;
  }

  private getThemeStyles(): Record<string, string> {
    const themes = {
      light: {
        body: "color: #333; background: #fff;",
        primary: "#6366f1",
        textSecondary: "#4b5563",
        textTertiary: "#888",
        background: "#f8fafc",
        border: "#e5e7eb",
        striped: "#f9fafb",
        highlight: "#fef3c7",
        warning: "#f59e0b",
        critical: "#fee2e2",
        error: "#ef4444",
        success: "#d1fae5",
        successBorder: "#10b981",
        watermark: "#000",
      },
      dark: {
        body: "color: #e5e7eb; background: #1f2937;",
        primary: "#818cf8",
        textSecondary: "#9ca3af",
        textTertiary: "#6b7280",
        background: "#374151",
        border: "#4b5563",
        striped: "#4b5563",
        highlight: "#fbbf24",
        warning: "#f59e0b",
        critical: "#b91c1c",
        error: "#dc2626",
        success: "#059669",
        successBorder: "#10b981",
        watermark: "#fff",
      },
      blue: {
        body: "color: #1e3a8a; background: #eff6ff;",
        primary: "#1e40af",
        textSecondary: "#1e3a8a",
        textTertiary: "#64748b",
        background: "#dbeafe",
        border: "#bfdbfe",
        striped: "#eff6ff",
        highlight: "#fef3c7",
        warning: "#f59e0b",
        critical: "#fee2e2",
        error: "#dc2626",
        success: "#d1fae5",
        successBorder: "#10b981",
        watermark: "#1e40af",
      },
      green: {
        body: "color: #14532d; background: #f0fdf4;",
        primary: "#15803d",
        textSecondary: "#14532d",
        textTertiary: "#64748b",
        background: "#dcfce7",
        border: "#bbf7d0",
        striped: "#f0fdf4",
        highlight: "#fef3c7",
        warning: "#f59e0b",
        critical: "#fee2e2",
        error: "#dc2626",
        success: "#d1fae5",
        successBorder: "#10b981",
        watermark: "#15803d",
      },
    };

    return themes[this.config.theme || "light"];
  }

  private getPageSizeStyles(): string {
    const sizes = {
      A4: "size: A4;",
      Letter: "size: Letter;",
      Legal: "size: Legal;",
    };

    const orientations = {
      portrait: "",
      landscape: "orientation: landscape;",
    };

    return `${sizes[this.config.pageSize || "A4"]} ${orientations[this.config.orientation || "portrait"]}`;
  }

  private renderSection(
    section: ReportSection,
    options?: ReportGenerationOptions,
  ): string {
    const headingTag =
      section.content instanceof Array && section.content.length > 0
        ? "h3"
        : "h2";
    const sectionClass = headingTag === "h2" ? "section" : "subsection";

    const contentHTML =
      typeof section.content === "string"
        ? `<div class="content">${section.content}</div>`
        : section.content
            .map((sub) => this.renderSection(sub, options))
            .join("\n");

    const tablesHTML = section.tables
      ? section.tables.map((table) => this.renderTable(table)).join("\n")
      : "";

    const chartsHTML = section.charts
      ? section.charts
          .map((chart) => this.renderChartPlaceholder(chart))
          .join("\n")
      : "";

    return `
      <div class="${sectionClass}">
        <${headingTag}>${section.title}</${headingTag}>
        ${contentHTML}
        ${tablesHTML}
        ${chartsHTML}
      </div>
    `;
  }

  private renderTable(table: ReportTable): string {
    const styleClass = table.style || "default";
    const headerRow = table.headers
      .map((header) => `<th>${header}</th>`)
      .join("");
    const bodyRows = table.rows
      .map(
        (row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`,
      )
      .join("");

    return `
      <table class="${styleClass}">
        ${table.caption ? `<caption>${table.caption}</caption>` : ""}
        <thead>
          <tr>${headerRow}</tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
    `;
  }

  private renderChartPlaceholder(chart: ReportChart): string {
    const width = chart.width || "100%";
    const height = chart.height || "300px";

    return `
      <div class="chart-container">
        <div style="width: ${width}; height: ${height}; background: #f3f4f6; border: 2px dashed #9ca3af; display: flex; align-items: center; justify-content: center; border-radius: 8px;">
          <div style="text-align: center; color: #6b7280;">
            <div style="font-size: 14pt; font-weight: bold; margin-bottom: 0.5cm;">${chart.title}</div>
            <div style="font-size: 10pt;">${chart.type.toUpperCase()} Chart</div>
          </div>
        </div>
        ${chart.caption ? `<div class="chart-caption">${chart.caption}</div>` : ""}
      </div>
    `;
  }

  private renderTableOfContents(): string {
    const tocItems = this.config.sections
      .map((section, index) => {
        return `
        <li>
          <a href="#section-${index}">${index + 1}. ${section.title}</a>
        </li>
      `;
      })
      .join("");

    return `
      <div class="toc">
        <h2>Table of Contents</h2>
        <ul>${tocItems}</ul>
      </div>
    `;
  }

  async generatePDF(options?: ReportGenerationOptions): Promise<Blob> {
    const html = this.generateHTML(options);

    if (options?.onProgress) {
      options.onProgress(10);
    }

    try {
      const response = await fetch("/api/reports/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html, options }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      if (options?.onProgress) {
        options.onProgress(100);
      }

      return await response.blob();
    } catch (error) {
      logger.error("Failed to generate PDF", { error });
      throw error;
    }
  }

  async previewHTML(): Promise<string> {
    return this.generateHTML();
  }

  download(filename?: string, options?: ReportGenerationOptions): void {
    const defaultFilename = `${this.config.title.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.pdf`;
    const finalFilename = filename || defaultFilename;

    this.generatePDF(options)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = finalFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      })
      .catch((error) => {
        logger.error("Failed to download PDF", { error });
      });
  }

  clearCache(): void {
    this.cache.clear();
  }
}

const reportTemplates: ReportTemplate[] = [
  {
    id: "default",
    name: "Default Report",
    description: "Standard report template with light theme",
    config: {
      theme: "light",
      pageSize: "A4",
      orientation: "portrait",
      includeTableOfContents: true,
      includePageNumbers: true,
    },
    isDefault: true,
  },
  {
    id: "dark",
    name: "Dark Theme Report",
    description: "Report with dark theme for better visibility in low light",
    config: {
      theme: "dark",
      pageSize: "A4",
      orientation: "portrait",
      includeTableOfContents: true,
      includePageNumbers: true,
    },
  },
  {
    id: "professional",
    name: "Professional Report",
    description: "Professional report with blue theme",
    config: {
      theme: "blue",
      pageSize: "A4",
      orientation: "portrait",
      includeTableOfContents: true,
      includePageNumbers: true,
    },
  },
  {
    id: "landscape",
    name: "Landscape Report",
    description: "Report optimized for landscape printing",
    config: {
      theme: "light",
      pageSize: "A4",
      orientation: "landscape",
      includeTableOfContents: true,
      includePageNumbers: true,
    },
  },
];

export function getReportTemplates(): ReportTemplate[] {
  return reportTemplates;
}

export function getReportTemplate(id: string): ReportTemplate | undefined {
  return reportTemplates.find((t) => t.id === id);
}

export function addReportTemplate(template: ReportTemplate): void {
  reportTemplates.push(template);
}

export function createOracleReport(
  data: {
    stats: Record<string, unknown>;
    assertions: unknown[];
    disputes: unknown[];
    alerts: unknown[];
  },
  instanceId?: string,
  templateId?: string,
): PDFReportGenerator {
  const template = templateId ? getReportTemplate(templateId) : undefined;

  const config: ReportConfig = {
    title: "Oracle Monitoring Report",
    subtitle: "UMA Optimistic Oracle Performance Analysis",
    author: "Insight Oracle Monitor",
    date: new Date().toISOString(),
    includeTableOfContents: true,
    includePageNumbers: true,
    ...template?.config,
    sections: [
      {
        title: "Executive Summary",
        content: `
          <p>This report provides a comprehensive analysis of UMA Optimistic Oracle performance and monitoring data. Key metrics include assertion volume, dispute rates, alert statistics, and overall system health.</p>
          <div class="highlight">
            <strong>Key Findings:</strong>
            <ul>
              <li>Total Assertions: ${data.assertions.length}</li>
              <li>Active Disputes: ${data.disputes.length}</li>
              <li>Open Alerts: ${data.alerts.length}</li>
            </ul>
          </div>
        `,
      },
      {
        title: "System Statistics",
        content: "",
        tables: [
          {
            headers: ["Metric", "Value"],
            rows: Object.entries(data.stats).map(([key, value]) => [
              key,
              String(value),
            ]),
            caption: "Overall System Metrics",
            style: "striped",
          },
        ],
      },
      {
        title: "Assertions Overview",
        content: `
          <p>The following table provides detailed information about recent assertions processed by oracle.</p>
        `,
        tables: [
          {
            headers: ["ID", "Market", "Status", "Created At", "Bond (USD)"],
            rows: data.assertions
              .slice(0, 10)
              .map((a: any) => [
                a.id || "N/A",
                a.market || "N/A",
                a.status || "N/A",
                a.assertedAt || "N/A",
                a.bondUsd || "N/A",
              ]),
            caption: "Recent Assertions (Top 10)",
            style: "striped",
          },
        ],
      },
      {
        title: "Disputes Analysis",
        content: `
          <p>Disputes represent challenges to assertions and require community voting for resolution.</p>
        `,
        tables: [
          {
            headers: ["ID", "Assertion ID", "Disputer", "Reason", "Status"],
            rows: data.disputes
              .slice(0, 10)
              .map((d: any) => [
                d.id || "N/A",
                d.assertionId || "N/A",
                d.disputer || "N/A",
                d.reason || "N/A",
                d.status || "N/A",
              ]),
            caption: "Recent Disputes (Top 10)",
            style: "striped",
          },
        ],
      },
      {
        title: "Alerts Summary",
        content: `
          <p>Alerts indicate potential issues or anomalies in oracle system that require attention.</p>
        `,
        tables: [
          {
            headers: ["ID", "Type", "Severity", "Status", "Created At"],
            rows: data.alerts
              .slice(0, 10)
              .map((a: any) => [
                a.id || "N/A",
                a.type || "N/A",
                a.severity || "N/A",
                a.status || "N/A",
                a.createdAt || "N/A",
              ]),
            caption: "Recent Alerts (Top 10)",
            style: "striped",
          },
        ],
      },
      {
        title: "Recommendations",
        content: `
          <p>Based on analysis of monitoring data, following recommendations are provided:</p>
          <ul>
            <li>Monitor dispute rates closely and investigate any sudden increases</li>
            <li>Ensure adequate bond levels to maintain oracle security</li>
            <li>Address critical alerts promptly to maintain system reliability</li>
            <li>Regular review of assertion patterns to identify potential issues</li>
          </ul>
        `,
      },
    ],
  };

  const metadata: Partial<ReportMetadata> = {
    instanceId,
    template: templateId || "default",
  };

  return new PDFReportGenerator(config, metadata, template);
}
