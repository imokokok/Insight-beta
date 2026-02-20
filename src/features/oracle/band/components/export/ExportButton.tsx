'use client';

import { useMemo } from 'react';

import type { Bridge, DataSource } from '@/features/oracle/band';
import {
  ExportButton,
  escapeCSV,
  escapeXML,
  type ExportConfig,
} from '@/features/oracle/components/shared';

interface BandExportData {
  overviewStats: {
    totalBridges: number;
    activeBridges: number;
    totalTransfers: number;
    totalSources: number;
  };
  bridgesData: {
    bridges: Bridge[];
    summary: {
      total: number;
      active: number;
      inactive: number;
      degraded: number;
      totalTransfers: number;
      avgLatency: number;
    };
  } | null;
  sourcesData: {
    sources: DataSource[];
    summary: {
      total: number;
      active: number;
      inactive: number;
      evmCount: number;
      cosmosCount: number;
      avgReliability: number;
    };
  } | null;
  generatedAt: string;
}

interface BandExportButtonProps {
  data: BandExportData | null;
  disabled?: boolean;
}

function generateCSV(data: BandExportData): string {
  const rows: string[] = [];

  rows.push('=== Band Protocol Overview ===');
  rows.push('Metric,Value');
  rows.push(`Total Bridges,${data.overviewStats.totalBridges}`);
  rows.push(`Active Bridges,${data.overviewStats.activeBridges}`);
  rows.push(`Total Transfers,${data.overviewStats.totalTransfers}`);
  rows.push(`Total Sources,${data.overviewStats.totalSources}`);

  if (data.bridgesData?.bridges && data.bridgesData.bridges.length > 0) {
    rows.push('');
    rows.push('=== Bridges ===');
    rows.push(
      'Bridge ID,Source Chain,Destination Chain,Status,Total Transfers,Total Volume,Avg Latency (ms),Success Rate',
    );
    data.bridgesData.bridges.forEach((bridge) => {
      rows.push(
        [
          escapeCSV(bridge.bridgeId),
          escapeCSV(bridge.sourceChain),
          escapeCSV(bridge.destinationChain),
          escapeCSV(bridge.status),
          bridge.totalTransfers,
          bridge.totalVolume,
          bridge.avgLatencyMs,
          bridge.successRate,
        ].join(','),
      );
    });
  }

  if (data.sourcesData?.sources && data.sourcesData.sources.length > 0) {
    rows.push('');
    rows.push('=== Data Sources ===');
    rows.push('Source ID,Name,Chain,Symbol,Status,Reliability Score,Update Interval (s)');
    data.sourcesData.sources.forEach((source) => {
      rows.push(
        [
          escapeCSV(source.sourceId),
          escapeCSV(source.name),
          escapeCSV(source.chain),
          escapeCSV(source.symbol),
          escapeCSV(source.status),
          source.reliabilityScore,
          source.updateIntervalSeconds,
        ].join(','),
      );
    });
  }

  rows.push('');
  rows.push(`Generated At,${escapeCSV(data.generatedAt)}`);

  return rows.join('\n');
}

function generateExcelXML(data: BandExportData): string {
  let bridgesTable = '';
  if (data.bridgesData?.bridges && data.bridgesData.bridges.length > 0) {
    bridgesTable = data.bridgesData.bridges
      .map(
        (bridge) => `      <Row>
        <Cell><Data ss:Type="String">${escapeXML(bridge.bridgeId)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(bridge.sourceChain)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(bridge.destinationChain)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(bridge.status)}</Data></Cell>
        <Cell><Data ss:Type="Number">${bridge.totalTransfers}</Data></Cell>
        <Cell><Data ss:Type="Number">${bridge.totalVolume}</Data></Cell>
        <Cell><Data ss:Type="Number">${bridge.avgLatencyMs}</Data></Cell>
        <Cell><Data ss:Type="Number">${bridge.successRate}</Data></Cell>
      </Row>`,
      )
      .join('\n');
  }

  let sourcesTable = '';
  if (data.sourcesData?.sources && data.sourcesData.sources.length > 0) {
    sourcesTable = data.sourcesData.sources
      .map(
        (source) => `      <Row>
        <Cell><Data ss:Type="String">${escapeXML(source.name)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(source.chain)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(source.symbol)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(source.status)}</Data></Cell>
        <Cell><Data ss:Type="Number">${source.reliabilityScore}</Data></Cell>
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
      <Row>
        <Cell><Data ss:Type="String">Total Bridges</Data></Cell>
        <Cell><Data ss:Type="Number">${data.overviewStats.totalBridges}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Active Bridges</Data></Cell>
        <Cell><Data ss:Type="Number">${data.overviewStats.activeBridges}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Total Transfers</Data></Cell>
        <Cell><Data ss:Type="Number">${data.overviewStats.totalTransfers}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Total Sources</Data></Cell>
        <Cell><Data ss:Type="Number">${data.overviewStats.totalSources}</Data></Cell>
      </Row>
${
  data.bridgesData?.summary
    ? `
      <Row>
        <Cell><Data ss:Type="String">Avg Latency (ms)</Data></Cell>
        <Cell><Data ss:Type="Number">${data.bridgesData.summary.avgLatency}</Data></Cell>
      </Row>
`
    : ''
}
${
  data.sourcesData?.summary
    ? `
      <Row>
        <Cell><Data ss:Type="String">Avg Reliability (%)</Data></Cell>
        <Cell><Data ss:Type="Number">${data.sourcesData.summary.avgReliability}</Data></Cell>
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
  <Worksheet ss:Name="Bridges">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Bridge ID</Data></Cell>
        <Cell><Data ss:Type="String">Source Chain</Data></Cell>
        <Cell><Data ss:Type="String">Destination Chain</Data></Cell>
        <Cell><Data ss:Type="String">Status</Data></Cell>
        <Cell><Data ss:Type="Number">Total Transfers</Data></Cell>
        <Cell><Data ss:Type="Number">Total Volume</Data></Cell>
        <Cell><Data ss:Type="Number">Avg Latency (ms)</Data></Cell>
        <Cell><Data ss:Type="Number">Success Rate</Data></Cell>
      </Row>
${bridgesTable}
    </Table>
  </Worksheet>
  <Worksheet ss:Name="Data Sources">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Name</Data></Cell>
        <Cell><Data ss:Type="String">Chain</Data></Cell>
        <Cell><Data ss:Type="String">Symbol</Data></Cell>
        <Cell><Data ss:Type="String">Status</Data></Cell>
        <Cell><Data ss:Type="Number">Reliability Score</Data></Cell>
      </Row>
${sourcesTable}
    </Table>
  </Worksheet>
</Workbook>`;
}

export function BandExportButton({ data, disabled }: BandExportButtonProps) {
  const config: ExportConfig<BandExportData> = useMemo(
    () => ({
      filenamePrefix: 'band-report',
      generateCSV,
      generateExcel: generateExcelXML,
    }),
    [],
  );

  return <ExportButton data={data} config={config} disabled={disabled} />;
}
