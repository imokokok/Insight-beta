'use client';

import { useMemo } from 'react';

import { ExportButton, escapeCSV, escapeXML, type ExportConfig } from '@/components/common';
import type { DisputeReport, Dispute, DisputeTrend } from '@/types/oracle/dispute';

interface DisputeExportButtonProps {
  report: DisputeReport | null;
  disabled?: boolean;
}

function disputesToCSV(disputes: Dispute[]): string {
  const headers = [
    'id',
    'assertionId',
    'protocol',
    'chain',
    'disputer',
    'asserter',
    'claim',
    'bond',
    'disputeBond',
    'currency',
    'status',
    'resolutionResult',
    'proposedAt',
    'disputedAt',
    'settledAt',
    'txHash',
    'blockNumber',
  ];
  const rows = disputes.map((dispute) =>
    [
      escapeCSV(dispute.id),
      escapeCSV(dispute.assertionId),
      escapeCSV(dispute.protocol),
      escapeCSV(dispute.chain),
      escapeCSV(dispute.disputer),
      escapeCSV(dispute.asserter),
      escapeCSV(dispute.claim),
      escapeCSV(dispute.bond),
      escapeCSV(dispute.disputeBond),
      escapeCSV(dispute.currency),
      escapeCSV(dispute.status),
      escapeCSV(dispute.resolutionResult),
      escapeCSV(dispute.proposedAt),
      escapeCSV(dispute.disputedAt),
      escapeCSV(dispute.settledAt),
      escapeCSV(dispute.txHash),
      escapeCSV(dispute.blockNumber),
    ].join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}

function trendsToCSV(trends: DisputeTrend[]): string {
  const headers = [
    'timestamp',
    'totalDisputes',
    'activeDisputes',
    'resolvedDisputes',
    'disputeRate',
  ];
  const rows = trends.map((trend) =>
    [
      escapeCSV(trend.timestamp),
      escapeCSV(trend.totalDisputes),
      escapeCSV(trend.activeDisputes),
      escapeCSV(trend.resolvedDisputes),
      escapeCSV(trend.disputeRate),
    ].join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}

function generateExcelXML(report: DisputeReport): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Disputes">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">ID</Data></Cell>
        <Cell><Data ss:Type="String">Assertion ID</Data></Cell>
        <Cell><Data ss:Type="String">Protocol</Data></Cell>
        <Cell><Data ss:Type="String">Chain</Data></Cell>
        <Cell><Data ss:Type="String">Disputer</Data></Cell>
        <Cell><Data ss:Type="String">Asserter</Data></Cell>
        <Cell><Data ss:Type="String">Claim</Data></Cell>
        <Cell><Data ss:Type="Number">Bond</Data></Cell>
        <Cell><Data ss:Type="Number">Dispute Bond</Data></Cell>
        <Cell><Data ss:Type="String">Currency</Data></Cell>
        <Cell><Data ss:Type="String">Status</Data></Cell>
        <Cell><Data ss:Type="String">Resolution Result</Data></Cell>
        <Cell><Data ss:Type="String">Proposed At</Data></Cell>
        <Cell><Data ss:Type="String">Disputed At</Data></Cell>
        <Cell><Data ss:Type="String">Settled At</Data></Cell>
        <Cell><Data ss:Type="String">Tx Hash</Data></Cell>
        <Cell><Data ss:Type="Number">Block Number</Data></Cell>
      </Row>
${report.disputes
  .map(
    (dispute) => `      <Row>
        <Cell><Data ss:Type="String">${escapeXML(dispute.id)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(dispute.assertionId)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(dispute.protocol)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(dispute.chain)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(dispute.disputer)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(dispute.asserter)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(dispute.claim)}</Data></Cell>
        <Cell><Data ss:Type="Number">${dispute.bond}</Data></Cell>
        <Cell><Data ss:Type="Number">${dispute.disputeBond}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(dispute.currency)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(dispute.status)}</Data></Cell>
        <Cell><Data ss:Type="String">${dispute.resolutionResult !== undefined ? String(dispute.resolutionResult) : ''}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(dispute.proposedAt)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(dispute.disputedAt)}</Data></Cell>
        <Cell><Data ss:Type="String">${dispute.settledAt ? escapeXML(dispute.settledAt) : ''}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(dispute.txHash)}</Data></Cell>
        <Cell><Data ss:Type="Number">${dispute.blockNumber}</Data></Cell>
      </Row>`,
  )
  .join('\n')}
    </Table>
  </Worksheet>
  <Worksheet ss:Name="Trends">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Timestamp</Data></Cell>
        <Cell><Data ss:Type="Number">Total Disputes</Data></Cell>
        <Cell><Data ss:Type="Number">Active Disputes</Data></Cell>
        <Cell><Data ss:Type="Number">Resolved Disputes</Data></Cell>
        <Cell><Data ss:Type="Number">Dispute Rate</Data></Cell>
      </Row>
${report.trends
  .map(
    (trend) => `      <Row>
        <Cell><Data ss:Type="String">${escapeXML(trend.timestamp)}</Data></Cell>
        <Cell><Data ss:Type="Number">${trend.totalDisputes}</Data></Cell>
        <Cell><Data ss:Type="Number">${trend.activeDisputes}</Data></Cell>
        <Cell><Data ss:Type="Number">${trend.resolvedDisputes}</Data></Cell>
        <Cell><Data ss:Type="Number">${trend.disputeRate}</Data></Cell>
      </Row>`,
  )
  .join('\n')}
    </Table>
  </Worksheet>
  <Worksheet ss:Name="Summary">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Generated At</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(report.generatedAt)}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Period Start</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(report.period.start)}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Period End</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(report.period.end)}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Total Disputes</Data></Cell>
        <Cell><Data ss:Type="Number">${report.summary.totalDisputes}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Active Disputes</Data></Cell>
        <Cell><Data ss:Type="Number">${report.summary.activeDisputes}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Resolved Disputes</Data></Cell>
        <Cell><Data ss:Type="Number">${report.summary.resolvedDisputes}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Total Bonded</Data></Cell>
        <Cell><Data ss:Type="Number">${report.summary.totalBonded}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Dispute Rate</Data></Cell>
        <Cell><Data ss:Type="Number">${report.summary.disputeRate}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Success Rate</Data></Cell>
        <Cell><Data ss:Type="Number">${report.summary.successRate}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Avg Resolution Time Hours</Data></Cell>
        <Cell><Data ss:Type="Number">${report.summary.avgResolutionTimeHours}</Data></Cell>
      </Row>
    </Table>
  </Worksheet>
