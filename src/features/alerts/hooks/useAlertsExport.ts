'use client';

import { useCallback } from 'react';

import type { UnifiedAlert } from '../types';
import type { AlertsData } from './useAlertsData';

export interface UseAlertsExportOptions {
  data: AlertsData | null;
  filteredAlerts?: UnifiedAlert[];
}

export interface UseAlertsExportReturn {
  exportToCSV: () => void;
  exportToJSON: () => void;
}

function convertToCSV(alerts: UnifiedAlert[]): string {
  if (alerts.length === 0) return '';

  const headers = [
    'ID',
    'Title',
    'Description',
    'Severity',
    'Status',
    'Source',
    'Timestamp',
    'Symbol',
    'Chain A',
    'Chain B',
  ];

  const rows = alerts.map((alert) => [
    alert.id,
    `"${alert.title.replace(/"/g, '""')}"`,
    `"${alert.description.replace(/"/g, '""')}"`,
    alert.severity,
    alert.status,
    alert.source,
    alert.timestamp,
    alert.symbol || '',
    alert.chainA || '',
    alert.chainB || '',
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
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

export function useAlertsExport(options: UseAlertsExportOptions): UseAlertsExportReturn {
  const { data, filteredAlerts } = options;

  const exportToJSON = useCallback(() => {
    if (!data) return;

    const content = JSON.stringify(data, null, 2);
    const filename = `alerts-export-${new Date().toISOString()}.json`;
    downloadFile(content, filename, 'application/json');
  }, [data]);

  const exportToCSV = useCallback(() => {
    const alertsToExport = filteredAlerts || data?.alerts || [];
    if (alertsToExport.length === 0) return;

    const content = convertToCSV(alertsToExport);
    const filename = `alerts-export-${new Date().toISOString()}.csv`;
    downloadFile(content, filename, 'text/csv;charset=utf-8;');
  }, [data, filteredAlerts]);

  return {
    exportToCSV,
    exportToJSON,
  };
}
