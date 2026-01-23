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
}

export interface ReportChart {
  type: "bar" | "line" | "pie";
  title: string;
  data: unknown;
  caption?: string;
}

export interface ReportConfig {
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
  sections: ReportSection[];
  includeTableOfContents?: boolean;
  includePageNumbers?: boolean;
}

export interface ReportMetadata {
  generatedAt: string;
  generatedBy: string;
  version: string;
  instanceId?: string;
}

export class PDFReportGenerator {
  private config: ReportConfig;
  private metadata: ReportMetadata;

  constructor(config: ReportConfig, metadata: Partial<ReportMetadata> = {}) {
    this.config = config;
    this.metadata = {
      generatedAt: new Date().toISOString(),
      generatedBy: "Insight Oracle Monitor",
      version: "1.0.0",
      ...metadata,
    };
  }

  generateHTML(): string {
    const sectionsHTML = this.config.sections
      .map((section) => this.renderSection(section))
      .join("\n");

    const tocHTML = this.config.includeTableOfContents
      ? this.renderTableOfContents()
      : "";

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.config.title}</title>
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
    }

    .header {
      text-align: center;
      margin-bottom: 2cm;
      border-bottom: 2px solid #6366f1;
      padding-bottom: 1cm;
    }

    .header h1 {
      font-size: 24pt;
      color: #6366f1;
      margin: 0;
    }

    .header .subtitle {
      font-size: 14pt;
      color: #666;
      margin-top: 0.5cm;
    }

    .header .metadata {
      font-size: 10pt;
      color: #888;
      margin-top: 0.5cm;
    }

    .toc {
      margin: 1cm 0;
      padding: 1cm;
      background: #f8fafc;
      border-radius: 8px;
    }

    .toc h2 {
      margin-top: 0;
      color: #6366f1;
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
      color: #6366f1;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 0.3cm;
      margin-top: 0;
    }

    .subsection h3 {
      color: #4b5563;
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
      background: #6366f1;
      color: white;
      padding: 0.3cm;
      text-align: left;
      font-weight: bold;
    }

    table td {
      border: 1px solid #e5e7eb;
      padding: 0.3cm;
    }

    table tr:nth-child(even) {
      background: #f9fafb;
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
      color: #666;
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
      color: #888;
      padding: 0.5cm;
      border-top: 1px solid #e5e7eb;
    }

    .page-number {
      position: fixed;
      bottom: 0;
      right: 2cm;
      font-size: 9pt;
      color: #888;
    }

    .highlight {
      background: #fef3c7;
      padding: 0.2cm 0.4cm;
      border-radius: 4px;
      border-left: 3px solid #f59e0b;
    }

    .critical {
      background: #fee2e2;
      padding: 0.2cm 0.4cm;
      border-radius: 4px;
      border-left: 3px solid #ef4444;
    }

    .success {
      background: #d1fae5;
      padding: 0.2cm 0.4cm;
      border-radius: 4px;
      border-left: 3px solid #10b981;
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
  <div class="header">
    <h1>${this.config.title}</h1>
    ${this.config.subtitle ? `<div class="subtitle">${this.config.subtitle}</div>` : ""}
    <div class="metadata">
      Generated: ${new Date(this.metadata.generatedAt).toLocaleString()}<br/>
      ${this.metadata.instanceId ? `Instance: ${this.metadata.instanceId}<br/>` : ""}
      ${this.config.author ? `Author: ${this.config.author}` : ""}
    </div>
  </div>

  ${tocHTML}

  ${sectionsHTML}

  ${this.config.includePageNumbers ? '<div class="page-number">Page <span class="page-number"></span></div>' : ''}
</body>
</html>
    `;
  }

  private renderSection(section: ReportSection, level: number = 1): string {
    const headingTag = level === 1 ? "h2" : "h3";
    const sectionClass = level === 1 ? "section" : "subsection";

    const contentHTML = typeof section.content === "string"
      ? `<div class="content">${section.content}</div>`
      : section.content.map((sub) => this.renderSection(sub, level + 1)).join("\n");

    const tablesHTML = section.tables
      ? section.tables.map((table) => this.renderTable(table)).join("\n")
      : "";

    const chartsHTML = section.charts
      ? section.charts.map((chart) => this.renderChartPlaceholder(chart)).join("\n")
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
    const headerRow = table.headers.map((header) => `<th>${header}</th>`).join("");
    const bodyRows = table.rows.map((row) =>
      `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`
    ).join("");

    return `
      <table>
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
    return `
      <div class="chart-container">
        <div style="width: 100%; height: 300px; background: #f3f4f6; border: 2px dashed #9ca3af; display: flex; align-items: center; justify-content: center; border-radius: 8px;">
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
    const tocItems = this.config.sections.map((section, index) => {
      return `
        <li>
          <a href="#section-${index}">${index + 1}. ${section.title}</a>
        </li>
      `;
    }).join("");

    return `
      <div class="toc">
        <h2>Table of Contents</h2>
        <ul>${tocItems}</ul>
      </div>
    `;
  }

  async generatePDF(): Promise<Blob> {
    const html = this.generateHTML();

    const response = await fetch("/api/reports/generate-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate PDF");
    }

    return await response.blob();
  }

  download(filename?: string): void {
    const defaultFilename = `${this.config.title.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.pdf`;
    const finalFilename = filename || defaultFilename;

    this.generatePDF().then((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = finalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }).catch((error) => {
      console.error("Failed to download PDF:", error);
    });
  }
}

export function createOracleReport(
  data: {
    stats: Record<string, unknown>;
    assertions: unknown[];
    disputes: unknown[];
    alerts: unknown[];
  },
  instanceId?: string,
): PDFReportGenerator {
  const config: ReportConfig = {
    title: "Oracle Monitoring Report",
    subtitle: "UMA Optimistic Oracle Performance Analysis",
    author: "Insight Oracle Monitor",
    date: new Date().toISOString(),
    includeTableOfContents: true,
    includePageNumbers: true,
    sections: [
      {
        title: "Executive Summary",
        content: `
          <p>This report provides a comprehensive analysis of the UMA Optimistic Oracle performance and monitoring data. Key metrics include assertion volume, dispute rates, alert statistics, and overall system health.</p>
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
            rows: Object.entries(data.stats).map(([key, value]) => [key, String(value)]),
            caption: "Overall System Metrics",
          },
        ],
      },
      {
        title: "Assertions Overview",
        content: `
          <p>The following table provides detailed information about recent assertions processed by the oracle.</p>
        `,
        tables: [
          {
            headers: ["ID", "Market", "Status", "Created At", "Bond (USD)"],
            rows: data.assertions.slice(0, 10).map((a: any) => [
              a.id || "N/A",
              a.market || "N/A",
              a.status || "N/A",
              a.assertedAt || "N/A",
              a.bondUsd || "N/A",
            ]),
            caption: "Recent Assertions (Top 10)",
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
            rows: data.disputes.slice(0, 10).map((d: any) => [
              d.id || "N/A",
              d.assertionId || "N/A",
              d.disputer || "N/A",
              d.reason || "N/A",
              d.status || "N/A",
            ]),
            caption: "Recent Disputes (Top 10)",
          },
        ],
      },
      {
        title: "Alerts Summary",
        content: `
          <p>Alerts indicate potential issues or anomalies in the oracle system that require attention.</p>
        `,
        tables: [
          {
            headers: ["ID", "Type", "Severity", "Status", "Created At"],
            rows: data.alerts.slice(0, 10).map((a: any) => [
              a.id || "N/A",
              a.type || "N/A",
              a.severity || "N/A",
              a.status || "N/A",
              a.createdAt || "N/A",
            ]),
            caption: "Recent Alerts (Top 10)",
          },
        ],
      },
      {
        title: "Recommendations",
        content: `
          <p>Based on the analysis of the monitoring data, the following recommendations are provided:</p>
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
  };

  return new PDFReportGenerator(config, metadata);
}