</Workbook>`;
}

function generateCSV(report: DisputeReport): string {
  const disputesCSV = disputesToCSV(report.disputes);
  const trendsCSV = trendsToCSV(report.trends);

  const summaryCSV = [
    'key,value',
    `generatedAt,${escapeCSV(report.generatedAt)}`,
    `periodStart,${escapeCSV(report.period.start)}`,
    `periodEnd,${escapeCSV(report.period.end)}`,
    `totalDisputes,${report.summary.totalDisputes}`,
    `activeDisputes,${report.summary.activeDisputes}`,
    `resolvedDisputes,${report.summary.resolvedDisputes}`,
    `totalBonded,${report.summary.totalBonded}`,
    `disputeRate,${report.summary.disputeRate}`,
    `successRate,${report.summary.successRate}`,
    `avgResolutionTimeHours,${report.summary.avgResolutionTimeHours}`,
  ].join('\n');

  return [
    '=== SUMMARY ===',
    summaryCSV,
    '',
    '=== DISPUTES ===',
    disputesCSV,
    '',
    '=== TRENDS ===',
    trendsCSV,
  ].join('\n');
}

export function DisputeExportButton({ report, disabled }: DisputeExportButtonProps) {
  const config: ExportConfig<DisputeReport> = useMemo(
    () => ({
      filenamePrefix: 'dispute-report',
      generateCSV,
      generateExcel: generateExcelXML,
    }),
    [],
  );

  return <ExportButton data={report} config={config} disabled={disabled} />;
}
