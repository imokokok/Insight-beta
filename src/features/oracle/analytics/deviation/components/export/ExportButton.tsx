'use client';

import { useMemo } from 'react';

import {
  ExportButton,
  escapeCSV,
  escapeXML,
  type ExportConfig,
} from '@/features/oracle/components/shared';

import type { DeviationReport, DeviationTrend, PriceDeviationPoint } from '../../types/deviation';

interface DeviationExportButtonProps {
  report: DeviationReport | null;
  disabled?: boolean;
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
    ].join(','),
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
    ].join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}

function generateExcelXML(report: DeviationReport): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
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
      </Row>`,
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
}

function generateCSV(report: DeviationReport): string {
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

  return [
    '=== SUMMARY ===',
    summaryCSV,
    '',
    '=== TRENDS ===',
    trendsCSV,
    '',
    '=== ANOMALIES ===',
    anomaliesCSV,
  ].join('\n');
}

export function DeviationExportButton({ report, disabled }: DeviationExportButtonProps) {
  const config: ExportConfig<DeviationReport> = useMemo(
    () => ({
      filenamePrefix: 'deviation-report',
      generateCSV,
      generateExcel: generateExcelXML,
    }),
    [],
  );

  return <ExportButton data={report} config={config} disabled={disabled} />;
}
