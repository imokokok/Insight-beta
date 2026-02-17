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

import type { DeviationReport, DeviationTrend, PriceDeviationPoint } from '../../types/deviation';

type ExportFormat = 'json' | 'csv' | 'excel';

interface ExportButtonProps {
  report: DeviationReport | null;
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

function trendsToCSV(trends: DeviationTrend[]): string {
  const headers = [
    'symbol',
    'trendDirection',
    'trendStrength',
    'avgDeviation',
    'maxDeviation',
    'volatility',
    'anomalyScore',
    'recommendation',
  ];
  const rows = trends.map((trend) =>
    [
      escapeCSV(trend.symbol),
      escapeCSV(trend.trendDirection),
      escapeCSV(trend.trendStrength),
      escapeCSV(trend.avgDeviation),
      escapeCSV(trend.maxDeviation),
      escapeCSV(trend.volatility),
      escapeCSV(trend.anomalyScore),
      escapeCSV(trend.recommendation),
    ].join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

function anomaliesToCSV(anomalies: PriceDeviationPoint[]): string {
  const headers = [
    'timestamp',
    'symbol',
    'protocols',
    'avgPrice',
    'medianPrice',
    'maxDeviation',
    'maxDeviationPercent',
    'outlierProtocols',
  ];
  const rows = anomalies.map((anomaly) =>
    [
      escapeCSV(anomaly.timestamp),
      escapeCSV(anomaly.symbol),
      escapeCSV(anomaly.protocols.join(';')),
      escapeCSV(anomaly.avgPrice),
      escapeCSV(anomaly.medianPrice),
      escapeCSV(anomaly.maxDeviation),
      escapeCSV(anomaly.maxDeviationPercent),
      escapeCSV(anomaly.outlierProtocols.join(';')),
    ].join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

function generateExcelXML(report: DeviationReport): string {
  const escapeXML = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const trendsSheet = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Trends">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Symbol</Data></Cell>
        <Cell><Data ss:Type="String">Trend Direction</Data></Cell>
        <Cell><Data ss:Type="Number">Trend Strength</Data></Cell>
        <Cell><Data ss:Type="Number">Avg Deviation</Data></Cell>
        <Cell><Data ss:Type="Number">Max Deviation</Data></Cell>
        <Cell><Data ss:Type="Number">Volatility</Data></Cell>
        <Cell><Data ss:Type="Number">Anomaly Score</Data></Cell>
        <Cell><Data ss:Type="String">Recommendation</Data></Cell>
      </Row>
${report.trends
  .map(
    (trend) => `      <Row>
        <Cell><Data ss:Type="String">${escapeXML(trend.symbol)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(trend.trendDirection)}</Data></Cell>
        <Cell><Data ss:Type="Number">${trend.trendStrength}</Data></Cell>
        <Cell><Data ss:Type="Number">${trend.avgDeviation}</Data></Cell>
        <Cell><Data ss:Type="Number">${trend.maxDeviation}</Data></Cell>
        <Cell><Data ss:Type="Number">${trend.volatility}</Data></Cell>
        <Cell><Data ss:Type="Number">${trend.anomalyScore}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(trend.recommendation)}</Data></Cell>
      </Row>`
  )
  .join('\n')}
    </Table>
  </Worksheet>
  <Worksheet ss:Name="Anomalies">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Timestamp</Data></Cell>
        <Cell><Data ss:Type="String">Symbol</Data></Cell>
        <Cell><Data ss:Type="String">Protocols</Data></Cell>
        <Cell><Data ss:Type="Number">Avg Price</Data></Cell>
        <Cell><Data ss:Type="Number">Median Price</Data></Cell>
        <Cell><Data ss:Type="Number">Max Deviation</Data></Cell>
        <Cell><Data ss:Type="Number">Max Deviation %</Data></Cell>
        <Cell><Data ss:Type="String">Outlier Protocols</Data></Cell>
      </Row>
${report.anomalies
  .map(
    (anomaly) => `      <Row>
        <Cell><Data ss:Type="String">${escapeXML(anomaly.timestamp)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(anomaly.symbol)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(anomaly.protocols.join(';'))}</Data></Cell>
        <Cell><Data ss:Type="Number">${anomaly.avgPrice}</Data></Cell>
        <Cell><Data ss:Type="Number">${anomaly.medianPrice}</Data></Cell>
        <Cell><Data ss:Type="Number">${anomaly.maxDeviation}</Data></Cell>
        <Cell><Data ss:Type="Number">${anomaly.maxDeviationPercent}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(anomaly.outlierProtocols.join(';'))}</Data></Cell>
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
        <Cell><Data ss:Type="String">Total Symbols</Data></Cell>
        <Cell><Data ss:Type="Number">${report.summary.totalSymbols}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Symbols With High Deviation</Data></Cell>
        <Cell><Data ss:Type="Number">${report.summary.symbolsWithHighDeviation}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Avg Deviation Across All</Data></Cell>
        <Cell><Data ss:Type="Number">${report.summary.avgDeviationAcrossAll}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Most Volatile Symbol</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(report.summary.mostVolatileSymbol)}</Data></Cell>
      </Row>
    </Table>
  </Worksheet>
</Workbook>`;

  return trendsSheet;
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
            downloadFile(content, `deviation-report-${timestamp}.json`, 'application/json');
            break;
          }
          case 'csv': {
            const trendsCSV = trendsToCSV(report.trends);
            const anomaliesCSV = anomaliesToCSV(report.anomalies);

            const summaryCSV = [
              'key,value',
              `generatedAt,${escapeCSV(report.generatedAt)}`,
              `periodStart,${escapeCSV(report.period.start)}`,
              `periodEnd,${escapeCSV(report.period.end)}`,
              `totalSymbols,${report.summary.totalSymbols}`,
              `symbolsWithHighDeviation,${report.summary.symbolsWithHighDeviation}`,
              `avgDeviationAcrossAll,${report.summary.avgDeviationAcrossAll}`,
              `mostVolatileSymbol,${escapeCSV(report.summary.mostVolatileSymbol)}`,
            ].join('\n');

            const combinedCSV = [
              '=== SUMMARY ===',
              summaryCSV,
              '',
              '=== TRENDS ===',
              trendsCSV,
              '',
              '=== ANOMALIES ===',
              anomaliesCSV,
            ].join('\n');

            downloadFile(combinedCSV, `deviation-report-${timestamp}.csv`, 'text/csv;charset=utf-8');
            break;
          }
          case 'excel': {
            const content = generateExcelXML(report);
            downloadFile(content, `deviation-report-${timestamp}.xls`, 'application/vnd.ms-excel');
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
