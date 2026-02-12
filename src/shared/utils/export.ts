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
} from '@/types/oracle/comparison';

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

// ============================================================================
// 热力图数据导出
// ============================================================================

export function exportHeatmapToCSV(data: PriceHeatmapData) {
  const flatData: Record<string, string | number>[] = [];

  data.rows.forEach((row) => {
    row.cells.forEach((cell) => {
      flatData.push({
        资产对: row.symbol,
        协议: cell.protocol,
        价格: cell.price.toFixed(4),
        参考价格: cell.referencePrice.toFixed(4),
        '偏离度(%)': (cell.deviationPercent * 100).toFixed(2),
        偏离级别: cell.deviationLevel,
        时间戳: cell.timestamp,
      });
    });
  });

  const csv = convertToCSV(flatData);
  const filename = `oracle-heatmap-${new Date().toISOString().split('T')[0]}.csv`;
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
}

// ============================================================================
// 延迟分析数据导出
// ============================================================================

export function exportLatencyToCSV(data: LatencyAnalysis) {
  const flatData: Record<string, string | number>[] = [];

  data.metrics.forEach((metric) => {
    flatData.push({
      协议: metric.protocol,
      资产对: metric.symbol,
      链: metric.chain,
      '延迟(ms)': metric.latencyMs,
      区块延迟: metric.blockLag,
      'P50延迟(ms)': metric.percentile50,
      'P90延迟(ms)': metric.percentile90,
      'P99延迟(ms)': metric.percentile99,
      状态: metric.status,
      时间戳: metric.lastUpdateTimestamp,
    });
  });

  const csv = convertToCSV(flatData);
  const filename = `oracle-latency-${new Date().toISOString().split('T')[0]}.csv`;
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
}

// ============================================================================
// 成本对比数据导出
// ============================================================================

export function exportCostToCSV(data: CostComparison) {
  const flatData: Record<string, string | number>[] = [];

  data.protocols.forEach((metric) => {
    flatData.push({
      协议: metric.protocol,
      成本评分: metric.costScore,
      价值评分: metric.valueScore,
      喂价数量: metric.feedsCount,
      链数量: metric.chainsCount,
      '每次更新成本(USD)': metric.costPerUpdate.toFixed(6),
      '每个喂价成本(USD)': metric.costPerFeed.toFixed(6),
      投资回报率: metric.roi.toFixed(2),
    });
  });

  const csv = convertToCSV(flatData);
  const filename = `oracle-cost-${new Date().toISOString().split('T')[0]}.csv`;
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
}

// ============================================================================
// 全部数据导出为 JSON
// ============================================================================

export function exportAllToJSON(data: {
  realtime?: RealtimeComparisonItem[];
  heatmap?: PriceHeatmapData;
  latency?: LatencyAnalysis;
  cost?: CostComparison;
}) {
  const jsonContent = JSON.stringify(data, null, 2);
  const filename = `oracle-comparison-all-${new Date().toISOString().split('T')[0]}.json`;
  downloadFile(jsonContent, filename, 'application/json;charset=utf-8;');
}
