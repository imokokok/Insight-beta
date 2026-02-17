'use client';

import { useState, useCallback } from 'react';

import { Download, FileJson, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/i18n';

import type { DisputeReport, Dispute, DisputeTrend } from '../../types/disputes';

type ExportFormat = 'json' | 'csv' | 'excel';

interface ExportButtonProps {
  report: DisputeReport | null;
  disabled?: boolean;
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
    ].join(',')
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
    ].join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

function generateExcelXML(report: DisputeReport): string {
  const escapeXML = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const disputesSheet = `<?xml version="1.0" encoding="UTF-8"?>
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
      </Row>`
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
      </Row>`
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

  return disputesSheet;
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportButton({ report, disabled }: ExportButtonProps) {
  const { t } = useI18n();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (!report) return;

      setIsExporting(true);

      try {
        await new Promise((resolve) => setTimeout(resolve, 100));

        const timestamp = new Date().toISOString().split('T')[0];

        switch (format) {
          case 'json': {
            const content = JSON.stringify(report, null, 2);
            downloadFile(content, `dispute-report-${timestamp}.json`, 'application/json');
            break;
          }
          case 'csv': {
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

            const combinedCSV = [
              '=== SUMMARY ===',
              summaryCSV,
              '',
              '=== DISPUTES ===',
              disputesCSV,
              '',
              '=== TRENDS ===',
              trendsCSV,
            ].join('\n');

            downloadFile(combinedCSV, `dispute-report-${timestamp}.csv`, 'text/csv;charset=utf-8');
            break;
          }
          case 'excel': {
            const content = generateExcelXML(report);
            downloadFile(content, `dispute-report-${timestamp}.xls`, 'application/vnd.ms-excel');
            break;
          }
        }
      } finally {
        setIsExporting(false);
      }
    },
    [report]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || !report || isExporting}>
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {isExporting ? t('common.exporting') : t('common.export')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('json')} className="cursor-pointer">
          <FileJson className="mr-2 h-4 w-4" />
          JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('csv')} className="cursor-pointer">
          <FileText className="mr-2 h-4 w-4" />
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('excel')} className="cursor-pointer">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
