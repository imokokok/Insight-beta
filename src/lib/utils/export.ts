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
        基础资产: row.baseAsset,
        计价资产: row.quoteAsset,
        协议: cell.protocol,
        价格: cell.price.toFixed(4),
        参考价格: cell.referencePrice.toFixed(4),
        偏离值: cell.deviation.toFixed(4),
        '偏离度(%)': (cell.deviationPercent * 100).toFixed(2),
        偏离等级:
          cell.deviationLevel === 'low'
            ? '正常'
            : cell.deviationLevel === 'medium'
              ? '轻微'
              : cell.deviationLevel === 'high'
                ? '显著'
                : '严重',
        是否陈旧: cell.isStale ? '是' : '否',
        更新时间: new Date(cell.timestamp).toLocaleString('zh-CN'),
      });
    });
  });

  const csv = convertToCSV(flatData);
  const filename = `oracle-heatmap-${new Date().toISOString().split('T')[0]}.csv`;
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
}

// ============================================================================
// 延迟数据导出
// ============================================================================

export function exportLatencyToCSV(data: LatencyAnalysis) {
  const flatData: Record<string, string | number>[] = data.metrics.map((metric) => ({
    协议: metric.protocol,
    资产对: metric.symbol,
    链: metric.chain,
    '延迟(ms)': metric.latencyMs.toFixed(0),
    '延迟(秒)': metric.latencySeconds.toFixed(2),
    区块滞后: metric.blockLag,
    '更新频率(秒)': metric.updateFrequency.toFixed(0),
    '预期频率(秒)': metric.expectedFrequency,
    '频率偏差(%)': (metric.frequencyDeviation * 100).toFixed(2),
    'P50延迟(ms)': metric.percentile50.toFixed(0),
    'P90延迟(ms)': metric.percentile90.toFixed(0),
    'P99延迟(ms)': metric.percentile99.toFixed(0),
    状态: metric.status === 'healthy' ? '健康' : metric.status === 'degraded' ? '降级' : '陈旧',
    最后更新: new Date(metric.lastUpdateTimestamp).toLocaleString('zh-CN'),
  }));

  // 添加汇总行
  flatData.push({
    协议: '汇总统计',
    资产对: '',
    链: '',
    '延迟(ms)': data.summary.avgLatency.toFixed(0),
    '延迟(秒)': '',
    区块滞后: '',
    '更新频率(秒)': '',
    '预期频率(秒)': '',
    '频率偏差(%)': '',
    'P50延迟(ms)': '',
    'P90延迟(ms)': '',
    'P99延迟(ms)': data.summary.maxLatency.toFixed(0),
    状态: `健康: ${data.summary.healthyFeeds}, 降级: ${data.summary.degradedFeeds}, 陈旧: ${data.summary.staleFeeds}`,
    最后更新: '',
  });

  const csv = convertToCSV(flatData);
  const filename = `oracle-latency-${new Date().toISOString().split('T')[0]}.csv`;
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
}

// ============================================================================
// 成本数据导出
// ============================================================================

export function exportCostToCSV(data: CostComparison) {
  const flatData: Record<string, string | number>[] = data.protocols.map((protocol) => ({
    协议: protocol.protocol,
    成本评分: protocol.costScore.toFixed(0),
    价值评分: protocol.valueScore.toFixed(0),
    喂价数量: protocol.feedsCount,
    支持链数: protocol.chainsCount,
    '平均更新频率(秒)': protocol.avgUpdateFrequency.toFixed(0),
    准确性评分: protocol.accuracyScore.toFixed(1),
    '可用性(%)': protocol.uptimeScore.toFixed(2),
    '每喂价成本($)': protocol.costPerFeed.toFixed(2),
    '每链成本($)': protocol.costPerChain.toFixed(2),
    '每次更新成本($)': protocol.costPerUpdate.toFixed(4),
    ROI: protocol.roi.toFixed(2),
  }));

  // 添加推荐信息
  data.recommendations.forEach((rec) => {
    flatData.push({
      协议: '推荐',
      成本评分:
        rec.useCase === 'defi_protocol'
          ? 'DeFi协议'
          : rec.useCase === 'trading'
            ? '交易应用'
            : rec.useCase === 'enterprise'
              ? '企业应用'
              : '个人/实验',
      价值评分: '',
      喂价数量: rec.recommendedProtocol,
      支持链数: '',
      '平均更新频率(秒)': '',
      准确性评分: '',
      '可用性(%)': '',
      '每喂价成本($)': rec.estimatedMonthlyCost.toFixed(2),
      '每链成本($)': '',
      '每次更新成本($)': '',
      ROI: rec.reason,
    });
  });

  const csv = convertToCSV(flatData);
  const filename = `oracle-cost-${new Date().toISOString().split('T')[0]}.csv`;
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
}

// ============================================================================
// 综合导出
// ============================================================================

export function exportAllToJSON(data: {
  heatmap?: PriceHeatmapData;
  latency?: LatencyAnalysis;
  cost?: CostComparison;
  realtime?: RealtimeComparisonItem[];
}) {
  const exportData = {
    ...data,
    exportedAt: new Date().toISOString(),
    version: '1.0',
  };

  const json = JSON.stringify(exportData, null, 2);
  const filename = `oracle-analysis-${new Date().toISOString().split('T')[0]}.json`;
  downloadFile(json, filename, 'application/json');
}

// ============================================================================
