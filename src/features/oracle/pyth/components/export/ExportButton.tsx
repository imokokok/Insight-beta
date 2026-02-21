'use client';

import { useMemo } from 'react';

import { ExportButton, escapeCSV, escapeXML, type ExportConfig } from '@/components/common';

interface PythExportData {
  overviewStats: {
    totalPublishers: number;
    activePublishers: number;
    activePriceFeeds: number;
    avgLatency: number;
  } | null;
  publisherStats: {
    total: number;
    active: number;
    inactive: number;
  } | null;
  priceFeedStats: {
    total: number;
    active: number;
    avgUpdateFrequency: number;
    avgLatency: number;
  } | null;
  hermesStatus: {
    status: 'healthy' | 'degraded' | 'down';
    endpoints: Array<{
      name: string;
      url: string;
      status: 'online' | 'offline';
      latency: number;
    }>;
  } | null;
  generatedAt: string;
}

interface PythExportButtonProps {
  data: PythExportData | null;
  disabled?: boolean;
}

function generateCSV(data: PythExportData): string {
  const rows: string[] = [];

  rows.push('=== Pyth Network Overview ===');
  rows.push('Metric,Value');
  if (data.overviewStats) {
    rows.push(`Total Publishers,${data.overviewStats.totalPublishers}`);
    rows.push(`Active Publishers,${data.overviewStats.activePublishers}`);
    rows.push(`Active Price Feeds,${data.overviewStats.activePriceFeeds}`);
    rows.push(`Avg Latency (ms),${data.overviewStats.avgLatency}`);
  }

  if (data.publisherStats) {
    rows.push('');
    rows.push('=== Publisher Stats ===');
    rows.push(`Total,${data.publisherStats.total}`);
    rows.push(`Active,${data.publisherStats.active}`);
    rows.push(`Inactive,${data.publisherStats.inactive}`);
  }

  if (data.priceFeedStats) {
    rows.push('');
    rows.push('=== Price Feed Stats ===');
    rows.push(`Total,${data.priceFeedStats.total}`);
    rows.push(`Active,${data.priceFeedStats.active}`);
    rows.push(`Avg Update Frequency (s),${data.priceFeedStats.avgUpdateFrequency}`);
    rows.push(`Avg Latency (ms),${data.priceFeedStats.avgLatency}`);
  }

  if (data.hermesStatus) {
    rows.push('');
    rows.push('=== Hermes Status ===');
    rows.push(`Overall Status,${data.hermesStatus.status}`);
    if (data.hermesStatus.endpoints.length > 0) {
      rows.push('');
      rows.push('Endpoint Name,URL,Status,Latency (ms)');
      data.hermesStatus.endpoints.forEach((endpoint) => {
        rows.push(
          [
            escapeCSV(endpoint.name),
            escapeCSV(endpoint.url),
            escapeCSV(endpoint.status),
            endpoint.latency,
          ].join(','),
        );
      });
    }
  }

  rows.push('');
  rows.push(`Generated At,${escapeCSV(data.generatedAt)}`);

  return rows.join('\n');
}

function generateExcelXML(data: PythExportData): string {
  let endpointsTable = '';
  if (data.hermesStatus?.endpoints && data.hermesStatus.endpoints.length > 0) {
    endpointsTable = data.hermesStatus.endpoints
      .map(
        (endpoint) => `      <Row>
        <Cell><Data ss:Type="String">${escapeXML(endpoint.name)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(endpoint.url)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(endpoint.status)}</Data></Cell>
        <Cell><Data ss:Type="Number">${endpoint.latency}</Data></Cell>
      </Row>`,
      )
      .join('\n');
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Overview">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Metric</Data></Cell>
        <Cell><Data ss:Type="String">Value</Data></Cell>
      </Row>
${
  data.overviewStats
    ? `
      <Row>
        <Cell><Data ss:Type="String">Total Publishers</Data></Cell>
        <Cell><Data ss:Type="Number">${data.overviewStats.totalPublishers}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Active Publishers</Data></Cell>
        <Cell><Data ss:Type="Number">${data.overviewStats.activePublishers}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Active Price Feeds</Data></Cell>
        <Cell><Data ss:Type="Number">${data.overviewStats.activePriceFeeds}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Avg Latency (ms)</Data></Cell>
        <Cell><Data ss:Type="Number">${data.overviewStats.avgLatency}</Data></Cell>
      </Row>
`
    : ''
}
${
  data.publisherStats
    ? `
      <Row>
        <Cell><Data ss:Type="String">Publisher Total</Data></Cell>
        <Cell><Data ss:Type="Number">${data.publisherStats.total}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Publisher Active</Data></Cell>
        <Cell><Data ss:Type="Number">${data.publisherStats.active}</Data></Cell>
      </Row>
`
    : ''
}
${
  data.priceFeedStats
    ? `
      <Row>
        <Cell><Data ss:Type="String">Price Feed Total</Data></Cell>
        <Cell><Data ss:Type="Number">${data.priceFeedStats.total}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Price Feed Active</Data></Cell>
        <Cell><Data ss:Type="Number">${data.priceFeedStats.active}</Data></Cell>
      </Row>
`
    : ''
}
      <Row>
        <Cell><Data ss:Type="String">Generated At</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(data.generatedAt)}</Data></Cell>
      </Row>
    </Table>
  </Worksheet>
  <Worksheet ss:Name="Hermes Endpoints">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Name</Data></Cell>
        <Cell><Data ss:Type="String">URL</Data></Cell>
        <Cell><Data ss:Type="String">Status</Data></Cell>
        <Cell><Data ss:Type="Number">Latency (ms)</Data></Cell>
      </Row>
${endpointsTable}
    </Table>
  </Worksheet>
</Workbook>`;
}

export function PythExportButton({ data, disabled }: PythExportButtonProps) {
  const config: ExportConfig<PythExportData> = useMemo(
    () => ({
      filenamePrefix: 'pyth-report',
      generateCSV,
      generateExcel: generateExcelXML,
    }),
    [],
  );

  return <ExportButton data={data} config={config} disabled={disabled} />;
}
