/**
 * Charts Components Export
 *
 * 图表组件统一导出
 */

// 价格历史图表
export { PriceHistoryChart } from './PriceHistoryChart';
export type {
  SingleAssetDataPoint,
  MultiProtocolDataPoint,
  PriceHistoryChartProps,
} from './PriceHistoryChart';

// 图表组件
export {
  // 图表组件
  EnhancedAreaChart,
  EnhancedLineChart,
  EnhancedBarChart,
  EnhancedPieChart,
  EnhancedRadarChart,
  EnhancedGaugeChart,

  // 辅助组件
  Sparkline,
  StatComparison,
  CustomTooltip,

  // 设计令牌
  CHART_COLORS,
  CHART_DIMENSIONS,
  CHART_ANIMATIONS,
  CHART_TYPOGRAPHY,
  CHART_THRESHOLDS,
  getStatusColor,
  getHealthColor,
  getSeriesColor,
  generateGradientId,
} from './EnhancedChartComponents';

// 类型导出
export type {
  ChartDataPoint,
  ThresholdConfig,
  BaseChartProps,
  EnhancedAreaChartProps,
  EnhancedLineChartProps,
  EnhancedBarChartProps,
  EnhancedPieChartProps,
  EnhancedRadarChartProps,
  EnhancedGaugeChartProps,
  SparklineProps,
  StatComparisonProps,
} from './EnhancedChartComponents';
