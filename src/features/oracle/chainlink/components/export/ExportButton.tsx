'use client';

import { useMemo } from 'react';

import { ExportButton, escapeCSV, escapeXML, type ExportConfig } from '@/components/common';

interface ChainlinkExportData {
  overviewStats: {
    totalFeeds: number;
    activeNodes: number;
    ocrRounds: number;
    avgLatency: number;
  } | null;
  overviewData: {
    feeds: Array<{
      pair: string;
      status: string;
      decimals: number;
      lastUpdate: string;
    }>;
    metadata: {
      totalFeeds: number;
      activeFeeds: number;
      supportedChains: string[];
    };
  } | null;
  generatedAt: string;
}

interface ChainlinkExportButtonProps {
  data: ChainlinkExportData | null;
  disabled?: boolean;
}

function generateCSV(data: ChainlinkExportData): string {
  const rows: string[] = [];

  rows.push('=== Chainlink Overview ===');
  rows.push('Metric,Value');
  if (data.overviewStats) {
    rows.push(`Total Feeds,${data.overviewStats.totalFeeds}`);
    rows.push(`Active Nodes,${data.overviewStats.activeNodes}`);
    rows.push(`OCR Rounds,${data.overviewStats.ocrRounds}`);
    rows.push(`Avg Latency (ms),${data.overviewStats.avgLatency}`);
  }

  if (data.overviewData?.metadata) {
    rows.push(`Total Feeds (Metadata),${data.overviewData.metadata.totalFeeds}`);
    rows.push(`Active Feeds,${data.overviewData.metadata.activeFeeds}`);
    rows.push(`Supported Chains,${data.overviewData.metadata.supportedChains.join('; ')}`);
  }

  if (data.overviewData?.feeds && data.overviewData.feeds.length > 0) {
    rows.push('');
    rows.push('=== Price Feeds ===');
    rows.push('Pair,Status,Decimals,Last Update');
    data.overviewData.feeds.forEach((feed) => {
      rows.push(
        [
          escapeCSV(feed.pair),
          escapeCSV(feed.status),
          feed.decimals,
          escapeCSV(feed.lastUpdate),
        ].join(','),
      );
    });
  }

  rows.push('');
  rows.push(`Generated At,${escapeCSV(data.generatedAt)}`);

  return rows.join('\n');
}

function generateExcelXML(data: ChainlinkExportData): string {
  let feedsTable = '';
  if (data.overviewData?.feeds && data.overviewData.feeds.length > 0) {
    feedsTable = data.overviewData.feeds
      .map(
        (feed) => `      <Row>
        <Cell><Data ss:Type="String">${escapeXML(feed.pair)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(feed.status)}</Data></Cell>
        <Cell><Data ss:Type="Number">${feed.decimals}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(feed.lastUpdate)}</Data></Cell>
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
        <Cell><Data ss:Type="String">Total Feeds</Data></Cell>
        <Cell><Data ss:Type="Number">${data.overviewStats.totalFeeds}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Active Nodes</Data></Cell>
        <Cell><Data ss:Type="Number">${data.overviewStats.activeNodes}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">OCR Rounds</Data></Cell>
        <Cell><Data ss:Type="Number">${data.overviewStats.ocrRounds}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Avg Latency (ms)</Data></Cell>
        <Cell><Data ss:Type="Number">${data.overviewStats.avgLatency}</Data></Cell>
      </Row>
`
    : ''
}
${
  data.overviewData?.metadata
    ? `
      <Row>
        <Cell><Data ss:Type="String">Active Feeds</Data></Cell>
        <Cell><Data ss:Type="Number">${data.overviewData.metadata.activeFeeds}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Supported Chains</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(data.overviewData.metadata.supportedChains.join(', '))}</Data></Cell>
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
  <Worksheet ss:Name="Price Feeds">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Pair</Data></Cell>
        <Cell><Data ss:Type="String">Status</Data></Cell>
        <Cell><Data ss:Type="Number">Decimals</Data></Cell>
        <Cell><Data ss:Type="String">Last Update</Data></Cell>
      </Row>
${feedsTable}
    </Table>
  </Worksheet>
</Workbook>`;
}

export function ChainlinkExportButton({ data, disabled }: ChainlinkExportButtonProps) {
  const config: ExportConfig<ChainlinkExportData> = useMemo(
    () => ({
      filenamePrefix: 'chainlink-report',
      generateCSV,
      generateExcel: generateExcelXML,
    }),
    [],
  );

  return <ExportButton data={data} config={config} disabled={disabled} />;
}
