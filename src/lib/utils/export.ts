/**
 * Export Utilities - 数据导出工具函数
 *
 * 支持 CSV、JSON、Excel 格式导出
 */

import type {
  RealtimeComparisonItem,
  PriceHeatmapData,
  LatencyAnalysis,
  CostComparison,
} from '@/lib/types/oracle/comparison';

// 使用类型以确保它们不被标记为未使用
export type { PriceHeatmapData, LatencyAnalysis, CostComparison };

// ============================================================================
// CSV 导出
// ============================================================================

function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';

  const firstRow = data[0];
  if (!firstRow) return '';

  const headers = Object.keys(firstRow);
  const csvRows = [];

  // 添加 BOM 以支持中文
  csvRows.push('\uFEFF' + headers.join(','));

  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header];
      // 处理包含逗号或换行符的值
      if (
        typeof value === 'string' &&
        (value.includes(',') || value.includes('\n') || value.includes('"'))
      ) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// 实时对比数据导出
// ============================================================================

export function exportRealtimeToCSV(data: RealtimeComparisonItem[]) {
  const flatData: Record<string, string | number>[] = [];

  data.forEach((item) => {
    item.protocols.forEach((protocol) => {
      flatData.push({
        资产对: item.symbol,
        协议: protocol.protocol,
        价格: protocol.price.toFixed(4),
        '偏离度(%)': (protocol.deviationFromConsensus * 100).toFixed(2),
        '延迟(ms)': protocol.latency.toFixed(0),
        '置信度(%)': (protocol.confidence * 100).toFixed(0),
        状态: protocol.status === 'active' ? '活跃' : protocol.status === 'stale' ? '陈旧' : '错误',
        共识价格: item.consensus.median.toFixed(4),
        '价差(%)': (item.spread.percent * 100).toFixed(2),
        更新时间: new Date(protocol.timestamp).toLocaleString('zh-CN'),
      });
    });
  });

  const csv = convertToCSV(flatData);
  const filename = `oracle-comparison-${new Date().toISOString().split('T')[0]}.csv`;
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
}


