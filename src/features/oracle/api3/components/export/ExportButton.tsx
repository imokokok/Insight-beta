'use client';

import { useMemo } from 'react';

import {
  ExportButton,
  escapeCSV,
  escapeXML,
  type ExportConfig,
} from '@/features/oracle/components/shared';

interface Api3ExportData {
  overviewStats: {
    totalAirnodes: number;
    onlineAirnodes: number;
    totalDapis: number;
  } | null;
  airnodesData: {
    airnodes: Array<{
      chain: string;
      online: boolean;
      lastHeartbeat: string | null;
      responseTime: number;
      dataFeeds: string[];
    }>;
    metadata: {
      total: number;
      online: number;
      offline: number;
      supportedChains: string[];
      filter: string;
    };
  } | null;
  oevData: {
    events: Array<{
      id: string;
      dapiName: string;
      chain: string;
      feedId: string;
      value: string;
      timestamp: string;
      blockNumber?: number;
    }>;
    metadata: {
      total: number;
      timeRange: string;
      cutoffTime: string;
      queriedChains: string[];
      queriedDapis: string[];
      supportedChains: string[];
    };
  } | null;
  dapisData: {
    dapis: Array<{
      symbol: string;
      feedId: string;
      chain: string;
      contractAddress: string;
      dataFeedAddress: string | null;
      decimals: number;
      status: 'active' | 'inactive' | 'unknown';
    }>;
    metadata: {
      total: number;
      active: number;
      inactive: number;
      unknown: number;
      supportedChains: string[];
      availableSymbols: string[];
    };
  } | null;
  generatedAt: string;
}

interface Api3ExportButtonProps {
  data: Api3ExportData | null;
  disabled?: boolean;
}

function generateCSV(data: Api3ExportData): string {
  const rows: string[] = [];

  rows.push('=== API3 Overview ===');
  rows.push('Metric,Value');
  if (data.overviewStats) {
    rows.push(`Total Airnodes,${data.overviewStats.totalAirnodes}`);
    rows.push(`Online Airnodes,${data.overviewStats.onlineAirnodes}`);
    rows.push(`Total dAPIs,${data.overviewStats.totalDapis}`);
  }

  if (data.airnodesData?.airnodes && data.airnodesData.airnodes.length > 0) {
    rows.push('');
    rows.push('=== Airnodes ===');
    rows.push('Chain,Online,Last Heartbeat,Response Time (ms),Data Feeds');
    data.airnodesData.airnodes.forEach((airnode) => {
      rows.push(
        [
          escapeCSV(airnode.chain),
          airnode.online ? 'Yes' : 'No',
          escapeCSV(airnode.lastHeartbeat || 'N/A'),
          airnode.responseTime,
          escapeCSV(airnode.dataFeeds.join('; ')),
        ].join(','),
      );
    });
  }

  if (data.dapisData?.dapis && data.dapisData.dapis.length > 0) {
    rows.push('');
    rows.push('=== dAPIs ===');
    rows.push('Symbol,Feed ID,Chain,Contract Address,Status,Decimals');
    data.dapisData.dapis.forEach((dapi) => {
      rows.push(
        [
          escapeCSV(dapi.symbol),
          escapeCSV(dapi.feedId),
          escapeCSV(dapi.chain),
          escapeCSV(dapi.contractAddress),
          escapeCSV(dapi.status),
          dapi.decimals,
        ].join(','),
      );
    });
  }

  if (data.oevData?.events && data.oevData.events.length > 0) {
    rows.push('');
    rows.push('=== Price Update Events ===');
    rows.push('ID,dAPI Name,Chain,Feed ID,Value,Timestamp,Block Number');
    data.oevData.events.forEach((event) => {
      rows.push(
        [
          escapeCSV(event.id),
          escapeCSV(event.dapiName),
          escapeCSV(event.chain),
          escapeCSV(event.feedId),
          escapeCSV(event.value),
          escapeCSV(event.timestamp),
          event.blockNumber || '',
        ].join(','),
      );
    });
  }

  rows.push('');
  rows.push(`Generated At,${escapeCSV(data.generatedAt)}`);

  return rows.join('\n');
}

function generateExcelXML(data: Api3ExportData): string {
  let airnodesTable = '';
  if (data.airnodesData?.airnodes && data.airnodesData.airnodes.length > 0) {
    airnodesTable = data.airnodesData.airnodes
      .map(
        (airnode) => `      <Row>
        <Cell><Data ss:Type="String">${escapeXML(airnode.chain)}</Data></Cell>
        <Cell><Data ss:Type="String">${airnode.online ? 'Yes' : 'No'}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(airnode.lastHeartbeat || 'N/A')}</Data></Cell>
        <Cell><Data ss:Type="Number">${airnode.responseTime}</Data></Cell>
      </Row>`,
      )
      .join('\n');
  }

  let dapisTable = '';
  if (data.dapisData?.dapis && data.dapisData.dapis.length > 0) {
    dapisTable = data.dapisData.dapis
      .map(
        (dapi) => `      <Row>
        <Cell><Data ss:Type="String">${escapeXML(dapi.symbol)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(dapi.chain)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(dapi.contractAddress)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(dapi.status)}</Data></Cell>
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
        <Cell><Data ss:Type="String">Total Airnodes</Data></Cell>
        <Cell><Data ss:Type="Number">${data.overviewStats.totalAirnodes}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Online Airnodes</Data></Cell>
        <Cell><Data ss:Type="Number">${data.overviewStats.onlineAirnodes}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Total dAPIs</Data></Cell>
        <Cell><Data ss:Type="Number">${data.overviewStats.totalDapis}</Data></Cell>
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
  <Worksheet ss:Name="Airnodes">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Chain</Data></Cell>
        <Cell><Data ss:Type="String">Online</Data></Cell>
        <Cell><Data ss:Type="String">Last Heartbeat</Data></Cell>
        <Cell><Data ss:Type="Number">Response Time (ms)</Data></Cell>
      </Row>
${airnodesTable}
    </Table>
  </Worksheet>
  <Worksheet ss:Name="dAPIs">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Symbol</Data></Cell>
        <Cell><Data ss:Type="String">Chain</Data></Cell>
        <Cell><Data ss:Type="String">Contract Address</Data></Cell>
        <Cell><Data ss:Type="String">Status</Data></Cell>
      </Row>
${dapisTable}
    </Table>
  </Worksheet>
</Workbook>`;
}

export function Api3ExportButton({ data, disabled }: Api3ExportButtonProps) {
  const config: ExportConfig<Api3ExportData> = useMemo(
    () => ({
      filenamePrefix: 'api3-report',
      generateCSV,
      generateExcel: generateExcelXML,
    }),
    [],
  );

  return <ExportButton data={data} config={config} disabled={disabled} />;
}
